import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
    throw new Error("Supabase URL is not configured. Please find it in your Supabase project settings (API section) and update constants.ts");
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
    throw new Error("Supabase Anon Key is not configured. This must be the public 'anon' key. Please find it in your Supabase project settings (API section) and update constants.ts");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
