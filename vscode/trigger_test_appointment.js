import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function trigger() {
  console.log('Authenticating as admin...');
  await supabase.auth.signInWithPassword({
    email: 'admin@anadsll.com',
    password: 'admin123'
  });
  console.log('Authenticated.');

  console.log('Inserting test appointment to trigger realtime notification and sound...');
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      client_name: 'Prueba de Sonido',
      client_phone: '809-555-9999',
      service: 'Limpieza Facial Profunda',
      employee: 'Dra. Nadieska Soto',
      date: '2026-06-25',
      time: '11:30',
      duration: 60,
      status: 'pending',
      source: 'web'
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting test appointment:', error.message);
  } else {
    console.log('Successfully inserted test appointment:', data);
    console.log('Wait 5 seconds, then delete the test appointment...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Deleting test appointment...');
    await supabase.from('appointments').delete().eq('id', data.id);
    console.log('Deleted. Check if you heard the sound in your open browser tab!');
  }
}

trigger();
