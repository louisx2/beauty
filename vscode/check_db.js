import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'admin@anadsll.com',
    password: 'admin123'
  });
  const { data: svcs } = await supabase.from('services').select('name').order('name');
  console.log('ALL SERVICES:', svcs.map(s => s.name));
}

check();
