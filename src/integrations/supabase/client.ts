// Hardcoded Supabase configuration for self-hosted Docker deployment
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded Supabase configuration - update these for your own deployment
const SUPABASE_URL = "https://ornymxkppdnjlumijixz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybnlteGtwcGRuamx1bWlqaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzE5NTUsImV4cCI6MjA2NzgwNzk1NX0.g4DDp8-S8R64nhNoowxB9HsPnD7ZftRdpDPvvi6LjRM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});