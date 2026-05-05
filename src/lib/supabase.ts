import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

let supabase;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error('Supabase Initialization Error:', e);
  // Fallback to a dummy client to prevent app crash
  supabase = {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getUser: () => Promise.resolve({ data: { user: null } }) }
  } as any;
}

export { supabase };

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Supabase credentials missing! Please check your Vercel Environment Variables.');
}
