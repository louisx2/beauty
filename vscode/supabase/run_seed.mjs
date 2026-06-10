// run_seed.mjs — ejecuta seed_reset.sql contra Supabase (autenticado)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://lrcbucfaipazjoxtussc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const ADMIN_EMAIL   = 'admin@anadsll.com';
const ADMIN_PASS    = 'admin123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function clearTable(table) {
  const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error(`  ❌ Error clearing ${table}:`, error.message);
  else console.log(`  ✅ Cleared: ${table}`);
}

// ── 1. SERVICES ──
const SERVICES = [
  { id:'11111111-0001-0001-0001-000000000001', name:'Depilación Láser - Zona Pequeña',    category:'laser',    description:'Axilas, bikini, labio superior, mentón',             duration:30,  price:1800, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000002', name:'Depilación Láser - Zona Media',      category:'laser',    description:'Brazos, abdomen, espalda media, glúteos',            duration:45,  price:2500, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000003', name:'Depilación Láser - Zona Grande',     category:'laser',    description:'Piernas completas, espalda completa, pecho',         duration:60,  price:3500, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000004', name:'Depilación Láser - Cuerpo Completo', category:'laser',    description:'Tratamiento completo de todo el cuerpo',             duration:120, price:8000, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000005', name:'Limpieza Facial Básica',             category:'facial',   description:'Limpieza profunda de impurezas y poros',             duration:45,  price:1200, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000006', name:'Limpieza Facial Premium',            category:'facial',   description:'Limpieza + extracción + mascarilla + hidratación',  duration:60,  price:2200, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000007', name:'Rejuvenecimiento Facial',            category:'facial',   description:'Radiofrecuencia y tratamientos anti-edad',           duration:60,  price:3000, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000008', name:'Microneedling',                      category:'facial',   description:'Estimulación de colágeno con micro-agujas',          duration:75,  price:4500, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000009', name:'Peeling Químico',                    category:'facial',   description:'Renovación celular con ácidos especializados',       duration:45,  price:2800, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000010', name:'Hidratación Facial Profunda',        category:'facial',   description:'Hidratación intensiva con suero vitamínico',         duration:45,  price:1500, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000011', name:'Tratamiento Corporal Reductivo',     category:'corporal', description:'Cavitación + radiofrecuencia corporal',              duration:60,  price:2800, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000012', name:'Drenaje Linfático',                  category:'corporal', description:'Masaje de drenaje manual anticelulítico',            duration:60,  price:1800, taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000013', name:'Masaje Relajante',                   category:'corporal', description:'Masaje corporal completo de relajación',             duration:60,  price:1500, taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000014', name:'Tratamiento Anticelulítico',         category:'corporal', description:'Mesoterapia no invasiva + drenaje',                  duration:75,  price:3200, taxable:true, has_session:true,  active:true },
  { id:'11111111-0001-0001-0001-000000000015', name:'Diseño de Cejas',                    category:'belleza',  description:'Depilación y diseño profesional de cejas',           duration:30,  price:600,  taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000016', name:'Extensión de Pestañas',              category:'belleza',  description:'Extensión clásica o volumen ruso',                   duration:90,  price:1800, taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000017', name:'Maquillaje Profesional',             category:'belleza',  description:'Maquillaje para eventos y ocasiones especiales',     duration:60,  price:1500, taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000018', name:'Manicura Semipermanente',            category:'belleza',  description:'Esmalte semipermanente con base y top coat',         duration:60,  price:800,  taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000019', name:'Pedicura Completa',                  category:'belleza',  description:'Cuidado completo de pies con hidratación',           duration:75,  price:900,  taxable:true, has_session:false, active:true },
  { id:'11111111-0001-0001-0001-000000000020', name:'Belleza Integral',                   category:'belleza',  description:'Maquillaje + cejas + extensión de pestañas',         duration:120, price:2800, taxable:true, has_session:false, active:true },
];

// ── 2. STAFF ──
const STAFF = [
  {
    id:'22222222-0001-0001-0001-000000000001', name:'Ana Ortega (Admin)', role:'admin',
    phone:'829-322-4014', email:'admin@anadsll.com', commission_pct:0,
    schedule:'Lun-Vie 8am-6pm',
    working_days:['lunes','martes','miercoles','jueves','viernes'],
    working_start:'08:00', working_end:'18:00', service_ids:[], active:true,
  },
  {
    id:'22222222-0001-0001-0001-000000000002', name:'Luisa Méndez (Recepción)', role:'receptionist',
    phone:'829-100-2002', email:'recepcion@anadsll.com', commission_pct:0,
    schedule:'Lun-Sáb 8am-4pm',
    working_days:['lunes','martes','miercoles','jueves','viernes','sabado'],
    working_start:'08:00', working_end:'16:00', service_ids:[], active:true,
  },
  {
    id:'22222222-0001-0001-0001-000000000003', name:'Dra. Nadieska Soto', role:'specialist',
    phone:'829-555-3003', email:'nadieska@anadsll.com', commission_pct:15,
    schedule:'Lun-Vie 8am-6pm',
    working_days:['lunes','martes','miercoles','jueves','viernes'],
    working_start:'08:00', working_end:'18:00',
    service_ids:[
      '11111111-0001-0001-0001-000000000001','11111111-0001-0001-0001-000000000002',
      '11111111-0001-0001-0001-000000000003','11111111-0001-0001-0001-000000000004',
      '11111111-0001-0001-0001-000000000005','11111111-0001-0001-0001-000000000006',
      '11111111-0001-0001-0001-000000000007','11111111-0001-0001-0001-000000000008',
      '11111111-0001-0001-0001-000000000009','11111111-0001-0001-0001-000000000010',
    ], active:true,
  },
  {
    id:'22222222-0001-0001-0001-000000000004', name:'Carmen Rodríguez', role:'specialist',
    phone:'829-555-4004', email:'carmen@anadsll.com', commission_pct:12,
    schedule:'Lun-Sáb 9am-5pm',
    working_days:['lunes','martes','miercoles','jueves','viernes','sabado'],
    working_start:'09:00', working_end:'17:00',
    service_ids:[
      '11111111-0001-0001-0001-000000000011','11111111-0001-0001-0001-000000000012',
      '11111111-0001-0001-0001-000000000013','11111111-0001-0001-0001-000000000014',
      '11111111-0001-0001-0001-000000000005','11111111-0001-0001-0001-000000000006',
    ], active:true,
  },
  {
    id:'22222222-0001-0001-0001-000000000005', name:'Paola Jiménez', role:'specialist',
    phone:'829-555-5005', email:'paola@anadsll.com', commission_pct:10,
    schedule:'Mar-Sáb 9am-6pm',
    working_days:['martes','miercoles','jueves','viernes','sabado'],
    working_start:'09:00', working_end:'18:00',
    service_ids:[
      '11111111-0001-0001-0001-000000000015','11111111-0001-0001-0001-000000000016',
      '11111111-0001-0001-0001-000000000017','11111111-0001-0001-0001-000000000018',
      '11111111-0001-0001-0001-000000000019','11111111-0001-0001-0001-000000000020',
    ], active:true,
  },
];

// ── 3. CLIENTES ──
const CLIENTS = [
  { id:'33333333-0001-0001-0001-000000000001', name:'María García',       phone:'829-555-0001', email:'maria@gmail.com',    cedula:'001-1234567-8', skin_type:'Mixta',    allergies:'Ninguna',             notes:'Clienta frecuente - Láser piernas', source:'whatsapp' },
  { id:'33333333-0001-0001-0001-000000000002', name:'Laura Sánchez',      phone:'829-555-0002', email:'laura@gmail.com',    cedula:'001-2345678-9', skin_type:'Sensible', allergies:'Retinol',             notes:'Sensible a productos ácidos',       source:'landing'  },
  { id:'33333333-0001-0001-0001-000000000003', name:'Carolina Pérez',     phone:'829-555-0003', email:null,                 cedula:'001-3456789-0', skin_type:'Normal',   allergies:'Ninguna',             notes:'Primera vez',                       source:'whatsapp' },
  { id:'33333333-0001-0001-0001-000000000004', name:'Sofía Martínez',     phone:'829-555-0004', email:'sofia@gmail.com',    cedula:null,            skin_type:'Seca',     allergies:'Ácido glicólico',     notes:'',                                  source:'manual'   },
  { id:'33333333-0001-0001-0001-000000000005', name:'Ana López',          phone:'829-555-0005', email:null,                 cedula:null,            skin_type:'Grasa',    allergies:'Retinol, Vitamina C', notes:'Alergia confirmada al retinol',     source:'landing'  },
  { id:'33333333-0001-0001-0001-000000000006', name:'Diana Reyes',        phone:'829-555-0006', email:'diana@gmail.com',    cedula:'001-6789012-3', skin_type:'Mixta',    allergies:'Ninguna',             notes:'Tratamiento corporal en curso',     source:'whatsapp' },
  { id:'33333333-0001-0001-0001-000000000007', name:'Valentina Cruz',     phone:'829-555-0007', email:null,                 cedula:null,            skin_type:'Normal',   allergies:'Ninguna',             notes:'',                                  source:'manual'   },
  { id:'33333333-0001-0001-0001-000000000008', name:'Isabella Fernández', phone:'829-555-0008', email:'isabella@gmail.com', cedula:'001-8901234-5', skin_type:'Sensible', allergies:'Fragancias',          notes:'',                                  source:'whatsapp' },
  { id:'33333333-0001-0001-0001-000000000009', name:'Camila Rodríguez',   phone:'829-555-0009', email:'camila@gmail.com',   cedula:null,            skin_type:'Mixta',    allergies:'Ninguna',             notes:'Le gusta el facial premium',        source:'landing'  },
  { id:'33333333-0001-0001-0001-000000000010', name:'Paola Torres',       phone:'829-555-0010', email:null,                 cedula:'001-1122334-5', skin_type:'Grasa',    allergies:'Ninguna',             notes:'',                                  source:'manual'   },
];

function today() {
  return new Date().toISOString().split('T')[0];
}
function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
function yesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

const APPOINTMENTS = [
  // Dra. Nadieska — HOY
  { client_name:'María García',       client_phone:'829-555-0001', service:'Depilación Láser - Zona Pequeña',    employee:'Dra. Nadieska Soto', date:today(),      time:'08:00', duration:30,  status:'confirmed',  notes:'Sesión 3 de 5 - axilas',       source:'whatsapp' },
  { client_name:'Laura Sánchez',      client_phone:'829-555-0002', service:'Limpieza Facial Básica',             employee:'Dra. Nadieska Soto', date:today(),      time:'09:00', duration:45,  status:'confirmed',  notes:'Evitar retinol',               source:'landing'  },
  { client_name:'Carolina Pérez',     client_phone:'829-555-0003', service:'Depilación Láser - Zona Media',      employee:'Dra. Nadieska Soto', date:today(),      time:'10:30', duration:45,  status:'pending',    notes:'Primera vez con láser',        source:'whatsapp' },
  { client_name:'Sofía Martínez',     client_phone:'829-555-0004', service:'Rejuvenecimiento Facial',            employee:'Dra. Nadieska Soto', date:today(),      time:'12:00', duration:60,  status:'confirmed',  notes:'',                             source:'manual'   },
  { client_name:'Ana López',          client_phone:'829-555-0005', service:'Peeling Químico',                    employee:'Dra. Nadieska Soto', date:today(),      time:'14:00', duration:45,  status:'confirmed',  notes:'NO retinol 2 sem antes',       source:'landing'  },
  { client_name:'Diana Reyes',        client_phone:'829-555-0006', service:'Microneedling',                      employee:'Dra. Nadieska Soto', date:today(),      time:'15:30', duration:75,  status:'pending',    notes:'',                             source:'web'      },
  // Carmen — HOY
  { client_name:'Valentina Cruz',     client_phone:'829-555-0007', service:'Tratamiento Corporal Reductivo',     employee:'Carmen Rodríguez',   date:today(),      time:'09:00', duration:60,  status:'confirmed',  notes:'Sesión 2 de 8',                source:'whatsapp' },
  { client_name:'Isabella Fernández', client_phone:'829-555-0008', service:'Drenaje Linfático',                  employee:'Carmen Rodríguez',   date:today(),      time:'10:30', duration:60,  status:'confirmed',  notes:'',                             source:'whatsapp' },
  { client_name:'Camila Rodríguez',   client_phone:'829-555-0009', service:'Masaje Relajante',                   employee:'Carmen Rodríguez',   date:today(),      time:'12:00', duration:60,  status:'pending',    notes:'Música suave',                 source:'web'      },
  { client_name:'Paola Torres',       client_phone:'829-555-0010', service:'Tratamiento Anticelulítico',         employee:'Carmen Rodríguez',   date:today(),      time:'14:00', duration:75,  status:'confirmed',  notes:'Sesión 1 de 6',                source:'landing'  },
  { client_name:'María García',       client_phone:'829-555-0001', service:'Drenaje Linfático',                  employee:'Carmen Rodríguez',   date:today(),      time:'16:00', duration:60,  status:'confirmed',  notes:'Post-sesión de láser',         source:'manual'   },
  // Paola — HOY
  { client_name:'Laura Sánchez',      client_phone:'829-555-0002', service:'Diseño de Cejas',                    employee:'Paola Jiménez',      date:today(),      time:'09:00', duration:30,  status:'confirmed',  notes:'',                             source:'whatsapp' },
  { client_name:'Sofía Martínez',     client_phone:'829-555-0004', service:'Extensión de Pestañas',              employee:'Paola Jiménez',      date:today(),      time:'10:00', duration:90,  status:'confirmed',  notes:'Volumen ruso',                 source:'whatsapp' },
  { client_name:'Carolina Pérez',     client_phone:'829-555-0003', service:'Manicura Semipermanente',            employee:'Paola Jiménez',      date:today(),      time:'12:00', duration:60,  status:'pending',    notes:'Color nude',                   source:'web'      },
  { client_name:'Diana Reyes',        client_phone:'829-555-0006', service:'Maquillaje Profesional',             employee:'Paola Jiménez',      date:today(),      time:'14:00', duration:60,  status:'confirmed',  notes:'Boda - maquillaje duradero',   source:'manual'   },
  { client_name:'Camila Rodríguez',   client_phone:'829-555-0009', service:'Pedicura Completa',                  employee:'Paola Jiménez',      date:today(),      time:'16:00', duration:75,  status:'pending',    notes:'',                             source:'landing'  },
  // MAÑANA
  { client_name:'Isabella Fernández', client_phone:'829-555-0008', service:'Limpieza Facial Premium',            employee:'Dra. Nadieska Soto', date:tomorrow(),   time:'09:00', duration:60,  status:'confirmed',  notes:'',                             source:'whatsapp' },
  { client_name:'Valentina Cruz',     client_phone:'829-555-0007', service:'Depilación Láser - Zona Grande',     employee:'Dra. Nadieska Soto', date:tomorrow(),   time:'11:00', duration:60,  status:'pending',    notes:'Sesión 4 de 5',                source:'landing'  },
  { client_name:'Paola Torres',       client_phone:'829-555-0010', service:'Tratamiento Corporal Reductivo',     employee:'Carmen Rodríguez',   date:tomorrow(),   time:'10:00', duration:60,  status:'confirmed',  notes:'Sesión 3 de 8',                source:'whatsapp' },
  { client_name:'María García',       client_phone:'829-555-0001', service:'Belleza Integral',                   employee:'Paola Jiménez',      date:tomorrow(),   time:'11:00', duration:120, status:'confirmed',  notes:'Evento importante',            source:'manual'   },
  // AYER (historial)
  { client_name:'Laura Sánchez',      client_phone:'829-555-0002', service:'Limpieza Facial Básica',             employee:'Dra. Nadieska Soto', date:yesterday(),  time:'10:00', duration:45,  status:'completed',  notes:'',                             source:'landing'  },
  { client_name:'Ana López',          client_phone:'829-555-0005', service:'Hidratación Facial Profunda',        employee:'Dra. Nadieska Soto', date:yesterday(),  time:'11:30', duration:45,  status:'completed',  notes:'',                             source:'manual'   },
  { client_name:'Camila Rodríguez',   client_phone:'829-555-0009', service:'Drenaje Linfático',                  employee:'Carmen Rodríguez',   date:yesterday(),  time:'09:00', duration:60,  status:'completed',  notes:'',                             source:'whatsapp' },
  { client_name:'Isabella Fernández', client_phone:'829-555-0008', service:'Diseño de Cejas',                    employee:'Paola Jiménez',      date:yesterday(),  time:'10:00', duration:30,  status:'completed',  notes:'',                             source:'whatsapp' },
  { client_name:'Valentina Cruz',     client_phone:'829-555-0007', service:'Manicura Semipermanente',            employee:'Paola Jiménez',      date:yesterday(),  time:'11:00', duration:60,  status:'no_show',    notes:'No se presentó sin avisar',    source:'manual'   },
];

const PRODUCTS = [
  { name:'Protector Solar SPF 50',    category:'Cuidado Solar',     purchase_price:450, sale_price:950,  stock:24, min_stock:5,  unit:'unidad', active:true },
  { name:'Crema Hidratante Facial',   category:'Cuidado Facial',    purchase_price:380, sale_price:850,  stock:18, min_stock:5,  unit:'unidad', active:true },
  { name:'Sérum Vitamina C',          category:'Cuidado Facial',    purchase_price:520, sale_price:1200, stock:12, min_stock:3,  unit:'unidad', active:true },
  { name:'Gel Post-Láser',            category:'Post-Tratamiento',  purchase_price:280, sale_price:650,  stock:30, min_stock:10, unit:'unidad', active:true },
  { name:'Mascarilla Hidratante',     category:'Cuidado Facial',    purchase_price:200, sale_price:450,  stock:15, min_stock:5,  unit:'unidad', active:true },
  { name:'Aceite Corporal Reductivo', category:'Cuidado Corporal',  purchase_price:350, sale_price:780,  stock:8,  min_stock:3,  unit:'unidad', active:true },
  { name:'Exfoliante Corporal',       category:'Cuidado Corporal',  purchase_price:310, sale_price:700,  stock:10, min_stock:3,  unit:'unidad', active:true },
  { name:'Crema Anti-Age',            category:'Cuidado Facial',    purchase_price:680, sale_price:1500, stock:6,  min_stock:3,  unit:'unidad', active:true },
  { name:'Gel de Aloe Vera',          category:'Post-Tratamiento',  purchase_price:150, sale_price:350,  stock:3,  min_stock:5,  unit:'unidad', active:true },
  { name:'Tónico Facial',             category:'Cuidado Facial',    purchase_price:250, sale_price:580,  stock:14, min_stock:5,  unit:'unidad', active:true },
  { name:'Sérum Retinol Noche',       category:'Cuidado Facial',    purchase_price:490, sale_price:1100, stock:9,  min_stock:3,  unit:'unidad', active:true },
  { name:'Crema Contorno de Ojos',    category:'Cuidado Facial',    purchase_price:420, sale_price:980,  stock:7,  min_stock:3,  unit:'unidad', active:true },
];

async function main() {
  console.log('\n🚀 Iniciando reset de datos de prueba...\n');

  // ── Login como admin para pasar RLS ──
  console.log('🔐 Autenticando...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  if (authErr || !authData.session) {
    console.error('  ❌ Login fallido:', authErr?.message);
    process.exit(1);
  }
  console.log('  ✅ Autenticado como', ADMIN_EMAIL);

  // ── Clear all tables in order (respecting FK) ──
  console.log('🗑️  Limpiando tablas...');
  await clearTable('invoice_items');
  await clearTable('invoices');
  await clearTable('client_packages');
  await clearTable('session_packages');
  await clearTable('appointments');
  await clearTable('clients');
  await clearTable('products');
  await clearTable('staff');
  await clearTable('services');

  // NCF sequences
  const { error: ncfErr } = await supabase.from('ncf_sequences').delete().neq('type', 'NONE');
  if (ncfErr) console.error('  ❌ ncf_sequences:', ncfErr.message);
  else console.log('  ✅ Cleared: ncf_sequences');

  // business_settings
  const { error: bsErr } = await supabase.from('business_settings').delete().neq('key', 'NONE');
  if (bsErr) console.error('  ❌ business_settings:', bsErr.message);
  else console.log('  ✅ Cleared: business_settings');

  console.log('\n📦 Insertando servicios...');
  const { error: svcErr } = await supabase.from('services').insert(SERVICES);
  if (svcErr) console.error('  ❌ services:', svcErr.message);
  else console.log(`  ✅ ${SERVICES.length} servicios insertados`);

  console.log('\n👥 Insertando staff...');
  const { error: staffErr } = await supabase.from('staff').insert(STAFF);
  if (staffErr) console.error('  ❌ staff:', staffErr.message);
  else console.log(`  ✅ ${STAFF.length} miembros insertados (2 no-citas + 3 especialistas)`);

  console.log('\n👩 Insertando clientes...');
  const { error: clientErr } = await supabase.from('clients').insert(CLIENTS);
  if (clientErr) console.error('  ❌ clients:', clientErr.message);
  else console.log(`  ✅ ${CLIENTS.length} clientes insertados`);

  console.log('\n📅 Insertando citas...');
  const { error: apptErr } = await supabase.from('appointments').insert(APPOINTMENTS);
  if (apptErr) console.error('  ❌ appointments:', apptErr.message);
  else console.log(`  ✅ ${APPOINTMENTS.length} citas insertadas (16 hoy, 4 mañana, 5 ayer)`);

  console.log('\n🛍️  Insertando productos...');
  const { error: prodErr } = await supabase.from('products').insert(PRODUCTS);
  if (prodErr) console.error('  ❌ products:', prodErr.message);
  else console.log(`  ✅ ${PRODUCTS.length} productos insertados`);

  console.log('\n🔢 Insertando secuencias NCF...');
  const { error: ncfInsErr } = await supabase.from('ncf_sequences').upsert([
    { type:'B01', prefix:'B01', current_number:1, range_start:1, range_end:500 },
    { type:'B02', prefix:'B02', current_number:1, range_start:1, range_end:500 },
    { type:'B04', prefix:'B04', current_number:1, range_start:1, range_end:200 },
    { type:'B14', prefix:'B14', current_number:1, range_start:1, range_end:100 },
    { type:'B15', prefix:'B15', current_number:1, range_start:1, range_end:100 },
  ], { onConflict:'type' });
  if (ncfInsErr) console.error('  ❌ ncf_sequences:', ncfInsErr.message);
  else console.log('  ✅ Secuencias NCF');

  console.log('\n⚙️  Insertando configuración...');
  const { error: bsInsErr } = await supabase.from('business_settings').upsert([
    { key:'business_name',    value:'Anadsll Beauty Esthetic' },
    { key:'rnc',              value:'' },
    { key:'address',          value:'C/Altagracia #65, Pueblo Abajo' },
    { key:'phone',            value:'829-322-4014' },
    { key:'email',            value:'info@anadsll.com' },
    { key:'instagram',        value:'@anadsllbeautyesthetic.rd' },
    { key:'schedule_mon_fri', value:'8:00 AM - 6:00 PM' },
    { key:'schedule_saturday',value:'8:00 AM - 2:00 PM' },
    { key:'schedule_sunday',  value:'Cerrado' },
  ], { onConflict:'key' });
  if (bsInsErr) console.error('  ❌ business_settings:', bsInsErr.message);
  else console.log('  ✅ Business settings');

  // Settings table (deposit, bank, etc)
  try {
    const { error: settErr } = await supabase.from('settings').upsert({
      id:1, deposit_amount:500, bank_name:'Banco Popular',
      account_number:'123456789012', account_name:'Anadsll Beauty Esthetic',
      whatsapp_number:'18293224014',
    }, { onConflict:'id' });
    if (settErr) console.error('  ⚠️  settings table:', settErr.message, '(puede no existir aún)');
    else console.log('  ✅ Payment settings');
  } catch(e) {
    console.log('  ⚠️  settings table no disponible, usando defaults del frontend');
  }

  console.log('\n✅ ¡Reset completo!\n');
  console.log('📊 RESUMEN:');
  console.log('   • 20 servicios (4 categorías: láser, facial, corporal, belleza)');
  console.log('   • 5 staff: 1 admin + 1 recepción + 3 especialistas');
  console.log('   • 10 clientes');
  console.log('   • 25 citas (16 hoy, 4 mañana, 5 ayer)');
  console.log('   • 12 productos en inventario');
  console.log('   • 🔒 auth.users NO modificado\n');
}

main().catch(console.error);
