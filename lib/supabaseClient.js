// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tazcblgsuhosggebggrh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhemNibGdzdWhvc2dnZWJnZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzA0MzUsImV4cCI6MjA3NzU0NjQzNX0.0IbG2Kk_iCBVKS4HPK3s6HWII6-8KIpGT52k6PZS5ec';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);