import { createClient } from "npm:@supabase/supabase-js@2.28.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseServiceKey) {
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
            return new Response(JSON.stringify({ error: userError?.message || 'Unauthorized: Invalid token' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            });
        }

        const userMetadata = user.user_metadata || {};
        if (userMetadata.user_group !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403
            });
        }

        const { error } = await supabase
            .from('awards')
            .update({ active: false })
            .neq('active', false); // Only update rows that are not already inactive

        if (error) throw error;

        return new Response(JSON.stringify({ message: "All awards deactivated successfully." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});