import { createClient } from "npm:@supabase/supabase-js@2.28.0";
// Added a declaration for the Deno global object to fix type errors.
declare const Deno: any;

// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("get-award-results function script started");

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

    // Check for user to protect endpoint, even though it's not strictly used in the query logic
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


    const url = new URL(req.url)
    const awardId = url.searchParams.get('award_id')
    if (!awardId) {
      return new Response(JSON.stringify({ error: 'award_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data, error } = await supabase.rpc('get_award_results', {
      p_award_id: awardId,
    })

    if (error) throw error;

    return new Response(JSON.stringify(data || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Error in get-award-results:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})