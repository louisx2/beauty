import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase insert...');
  
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: 'Test Client',
      phone: '829-111-2222',
      email: 'test@example.com'
    })
    .select()
    .single();

  if (error) {
    console.error('ERROR inserting client:', JSON.stringify(error, null, 2));
  } else {
    console.log('SUCCESS inserting client:', data);
    
    // Cleanup
    await supabase.from('clients').delete().eq('id', data.id);
  }
}

test();
