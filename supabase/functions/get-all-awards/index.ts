import { createClient } from "npm:@supabase/supabase-js@2.28.0";

// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

console.log("get-all-awards function script started");

Deno.serve(async (req) => {
    // Handle preflight OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // --- Supabase client initialization and Auth ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Supabase environment variables are not set.");
            return new Response(JSON.stringify({ error: "Server configuration error." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

        if (userError || !user) {
            console.error("Supabase auth error:", userError?.message);
            return new Response(JSON.stringify({ error: userError?.message || 'Unauthorized: Invalid token' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            });
        }

        // --- Admin-only access check ---
        const userMetadata = user.user_metadata || {};
        if (userMetadata.user_group !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403
            });
        }

        // --- Fetch all awards, ignoring the 'active' status ---
        const { data: allAwards, error } = await supabase
            .from('awards')
            .select('*')
            .order('order', { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify(allAwards || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error("Error in get-all-awards:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});