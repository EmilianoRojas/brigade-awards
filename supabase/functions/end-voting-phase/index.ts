import { createClient } from "npm:@supabase/supabase-js@2.28.0";

// Added a declaration for the Deno global object to fix type errors.
declare const Deno: any;

// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log("end-voting-phase function script started");

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

        // Get the user from the JWT
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

        // --- Admin Check ---
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('user_group')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            console.error("Error fetching user profile:", profileError?.message);
            return new Response(JSON.stringify({ error: 'Could not verify user role.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        if (userProfile.user_group !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }
        // --- End of Admin Check ---

        const { award_id } = await req.json();

        if (!award_id) {
            return new Response(JSON.stringify({ error: 'Missing award_id in request body.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const { data, error } = await supabase
            .from('awards')
            .update({ phase: 'RESULTS' })
            .eq('id', award_id)
            .eq('phase', 'FINAL_VOTING')
            .select();

        if (error) {
            console.error("Error updating award phase:", error.message);
            throw error;
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Error in end-voting-phase:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})