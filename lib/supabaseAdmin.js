// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const adminUrl = 'https://tazcblgsuhosggebggrh.supabase.co';
const adminKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhemNibGdzdWhvc2dnZWJnZ3JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk3MDQzNSwiZXhwIjoyMDc3NTQ2NDM1fQ.21-pDkUeoCpz2L5IjmYW6U__kiMaxSTqCdRktziVnO8'; // Your full service role key

export const supabaseAdmin = createClient(adminUrl, adminKey);