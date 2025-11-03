import { createClient } from "npm:@supabase/supabase-js@2.28.0";

// Added a declaration for the Deno global object to fix type errors.
declare const Deno: any;

// Inlined from _shared/cors.ts for easy dashboard deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- START: Comprehensive Eligibility Logic ---

interface SimpleCriteria {
  groups?: string[];
  genders?: string[];
  is_partnered?: boolean;
  notGroups?: string[];
}

interface ComplexCriteria extends SimpleCriteria {
  anyOf?: SimpleCriteria[];
}

interface Award {
  id: string;
  phase: 'NOMINATION' | 'FINAL_VOTING' | 'RESULTS' | 'CLOSED';
  nomination_criteria: ComplexCriteria | null;
  voting_criteria: ComplexCriteria | null;
  // other award properties...
}

interface UserMetadata {
  user_group?: string;
  gender?: 'hombre' | 'mujer';
  is_partnered?: boolean;
}

/**
 * Checks if a user meets a set of simple criteria.
 * @param criteria The simple criteria object.
 * @param user The user's metadata.
 * @returns True if all defined criteria are met.
 */
const checkSimpleEligibility = (criteria: SimpleCriteria, user: UserMetadata): boolean => {
  if (!criteria) return true;

  const checks: boolean[] = [];

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

  return checks.every(result => result === true);
};

/**
 * Checks if a user is eligible based on complex criteria, including 'anyOf'.
 * @param criteria The full criteria object for an award phase.
 * @param user The user's metadata from the JWT.
 * @returns True if the user is eligible.
 */
const checkEligibility = (criteria: ComplexCriteria | null, user: UserMetadata): boolean => {
  if (!criteria) return true;

  // Handle complex 'anyOf' rule. If it exists, it's the only rule that matters for this check.
  if (criteria.anyOf && Array.isArray(criteria.anyOf)) {
    return criteria.anyOf.some(condition => checkSimpleEligibility(condition, user));
  }

  // If no 'anyOf', just check the simple criteria at the top level.
  return checkSimpleEligibility(criteria, user);
};

// --- END: Comprehensive Eligibility Logic ---


console.log("get-awards function script started");

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

    // When using service_role, the client should be initialized with the service key,
    // not the user's auth header. The user's JWT is then passed to getUser.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
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

    const userMetadata: UserMetadata = user.user_metadata || {};

    const { data: allAwards, error } = await supabase
      .from('awards')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    let filteredAwards = allAwards || [];

    // If the user is not an admin, apply the comprehensive filtering rules.
    if (userMetadata.user_group !== 'admin') {
      filteredAwards = (allAwards || []).filter((award: Award) => {
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Error in get-awards:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})