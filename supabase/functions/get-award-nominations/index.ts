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

console.log("get-award-nominations function script started");

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

        const { data, error } = await supabase
            .from('nominations')
            .select(`
              award:awards!inner(name),
              nominee:users!nominee_user_id(*),
              nominator:users!nominator_id(full_name)
            `)
            .eq('award_id', awardId);

        if (error) throw error;

        // Define the structure for our accumulator
        interface NominationResult {
            id: string;
            full_name: string;
            avatar_url: string;
            nomination_count: number;
            nominators: Set<string>;
        }

        interface Accumulator {
            [key: string]: NominationResult;
        }

        // Process the data to match the desired output format
        const nominations = (data || []).reduce((acc: Accumulator, nomination: any) => {
            const nominee = nomination.nominee;
            if (!nominee) return acc;

            const nomineeId = nominee.id;
            if (!acc[nomineeId]) {
                acc[nomineeId] = {
                    ...nominee,
                    nomination_count: 0,
                    nominators: new Set<string>(),
                };
            }

            acc[nomineeId].nomination_count++;
            if (nomination.nominator && nomination.nominator.full_name) {
                acc[nomineeId].nominators.add(nomination.nominator.full_name);
            }

            return acc;
        }, {} as Accumulator);

        const result = Object.values(nominations).map((nom: NominationResult) => ({
            ...nom,
            nominators: Array.from(nom.nominators).join(', '),
        })).sort((a, b) => b.nomination_count - a.nomination_count);


        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Error in get-award-nominations:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})