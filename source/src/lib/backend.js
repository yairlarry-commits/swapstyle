// Picks the data backend:
//  - Supabase, when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (.env)
//  - otherwise a local demo backend that keeps everything in the browser (localStorage)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const DEMO_MODE = !(SUPABASE_URL && SUPABASE_ANON_KEY && createClient);

export const supabase = DEMO_MODE
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
