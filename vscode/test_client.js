import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertClient() {
  await supabase.auth.signInWithPassword({ email: 'admin@anadsll.com', password: 'password123' }).then(res => {
    if(res.error) return supabase.auth.signInWithPassword({ email: 'admin@anadsll.com', password: 'admin123' });
  });

  const { error, data } = await supabase.from('clients').insert({
    name: 'Test Client',
    phone: '1234567890',
    email: '',
    cedula: '',
    skin_type: '',
    allergies: '',
    notes: '',
    source: 'manual'
  }).select();
  
  console.log("Client Insert Error:", error);
  console.log("Data:", data);
}

testInsertClient();
