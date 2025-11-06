import { createClient } from "npm:@supabase/supabase-js@2.28.0";

// Added a declaration for the Deno global object to fix type errors.
declare const Deno: any;

// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("submit-nominations function script started");

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


    const { award_id, nominee_ids } = await req.json();
    if (!award_id || !nominee_ids) {
      return new Response(JSON.stringify({ error: 'award_id and nominee_ids are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- Special handling for 'Premio Rasca y Pica (Duo)' ---
    const { data: award, error: awardError } = await supabase
      .from('awards')
      .select('nomination_criteria')
      .eq('id', award_id)
      .single();

    if (awardError) {
      console.error("Error fetching award:", awardError.message);
      return new Response(JSON.stringify({ error: "Error fetching award details." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (award && award.nomination_criteria?.is_duo) {
      // This is the special duo award, handle it differently.
      // Expect nominee_ids to be an array of pairs, e.g., [['uuid1', 'uuid2'], ['uuid3', 'uuid4']]
      if (!Array.isArray(nominee_ids) || nominee_ids.some(pair => !Array.isArray(pair) || pair.length !== 2)) {
        return new Response(JSON.stringify({ error: 'For this award, nominees must be in pairs.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Start a transaction
      // --- New logic to prevent duplicate submissions ---
      const { data: existingNominations, error: fetchError } = await supabase
        .from('nominations')
        .select('nominee_user_id, nomination_group_id')
        .eq('nominator_id', user.id)
        .eq('award_id', award_id);

      if (fetchError) {
        console.error("Error fetching existing nominations:", fetchError.message);
        throw new Error("Failed to fetch existing nominations.");
      }

      const existingPairs = Object.values(
        existingNominations.reduce((acc, nom) => {
          if (!acc[nom.nomination_group_id]) {
            acc[nom.nomination_group_id] = [];
          }
          acc[nom.nomination_group_id].push(nom.nominee_user_id);
          return acc;
        }, {} as Record<string, string[]>)
      ).map((pair: string[]) => pair.sort());

      const submittedPairs = nominee_ids.map(pair => [...pair].sort());

      const areNominationsSame =
        existingPairs.length === submittedPairs.length &&
        existingPairs.every(existingPair =>
          submittedPairs.some(submittedPair =>
            existingPair[0] === submittedPair[0] && existingPair[1] === submittedPair[1]
          )
        );

      if (areNominationsSame) {
        // If nominations are the same, do nothing and return success
        return new Response(null, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 204,
        });
      }

      // --- End of new logic ---

      const { error: deleteError } = await supabase
        .from('nominations')
        .delete()
        .eq('nominator_id', user.id)
        .eq('award_id', award_id);

      if (deleteError) {
        console.error("Error deleting old nominations:", deleteError.message);
        throw new Error("Failed to delete old nominations.");
      }

      if (nominee_ids.length > 0) {
        const nominationsToInsert = nominee_ids.flatMap(pair => {
          const groupId = crypto.randomUUID();
          return pair.map(nomineeId => ({
            nominator_id: user.id,
            award_id: award_id,
            nominee_user_id: nomineeId,
            nomination_group_id: groupId,
          }));
        });

        const { error: insertError } = await supabase
          .from('nominations')
          .insert(nominationsToInsert);

        if (insertError) {
          console.error("Error inserting new nominations:", insertError.message);
          throw new Error("Failed to insert new nominations.");
        }
      }
    } else {
      // --- Default nomination logic for all other awards ---
      const { error } = await supabase.rpc('submit_user_nominations', {
        p_award_id: award_id,
        p_user_id: user.id,
        p_nominee_ids: nominee_ids
      });

      if (error) throw error;
    }

    return new Response(null, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 204, // No Content
    })

  } catch (error) {
    console.error("Error in submit-nominations:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})