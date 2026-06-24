import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrcbucfaipazjoxtussc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyY2J1Y2ZhaXBhempveHR1c3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDI0MTUsImV4cCI6MjA5MTgxODQxNX0.YE_Yar90FX2-_84l5fWTc9FTol5zyl7xXvgigj0M_JQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('--- STARTING SEED PROCESS ---');

  console.log('Authenticating as admin...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@anadsll.com',
    password: 'admin123'
  });
  if (authErr) {
    console.error('Authentication failed:', authErr.message);
    return;
  }
  console.log('Successfully authenticated as admin.');

  console.log('Cleaning up old test data...');
  await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('client_packages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('session_packages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleanup completed.');

  // 1. Check/Seed NCF Sequences
  const { data: ncfCheck } = await supabase.from('ncf_sequences').select('id');
  if (!ncfCheck || ncfCheck.length === 0) {
    console.log('Seeding NCF sequences...');
    const { error } = await supabase.from('ncf_sequences').insert([
      { type: 'consumo', prefix: 'B02', current_number: 1, range_start: 1, range_end: 100000 },
      { type: 'credito_fiscal', prefix: 'B01', current_number: 1, range_start: 1, range_end: 10000 }
    ]);
    if (error) console.error('Error seeding NCF:', error.message);
  } else {
    console.log(`NCF Sequences already present (${ncfCheck.length} rows).`);
  }

  // 2. Fetch staff & services for linking
  const { data: staffList, error: staffErr } = await supabase.from('staff').select('id, name');
  const { data: serviceList, error: serviceErr } = await supabase.from('services').select('id, name, price');
  if (staffErr || serviceErr || !staffList || !serviceList) {
    console.error('Error fetching staff/services:', staffErr?.message || serviceErr?.message);
    return;
  }
  console.log(`Loaded ${staffList.length} staff members and ${serviceList.length} services.`);

  // 3. Seed Clients
  console.log('Seeding clients...');
  const clientsData = [
    { name: 'María Altagracia Gómez', phone: '809-555-0101', email: 'maria.gomez@gmail.com', source: 'manual', notes: 'Clienta frecuente' },
    { name: 'Laura Estefanía Pérez', phone: '829-555-0102', email: 'laura.perez@yahoo.com', source: 'manual', skin_type: 'Grasa', allergies: 'Ninguna' },
    { name: 'Sofía Alejandra Rodríguez', phone: '849-555-0103', email: 'sofia.rod@gmail.com', source: 'web', skin_type: 'Mixta' },
    { name: 'Ana Carolina Sánchez', phone: '809-555-0104', email: 'ana.sanchez@hotmail.com', source: 'manual' },
    { name: 'Carmen Victoria Martinez', phone: '829-555-0105', email: 'carmen.martinez@gmail.com', source: 'web', allergies: 'Ácido salicílico' },
    { name: 'Patricia Isabel Rosario', phone: '849-555-0106', email: 'patricia.rosario@outlook.com', source: 'manual' },
    { name: 'Daniela Beatriz Espinal', phone: '809-555-0107', email: 'daniela.espinal@gmail.com', source: 'web', skin_type: 'Seca' },
    { name: 'Gabriela María Núñez', phone: '829-555-0108', email: 'gabriela.nunez@gmail.com', source: 'manual' }
  ];
  
  const { data: insertedClients, error: clientsErr } = await supabase
    .from('clients')
    .insert(clientsData)
    .select();

  if (clientsErr || !insertedClients) {
    console.error('Error seeding clients:', clientsErr?.message);
    return;
  }
  console.log(`Successfully seeded ${insertedClients.length} clients.`);

  // 4. Seed Products
  console.log('Seeding products...');
  const productsData = [
    { name: 'Protector Solar FPS 50+', category: 'Cuidado Facial', purchase_price: 800, sale_price: 1500, stock: 25, min_stock: 5, unit: 'unidad', active: true },
    { name: 'Serum Vitamina C', category: 'Cuidado Facial', purchase_price: 1200, sale_price: 2200, stock: 15, min_stock: 3, unit: 'unidad', active: true },
    { name: 'Crema Hidratante Facial', category: 'Cuidado Facial', purchase_price: 600, sale_price: 1200, stock: 20, min_stock: 5, unit: 'unidad', active: true },
    { name: 'Jabón Limpiador Espumoso', category: 'Cuidado Facial', purchase_price: 400, sale_price: 900, stock: 30, min_stock: 8, unit: 'unidad', active: true },
    { name: 'Tónico Hidratante de Rosas', category: 'Cuidado Facial', purchase_price: 350, sale_price: 750, stock: 12, min_stock: 4, unit: 'unidad', active: true },
    { name: 'Mascarilla Arcilla Purificante', category: 'Cuidado Facial', purchase_price: 300, sale_price: 650, stock: 8, min_stock: 3, unit: 'unidad', active: true },
    { name: 'Exfoliante de Café y Coco', category: 'Corporal', purchase_price: 250, sale_price: 550, stock: 4, min_stock: 5, unit: 'unidad', active: true },
    { name: 'Aceite de Argán Orgánico', category: 'Capilar', purchase_price: 500, sale_price: 1100, stock: 2, min_stock: 3, unit: 'unidad', active: true }
  ];

  const { data: insertedProducts, error: productsErr } = await supabase
    .from('products')
    .insert(productsData)
    .select();
  
  if (productsErr) {
    console.error('Error seeding products:', productsErr.message);
  } else {
    console.log(`Successfully seeded ${insertedProducts.length} products.`);
  }

  // 5. Seed Session Packages
  console.log('Seeding session packages...');
  // Find some services for packages
  const facialProfunda = serviceList.find(s => s.name.includes('Facial Profunda')) || serviceList[0];
  const peeling = serviceList.find(s => s.name.includes('Peeling')) || serviceList[1];
  const micro = serviceList.find(s => s.name.includes('Microdermoabrasión') || s.name.includes('Limpieza')) || serviceList[2];

  const packagesData = [
    { service_id: facialProfunda.id, name: 'Paquete Facial Profunda x5', sessions: 5, price: 6000, active: true },
    { service_id: peeling.id, name: 'Paquete Peeling Químico x3', sessions: 3, price: 7500, active: true },
    { service_id: micro.id, name: 'Paquete Microdermoabrasión x6', sessions: 6, price: 9000, active: true }
  ];

  const { data: insertedPackages, error: packagesErr } = await supabase
    .from('session_packages')
    .insert(packagesData)
    .select();

  if (packagesErr || !insertedPackages) {
    console.error('Error seeding session packages:', packagesErr?.message);
    return;
  }
  console.log(`Successfully seeded ${insertedPackages.length} session packages.`);

  // 6. Seed Client Packages
  console.log('Seeding client packages...');
  // Assign packages to some clients
  const clientPackagesData = [
    {
      client_id: insertedClients[0].id,
      package_id: insertedPackages[0].id,
      total_sessions: insertedPackages[0].sessions,
      used_sessions: 2,
      notes: 'Ha asistido a 2 sesiones',
      total_price: insertedPackages[0].price,
      amount_paid: 6000,
      status: 'active'
    },
    {
      client_id: insertedClients[1].id,
      package_id: insertedPackages[1].id,
      total_sessions: insertedPackages[1].sessions,
      used_sessions: 0,
      notes: 'Pagó abono inicial de $4,000',
      total_price: insertedPackages[1].price,
      amount_paid: 4000,
      status: 'active'
    },
    {
      client_id: insertedClients[2].id,
      package_id: insertedPackages[2].id,
      total_sessions: insertedPackages[2].sessions,
      used_sessions: 6,
      notes: 'Paquete completado',
      total_price: insertedPackages[2].price,
      amount_paid: 9000,
      status: 'completed'
    }
  ];

  const { data: insertedClientPkgs, error: clientPkgsErr } = await supabase
    .from('client_packages')
    .insert(clientPackagesData)
    .select();

  if (clientPkgsErr || !insertedClientPkgs) {
    console.error('Error seeding client packages:', clientPkgsErr?.message);
  } else {
    console.log(`Successfully seeded ${insertedClientPkgs.length} client packages.`);
    
    // Seed a payment for the partial payment package
    console.log('Seeding payments...');
    const paymentData = [
      {
        client_id: insertedClients[1].id,
        package_id: insertedClientPkgs[1].id,
        amount: 4000,
        payment_method: 'card',
        notes: 'Abono inicial del paquete',
        created_by: 'Luisa Méndez'
      }
    ];
    const { error: payErr } = await supabase.from('payments').insert(paymentData);
    if (payErr) console.error('Error seeding payment:', payErr.message);
  }

  // 7. Seed Appointments
  console.log('Seeding appointments...');
  const today = new Date();
  const getOffsetDate = (days) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const appointmentsData = [
    {
      client_id: insertedClients[0].id,
      client_name: insertedClients[0].name,
      client_phone: insertedClients[0].phone,
      service: 'Limpieza Facial Profunda',
      employee: 'Dra. Nadieska Soto',
      date: getOffsetDate(-2), // 2 days ago
      time: '10:00',
      duration: 60,
      status: 'completed',
      notes: 'Completada con éxito',
      source: 'manual'
    },
    {
      client_id: insertedClients[1].id,
      client_name: insertedClients[1].name,
      client_phone: insertedClients[1].phone,
      service: 'Peeling Químico',
      employee: 'Dra. Nadieska Soto',
      date: getOffsetDate(-1), // 1 day ago
      time: '14:30',
      duration: 45,
      status: 'no_show',
      notes: 'No asistió ni avisó',
      source: 'web'
    },
    {
      client_id: insertedClients[2].id,
      client_name: insertedClients[2].name,
      client_phone: insertedClients[2].phone,
      service: 'Microdermabrasión / Fototerapia',
      employee: 'Carmen Rodríguez',
      date: getOffsetDate(0), // Today
      time: '09:00',
      duration: 60,
      status: 'in_progress',
      notes: 'Sesión 1 del paquete',
      source: 'manual'
    },
    {
      client_id: insertedClients[3].id,
      client_name: insertedClients[3].name,
      client_phone: insertedClients[3].phone,
      service: 'Limpieza + Electroporación',
      employee: 'Dra. Nadieska Soto',
      date: getOffsetDate(0), // Today
      time: '11:00',
      duration: 75,
      status: 'pending',
      notes: 'Confirmado por WhatsApp',
      source: 'web'
    },
    {
      client_id: insertedClients[4].id,
      client_name: insertedClients[4].name,
      client_phone: insertedClients[4].phone,
      service: 'Masaje Relajante',
      employee: 'Paola Jiménez',
      date: getOffsetDate(1), // Tomorrow
      time: '15:00',
      duration: 60,
      status: 'pending',
      notes: '',
      source: 'manual'
    },
    {
      client_id: insertedClients[5].id,
      client_name: insertedClients[5].name,
      client_phone: insertedClients[5].phone,
      service: 'Limpieza Facial Acné / Rosácea / Envejecimiento',
      employee: 'Dra. Nadieska Soto',
      date: getOffsetDate(2), // In 2 days
      time: '16:30',
      duration: 60,
      status: 'pending',
      notes: 'Piel sensible con rosácea activa',
      source: 'web'
    }
  ];

  const { data: insertedAppts, error: apptsErr } = await supabase
    .from('appointments')
    .insert(appointmentsData)
    .select();

  if (apptsErr) {
    console.error('Error seeding appointments:', apptsErr.message);
  } else {
    console.log(`Successfully seeded ${insertedAppts.length} appointments.`);
  }

  // 8. Seed Invoices (Sales History for Dashboard Charts)
  console.log('Seeding invoices & invoice items...');
  // We will create invoices over the last 30 days
  const invoicesData = [];
  const invoiceItemsData = [];

  const methods = ['cash', 'card', 'transfer'];
  const ncfTypes = ['B02', 'B02', 'B01'];

  for (let i = 0; i < 20; i++) {
    // Generate dates spread across the last 30 days
    const invoiceDate = new Date();
    invoiceDate.setDate(today.getDate() - Math.floor(Math.random() * 30));
    
    const client = insertedClients[Math.floor(Math.random() * insertedClients.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const ncfType = ncfTypes[Math.floor(Math.random() * ncfTypes.length)];
    const ncf = `${ncfType}010000${String(100 + i).padStart(3, '0')}`;

    // Select random services and products
    const service = serviceList[Math.floor(Math.random() * serviceList.length)];
    // Ensure service price is not 0 (let's fallback to typical prices if 0)
    const sPrice = service.price > 0 ? service.price : [1500, 2000, 2500, 3000][Math.floor(Math.random() * 4)];
    
    const subtotal = sPrice;
    const itbis = Math.round(subtotal * 0.18 * 100) / 100;
    const total = subtotal + itbis;

    const invoiceId = crypto.randomUUID ? crypto.randomUUID() : `f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f000${String(i).padStart(2, '0')}`;

    invoicesData.push({
      id: invoiceId,
      client_id: client.id,
      client_name: client.name,
      client_cedula: client.id === insertedClients[0].id ? '001-0000000-1' : null,
      ncf,
      ncf_type: ncfType,
      subtotal,
      total_itbis: itbis,
      total,
      payment_method: method,
      status: 'paid',
      created_at: invoiceDate.toISOString()
    });

    invoiceItemsData.push({
      invoice_id: invoiceId,
      description: service.name,
      quantity: 1,
      unit_price: sPrice,
      taxable: true,
      itbis,
      total
    });
  }

  const { error: invErr } = await supabase.from('invoices').insert(invoicesData);
  if (invErr) {
    console.error('Error seeding invoices:', invErr.message);
  } else {
    console.log(`Successfully seeded ${invoicesData.length} invoices.`);
    const { error: itemsErr } = await supabase.from('invoice_items').insert(invoiceItemsData);
    if (itemsErr) console.error('Error seeding invoice items:', itemsErr.message);
  }

  // 9. Seed Business Settings & general settings
  const { data: settingsCheck } = await supabase.from('settings').select('id');
  if (!settingsCheck || settingsCheck.length === 0) {
    console.log('Seeding settings...');
    const { error: settingsErr } = await supabase.from('settings').insert([
      {
        deposit_amount: 500,
        bank_name: 'Banco Popular Dominicano',
        account_number: '123456789',
        account_name: 'Anadsll Beauty Esthetic SRL',
        whatsapp_number: '18295551234'
      }
    ]);
    if (settingsErr) console.error('Error seeding settings:', settingsErr.message);
  }

  console.log('--- SEED PROCESS COMPLETED SUCCESSFULLY ---');
}

seed();
