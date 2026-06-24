import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Authenticating...');
  await supabase.auth.signInWithPassword({
    email: 'admin@anadsll.com',
    password: 'admin123'
  });
  console.log('Authenticated.');

  console.log('Fetching active services...');
  const { data: services, error: svcErr } = await supabase
    .from('services')
    .select('id, name, category')
    .eq('active', true);
  
  if (svcErr || !services) {
    console.error('Error fetching services:', svcErr?.message);
    return;
  }
  console.log(`Loaded ${services.length} active services.`);

  // Group service IDs by category
  const servicesByCategory = {};
  services.forEach(s => {
    if (!servicesByCategory[s.category]) {
      servicesByCategory[s.category] = [];
    }
    servicesByCategory[s.category].push(s.id);
  });

  // Fetch staff
  const { data: staff, error: staffErr } = await supabase
    .from('staff')
    .select('id, name, role');
  
  if (staffErr || !staff) {
    console.error('Error fetching staff:', staffErr?.message);
    return;
  }

  // Define categories per specialist
  const assignments = {
    'Dra. Nadieska Soto': ['medicina', 'facial'],
    'Carmen Rodríguez': ['facial', 'laser', 'corporal'],
    'Paola Jiménez': ['laser', 'corporal', 'belleza']
  };

  for (const s of staff) {
    const assignedCats = assignments[s.name];
    if (assignedCats) {
      // Gather all service IDs for assigned categories
      let ids = [];
      assignedCats.forEach(cat => {
        const catIds = servicesByCategory[cat] || [];
        ids = [...ids, ...catIds];
      });

      console.log(`Updating ${s.name} (${s.role}). Categories: [${assignedCats.join(', ')}]. Total services: ${ids.length}`);

      const { error: updateErr } = await supabase
        .from('staff')
        .update({ service_ids: ids })
        .eq('id', s.id);

      if (updateErr) {
        console.error(`Error updating ${s.name}:`, updateErr.message);
      } else {
        console.log(`Successfully updated ${s.name}.`);
      }
    }
  }

  console.log('--- DATABASE SERVICE MAP FIX COMPLETED ---');
}

fix();
