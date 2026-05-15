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
  await supabase.auth.signInWithPassword({ email: 'admin@anadsll.com', password: 'admin123' });

  // First insert
  await supabase.from('clients').insert({
    name: 'Dup Client', phone: '9999999999'
  });
  
  // Second insert
  const { error, data } = await supabase.from('clients').insert({
    name: 'Dup Client 2', phone: '9999999999'
  });
  
  console.log("Duplicate Insert Error:", error);
}

testInsertClient();
