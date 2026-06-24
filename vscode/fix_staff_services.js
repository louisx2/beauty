import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Authenticating as admin...');
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@anadsll.com',
    password: 'admin123'
  });
  if (authErr) {
    console.error('Auth error:', authErr.message);
    return;
  }
  console.log('Authenticated successfully.');

  console.log('Fetching staff members...');
  const { data: staff, error: staffErr } = await supabase.from('staff').select('*');
  if (staffErr || !staff) {
    console.error('Error fetching staff:', staffErr?.message);
    return;
  }

  console.log(`Found ${staff.length} staff members.`);
  for (const s of staff) {
    if (s.service_ids && s.service_ids.length > 0) {
      const fixedIds = s.service_ids.map(id => {
        if (id.startsWith('11111111-0001-0001-0001-')) {
          return id.replace('11111111-0001-0001-0001-', '22222222-0002-0002-0002-');
        }
        return id;
      });

      console.log(`Updating ${s.name} service_ids...`);
      console.log(`Original:`, s.service_ids);
      console.log(`Fixed:   `, fixedIds);

      const { error: updateErr } = await supabase
        .from('staff')
        .update({ service_ids: fixedIds })
        .eq('id', s.id);

      if (updateErr) {
        console.error(`Error updating ${s.name}:`, updateErr.message);
      } else {
        console.log(`Successfully updated ${s.name}.`);
      }
    }
  }

  console.log('--- DATABASE DATA FIX COMPLETED ---');
}

fix();
