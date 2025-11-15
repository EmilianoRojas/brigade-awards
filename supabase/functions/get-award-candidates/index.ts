import { createClient } from "npm:@supabase/supabase-js@2.28.0";

// FIX: Added a declaration for the Deno global object to fix type errors.
// This informs the TypeScript compiler that `Deno` exists, resolving issues
// with `Deno.serve` and `Deno.env` not being found during static analysis.
declare const Deno: any;

// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("get-award-candidates function script started");

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Robust Supabase client initialization and Auth ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Create a client with the service role key to validate JWTs
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract JWT from the header
    const jwt = authHeader.replace('Bearer ', '');

    // Get user session from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError) {
      console.error("Supabase auth error:", userError.message);
      return new Response(JSON.stringify({ error: userError.message || 'Unauthorized: Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    // --- End of Auth ---


    // Extract award_id from the request URL.
    const url = new URL(req.url)
    const awardId = url.searchParams.get('award_id')
    if (!awardId) {
      return new Response(JSON.stringify({ error: 'award_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch the award to check its current phase and nomination criteria.
    const { data: award, error: awardError } = await supabase
      .from('awards')
      .select('phase, nomination_criteria')
      .eq('id', awardId)
      .single()

    if (awardError) throw awardError;
    if (!award) {
      return new Response(JSON.stringify({ error: 'Award not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    let candidates = [];

    // --- Phase-specific Logic ---

    if (award.phase === 'NOMINATION') {
      // Build a dynamic query based on the award's nomination_criteria JSON.
      let query = supabase.from('users').select('*');
      const criteria = award.nomination_criteria;

      if (criteria) {
        // Simple filters
        if (criteria.groups) query = query.in('user_group', criteria.groups);
        if (criteria.genders) query = query.in('gender', criteria.genders);
        if (typeof criteria.is_partnered === 'boolean') query = query.eq('is_partnered', criteria.is_partnered);
        if (criteria.notGroups) query = query.not('user_group', 'in', `(${criteria.notGroups.map(g => `'${g}'`).join(',')})`);

        // Complex 'anyOf' filter using .or()
        if (criteria.anyOf && Array.isArray(criteria.anyOf)) {
          const orConditions = criteria.anyOf.map(condition => {
            const conditions = [];
            if (condition.groups) conditions.push(`user_group.in.(${condition.groups.join(',')})`);
            if (condition.genders) conditions.push(`gender.in.(${condition.genders.join(',')})`);
            return conditions.join(',');
          }).filter(c => c).join(',');

          if (orConditions) {
            query = query.or(orConditions);
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map results to add the default avatar_url and alias partner_user_id to partner_id for frontend consistency.
      candidates = (data || []).map(user => {
        const { partner_user_id, ...rest } = user;
        return {
          ...rest,
          partner_id: partner_user_id,
          avatar_url: user.avatar_url || `https://picsum.photos/seed/${user.id}/200`
        };
      });

    } else if (award.phase === 'FINAL_VOTING') {
      // For final voting, we call the efficient RPC function.
      const { data, error } = await supabase.rpc('get_finalists_for_award', {
        p_award_id: awardId,
      })

      if (error) throw error;
      const allFinalists = data || [];

      // Special case for 'Miss Award' to include all 8 girls.
      if (awardId === '73152573-554e-4204-a98e-0db82b8a2e93') {
        candidates = allFinalists.slice(0, 8); // Return all 8 finalists
      } else {
        if (awardId === '30610b13-f60b-4a91-8532-73fbc430f99d') {
          candidates = allFinalists; // Return all 8 finalists
        } else {
          candidates = allFinalists.slice(0, 4); // Default behavior for other awards
        }
      }

      // For RESULTS or CLOSED phases, an empty array is returned by default, which is correct.

      return new Response(JSON.stringify(candidates), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } catch (error) {
      console.error("Error in get-award-candidates:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  })