import { createClient } from "npm:@supabase/supabase-js@2.28.0";
// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
/**
 * Checks if a user meets a set of simple criteria.
 * @param criteria The simple criteria object.
 * @param user The user's metadata.
 * @returns True if all defined criteria are met.
 */ const checkSimpleEligibility = (criteria, user) => {
  if (!criteria) return true;
  const checks = [];
  if (criteria.groups) {
    checks.push(user.user_group ? criteria.groups.includes(user.user_group) : false);
  }
  if (criteria.genders) {
    checks.push(user.gender ? criteria.genders.includes(user.gender) : false);
  }
  if (typeof criteria.is_partnered === 'boolean') {
    checks.push(!!user.is_partnered === criteria.is_partnered);
  }
  if (criteria.notGroups) {
    // If user has no group, they cannot be in a disallowed group, so this passes.
    checks.push(user.user_group ? !criteria.notGroups.includes(user.user_group) : true);
  }
  return checks.every((result) => result === true);
};
/**
 * Checks if a user is eligible based on complex criteria, including 'anyOf'.
 * @param criteria The full criteria object for an award phase.
 * @param user The user's metadata from the JWT.
 * @returns True if the user is eligible.
 */ const checkEligibility = (criteria, user) => {
  if (!criteria) return true;
  // Handle complex 'anyOf' rule. If it exists, it's the only rule that matters for this check.
  if (criteria.anyOf && Array.isArray(criteria.anyOf)) {
    return criteria.anyOf.some((condition) => checkSimpleEligibility(condition, user));
  }
  // If no 'anyOf', just check the simple criteria at the top level.
  return checkSimpleEligibility(criteria, user);
};
// --- END: Comprehensive Eligibility Logic ---
console.log("get-awards function script started");
Deno.serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // --- Robust Supabase client initialization and Auth ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.");
      return new Response(JSON.stringify({
        error: "Server configuration error."
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Unauthorized: Missing Authorization header'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    // When using service_role, the client should be initialized with the service key,
    // not the user's auth header. The user's JWT is then passed to getUser.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError) {
      console.error("Supabase auth error:", userError.message);
      return new Response(JSON.stringify({
        error: userError.message || 'Unauthorized: Invalid token'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized: Invalid token'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    // --- End of Auth ---
    const userMetadata = user.user_metadata || {};
    const userId = user.id;
    // Fetch user's nominations and votes to enrich the award data
    const {
      data: nominations,
      error: nominationsError
    } = await supabase.from('nominations').select('award_id').eq('nominator_id', userId);
    if (nominationsError) throw nominationsError;
    const {
      data: votes,
      error: votesError
    } = await supabase.from('final_votes').select('award_id').eq('voter_id', userId);
    if (votesError) throw votesError;
    const nominatedAwardIds = new Set((nominations || []).map(n => n.award_id));
    const votedAwardIds = new Set((votes || []).map(v => v.award_id));
    const {
      data: allAwards,
      error
    } = await supabase.from('awards').select('*').eq('active', true).order('order', {
      ascending: true
    });
    if (error) throw error;
    const enrichedAwards = (allAwards || []).map(award => ({
      ...award,
      has_nominated: nominatedAwardIds.has(award.id),
      has_voted: votedAwardIds.has(award.id)
    }));
    let filteredAwards = enrichedAwards;
    // If the user is not an admin, apply the comprehensive filtering rules.
    if (userMetadata.user_group !== 'admin') {
      filteredAwards = enrichedAwards.filter(award => {
        // Hide awards that are finished or closed for non-admins.
        if (award.phase === 'RESULTS' || award.phase === 'CLOSED') {
          return false;
        }
        // A user should see an award if they can either nominate OR vote in it.
        const canNominate = checkEligibility(award.nomination_criteria, userMetadata);
        const canVote = checkEligibility(award.voting_criteria, userMetadata);
        return canNominate || canVote;
      });
    }
    return new Response(JSON.stringify(filteredAwards), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("Error in get-awards:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
