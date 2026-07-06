import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Probando llamada RPC list_staff_logins...');
  const { data, error } = await supabase.rpc('list_staff_logins');
  if (error) {
    console.log('RESULTADO_DETALLE:');
    console.log('ERROR_MESSAGE:', error.message);
    console.log('ERROR_CODE:', error.code);
  } else {
    console.log('RESULTADO_DETALLE:');
    console.log('EXITO:', data);
  }
}

check();
