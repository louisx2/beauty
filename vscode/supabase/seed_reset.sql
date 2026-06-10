-- ═══════════════════════════════════════════════════════════════════════
--  Anadsll Beauty Esthetic — RESET + SEED (datos de prueba)
--  ⚠️  NO toca auth.users ni configuración de login
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. LIMPIAR DATOS (excepto auth.users) ──────────────────────────────
TRUNCATE TABLE
  invoice_items,
  invoices,
  client_packages,
  session_packages,
  appointments,
  clients,
  products,
  staff,
  services,
  ncf_sequences
  CASCADE;

-- También limpiamos y volvemos a insertar settings
DELETE FROM business_settings;
DELETE FROM settings WHERE id = 1;

-- ── 2. SERVICIOS ──────────────────────────────────────────────────────
INSERT INTO services (id, name, category, description, duration, price, taxable, has_session, active) VALUES

  -- LÁSER
  ('11111111-0001-0001-0001-000000000001', 'Depilación Láser - Zona Pequeña',   'laser', 'Axilas, bikini, labio superior, mentón', 30, 1800.00, true, true, true),
  ('11111111-0001-0001-0001-000000000002', 'Depilación Láser - Zona Media',     'laser', 'Brazos, abdomen, espalda media, glúteos', 45, 2500.00, true, true, true),
  ('11111111-0001-0001-0001-000000000003', 'Depilación Láser - Zona Grande',    'laser', 'Piernas completas, espalda completa, pecho', 60, 3500.00, true, true, true),
  ('11111111-0001-0001-0001-000000000004', 'Depilación Láser - Cuerpo Completo','laser', 'Tratamiento completo de todo el cuerpo', 120, 8000.00, true, true, true),

  -- FACIAL
  ('11111111-0001-0001-0001-000000000005', 'Limpieza Facial Básica',            'facial', 'Limpieza profunda de impurezas y poros', 45, 1200.00, true, true, true),
  ('11111111-0001-0001-0001-000000000006', 'Limpieza Facial Premium',           'facial', 'Limpieza + extracción + mascarilla + hidratación', 60, 2200.00, true, true, true),
  ('11111111-0001-0001-0001-000000000007', 'Rejuvenecimiento Facial',           'facial', 'Radiofrecuencia y tratamientos anti-edad', 60, 3000.00, true, true, true),
  ('11111111-0001-0001-0001-000000000008', 'Microneedling',                     'facial', 'Estimulación de colágeno con micro-agujas', 75, 4500.00, true, true, true),
  ('11111111-0001-0001-0001-000000000009', 'Peeling Químico',                   'facial', 'Renovación celular con ácidos especializados', 45, 2800.00, true, true, true),
  ('11111111-0001-0001-0001-000000000010', 'Hidratación Facial Profunda',       'facial', 'Hidratación intensiva con suero vitamínico', 45, 1500.00, true, true, true),

  -- CORPORAL
  ('11111111-0001-0001-0001-000000000011', 'Tratamiento Corporal Reductivo',    'corporal', 'Cavitación + radiofrecuencia corporal', 60, 2800.00, true, true, true),
  ('11111111-0001-0001-0001-000000000012', 'Drenaje Linfático',                 'corporal', 'Masaje de drenaje manual anticelulítico', 60, 1800.00, true, false, true),
  ('11111111-0001-0001-0001-000000000013', 'Masaje Relajante',                  'corporal', 'Masaje corporal completo de relajación', 60, 1500.00, true, false, true),
  ('11111111-0001-0001-0001-000000000014', 'Tratamiento Anticelulítico',        'corporal', 'Mesoterapia no invasiva + drenaje', 75, 3200.00, true, true, true),

  -- BELLEZA
  ('11111111-0001-0001-0001-000000000015', 'Diseño de Cejas',                   'belleza', 'Depilación y diseño profesional de cejas', 30, 600.00, true, false, true),
  ('11111111-0001-0001-0001-000000000016', 'Extensión de Pestañas',             'belleza', 'Extensión clásica o volumen ruso', 90, 1800.00, true, false, true),
  ('11111111-0001-0001-0001-000000000017', 'Maquillaje Profesional',            'belleza', 'Maquillaje para eventos y ocasiones especiales', 60, 1500.00, true, false, true),
  ('11111111-0001-0001-0001-000000000018', 'Manicura Semipermanente',           'belleza', 'Esmalte semipermanente con base y top coat', 60, 800.00, true, false, true),
  ('11111111-0001-0001-0001-000000000019', 'Pedicura Completa',                 'belleza', 'Cuidado completo de pies con hidratación', 75, 900.00, true, false, true),
  ('11111111-0001-0001-0001-000000000020', 'Belleza Integral',                  'belleza', 'Maquillaje + cejas + extensión de pestañas', 120, 2800.00, true, false, true);

-- ── 3. PAQUETES DE SESIONES ────────────────────────────────────────────
INSERT INTO session_packages (service_id, name, sessions, price, active) VALUES
  ('11111111-0001-0001-0001-000000000001', 'Láser Pequeña x3',     3,  4500.00, true),
  ('11111111-0001-0001-0001-000000000001', 'Láser Pequeña x5',     5,  7000.00, true),
  ('11111111-0001-0001-0001-000000000001', 'Láser Pequeña x8',     8, 10500.00, true),
  ('11111111-0001-0001-0001-000000000002', 'Láser Media x3',       3,  6500.00, true),
  ('11111111-0001-0001-0001-000000000002', 'Láser Media x5',       5, 10000.00, true),
  ('11111111-0001-0001-0001-000000000003', 'Láser Grande x3',      3,  9000.00, true),
  ('11111111-0001-0001-0001-000000000003', 'Láser Grande x5',      5, 14000.00, true),
  ('11111111-0001-0001-0001-000000000004', 'Cuerpo Completo x3',   3, 20000.00, true),
  ('11111111-0001-0001-0001-000000000005', 'Facial Básica x4',     4,  4200.00, true),
  ('11111111-0001-0001-0001-000000000006', 'Facial Premium x4',    4,  7500.00, true),
  ('11111111-0001-0001-0001-000000000007', 'Rejuvenecimiento x6',  6, 15000.00, true),
  ('11111111-0001-0001-0001-000000000008', 'Microneedling x4',     4, 15000.00, true),
  ('11111111-0001-0001-0001-000000000011', 'Reductivo x8',         8, 18000.00, true),
  ('11111111-0001-0001-0001-000000000014', 'Anticelulítico x6',    6, 16000.00, true);

-- ── 4. STAFF ──────────────────────────────────────────────────────────
-- Especialistas (role = 'specialist') → aparecen en el formulario de citas
-- Admin / Recepción (role = 'admin' / 'receptionist') → NO aparecen en citas
INSERT INTO staff (id, name, role, phone, email, commission_pct, schedule,
                   working_days, working_start, working_end, service_ids, active)
VALUES

  -- ── ADMINISTRADORA (NO aparece en citas) ──
  ('22222222-0001-0001-0001-000000000001',
   'Ana Ortega (Admin)', 'admin',
   '829-322-4014', 'admin@anadsll.com',
   0, 'Lun-Vie 8am-6pm',
   ARRAY['lunes','martes','miercoles','jueves','viernes'],
   '08:00', '18:00',
   ARRAY[]::uuid[], true),

  -- ── RECEPCIONISTA (NO aparece en citas) ──
  ('22222222-0001-0001-0001-000000000002',
   'Luisa Méndez (Recepción)', 'receptionist',
   '829-100-2002', 'recepcion@anadsll.com',
   0, 'Lun-Sáb 8am-4pm',
   ARRAY['lunes','martes','miercoles','jueves','viernes','sabado'],
   '08:00', '16:00',
   ARRAY[]::uuid[], true),

  -- ── ESPECIALISTA 1: Láser + Facial ──
  ('22222222-0001-0001-0001-000000000003',
   'Dra. Nadieska Soto', 'specialist',
   '829-555-3003', 'nadieska@anadsll.com',
   15, 'Lun-Vie 8am-6pm',
   ARRAY['lunes','martes','miercoles','jueves','viernes'],
   '08:00', '18:00',
   ARRAY[
     '11111111-0001-0001-0001-000000000001'::uuid,
     '11111111-0001-0001-0001-000000000002'::uuid,
     '11111111-0001-0001-0001-000000000003'::uuid,
     '11111111-0001-0001-0001-000000000004'::uuid,
     '11111111-0001-0001-0001-000000000005'::uuid,
     '11111111-0001-0001-0001-000000000006'::uuid,
     '11111111-0001-0001-0001-000000000007'::uuid,
     '11111111-0001-0001-0001-000000000008'::uuid,
     '11111111-0001-0001-0001-000000000009'::uuid,
     '11111111-0001-0001-0001-000000000010'::uuid
   ], true),

  -- ── ESPECIALISTA 2: Corporal + Masajes ──
  ('22222222-0001-0001-0001-000000000004',
   'Carmen Rodríguez', 'specialist',
   '829-555-4004', 'carmen@anadsll.com',
   12, 'Lun-Sáb 9am-5pm',
   ARRAY['lunes','martes','miercoles','jueves','viernes','sabado'],
   '09:00', '17:00',
   ARRAY[
     '11111111-0001-0001-0001-000000000011'::uuid,
     '11111111-0001-0001-0001-000000000012'::uuid,
     '11111111-0001-0001-0001-000000000013'::uuid,
     '11111111-0001-0001-0001-000000000014'::uuid,
     '11111111-0001-0001-0001-000000000005'::uuid,
     '11111111-0001-0001-0001-000000000006'::uuid
   ], true),

  -- ── ESPECIALISTA 3: Belleza (cejas, pestañas, maquillaje, uñas) ──
  ('22222222-0001-0001-0001-000000000005',
   'Paola Jiménez', 'specialist',
   '829-555-5005', 'paola@anadsll.com',
   10, 'Mar-Sáb 9am-6pm',
   ARRAY['martes','miercoles','jueves','viernes','sabado'],
   '09:00', '18:00',
   ARRAY[
     '11111111-0001-0001-0001-000000000015'::uuid,
     '11111111-0001-0001-0001-000000000016'::uuid,
     '11111111-0001-0001-0001-000000000017'::uuid,
     '11111111-0001-0001-0001-000000000018'::uuid,
     '11111111-0001-0001-0001-000000000019'::uuid,
     '11111111-0001-0001-0001-000000000020'::uuid
   ], true);

-- ── 5. CLIENTES DE PRUEBA ─────────────────────────────────────────────
INSERT INTO clients (id, name, phone, email, cedula, skin_type, allergies, notes, source) VALUES
  ('33333333-0001-0001-0001-000000000001', 'María García',      '829-555-0001', 'maria@gmail.com',     '001-1234567-8', 'Mixta',      'Ninguna',               'Clienta frecuente - Láser piernas', 'whatsapp'),
  ('33333333-0001-0001-0001-000000000002', 'Laura Sánchez',     '829-555-0002', 'laura@gmail.com',     '001-2345678-9', 'Sensible',   'Retinol',               'Sensible a productos ácidos',       'landing'),
  ('33333333-0001-0001-0001-000000000003', 'Carolina Pérez',    '829-555-0003', NULL,                  '001-3456789-0', 'Normal',     'Ninguna',               'Primera vez',                       'whatsapp'),
  ('33333333-0001-0001-0001-000000000004', 'Sofía Martínez',    '829-555-0004', 'sofia@gmail.com',     NULL,            'Seca',       'Ácido glicólico',       '',                                  'manual'),
  ('33333333-0001-0001-0001-000000000005', 'Ana López',         '829-555-0005', NULL,                  NULL,            'Grasa',      'Retinol, Vitamina C',   'Alergia confirmada al retinol',     'landing'),
  ('33333333-0001-0001-0001-000000000006', 'Diana Reyes',       '829-555-0006', 'diana@gmail.com',     '001-6789012-3', 'Mixta',      'Ninguna',               'Tratamiento corporal en curso',     'whatsapp'),
  ('33333333-0001-0001-0001-000000000007', 'Valentina Cruz',    '829-555-0007', NULL,                  NULL,            'Normal',     'Ninguna',               '',                                  'manual'),
  ('33333333-0001-0001-0001-000000000008', 'Isabella Fernández','829-555-0008', 'isabella@gmail.com',  '001-8901234-5', 'Sensible',   'Fragancias',            '',                                  'whatsapp'),
  ('33333333-0001-0001-0001-000000000009', 'Camila Rodríguez',  '829-555-0009', 'camila@gmail.com',    NULL,            'Mixta',      'Ninguna',               'Le gusta el facial premium',        'landing'),
  ('33333333-0001-0001-0001-000000000010', 'Paola Torres',      '829-555-0010', NULL,                  '001-1122334-5', 'Grasa',      'Ninguna',               '',                                  'manual');

-- ── 6. CITAS PARA HOY ─────────────────────────────────────────────────
-- Dra. Nadieska: trabaja hoy (asumiendo día de semana)
-- Carmen: trabaja hoy
-- Paola: trabaja si hoy no es lunes (trabaja Mar-Sáb)

INSERT INTO appointments
  (client_name, client_phone, service, employee, date, time, duration, status, notes, source)
VALUES
  -- Dra. Nadieska — Mañana
  ('María García',       '829-555-0001', 'Depilación Láser - Zona Pequeña', 'Dra. Nadieska Soto', CURRENT_DATE, '08:00', 30, 'confirmed',   'Sesión 3 de 5 - axilas',          'whatsapp'),
  ('Laura Sánchez',      '829-555-0002', 'Limpieza Facial Básica',          'Dra. Nadieska Soto', CURRENT_DATE, '09:00', 45, 'confirmed',   'Evitar productos con retinol',     'landing'),
  ('Carolina Pérez',     '829-555-0003', 'Depilación Láser - Zona Media',   'Dra. Nadieska Soto', CURRENT_DATE, '10:30', 45, 'pending',     'Primera vez con láser',            'whatsapp'),
  ('Sofía Martínez',     '829-555-0004', 'Rejuvenecimiento Facial',         'Dra. Nadieska Soto', CURRENT_DATE, '12:00', 60, 'confirmed',   '',                                 'manual'),
  ('Ana López',          '829-555-0005', 'Peeling Químico',                 'Dra. Nadieska Soto', CURRENT_DATE, '14:00', 45, 'confirmed',   'NO usar retinol 2 sem antes',      'landing'),
  ('Diana Reyes',        '829-555-0006', 'Microneedling',                   'Dra. Nadieska Soto', CURRENT_DATE, '15:30', 75, 'pending',     '',                                 'web'),

  -- Carmen — Mañana
  ('Valentina Cruz',     '829-555-0007', 'Tratamiento Corporal Reductivo',  'Carmen Rodríguez',   CURRENT_DATE, '09:00', 60, 'confirmed',   'Sesión 2 de 8',                    'whatsapp'),
  ('Isabella Fernández', '829-555-0008', 'Drenaje Linfático',               'Carmen Rodríguez',   CURRENT_DATE, '10:30', 60, 'confirmed',   '',                                 'whatsapp'),
  ('Camila Rodríguez',   '829-555-0009', 'Masaje Relajante',                'Carmen Rodríguez',   CURRENT_DATE, '12:00', 60, 'pending',     'Solicita música suave',            'web'),
  ('Paola Torres',       '829-555-0010', 'Tratamiento Anticelulítico',      'Carmen Rodríguez',   CURRENT_DATE, '14:00', 75, 'confirmed',   'Sesión 1 de 6',                    'landing'),
  ('María García',       '829-555-0001', 'Drenaje Linfático',               'Carmen Rodríguez',   CURRENT_DATE, '16:00', 60, 'confirmed',   'Post-sesión de láser',             'manual'),

  -- Paola — Belleza
  ('Laura Sánchez',      '829-555-0002', 'Diseño de Cejas',                 'Paola Jiménez',      CURRENT_DATE, '09:00', 30, 'confirmed',   '',                                 'whatsapp'),
  ('Sofía Martínez',     '829-555-0004', 'Extensión de Pestañas',           'Paola Jiménez',      CURRENT_DATE, '10:00', 90, 'confirmed',   'Volumen ruso',                     'whatsapp'),
  ('Carolina Pérez',     '829-555-0003', 'Manicura Semipermanente',         'Paola Jiménez',      CURRENT_DATE, '12:00', 60, 'pending',     'Color nude',                       'web'),
  ('Diana Reyes',        '829-555-0006', 'Maquillaje Profesional',          'Paola Jiménez',      CURRENT_DATE, '14:00', 60, 'confirmed',   'Boda - maquillaje duradero',       'manual'),
  ('Camila Rodríguez',   '829-555-0009', 'Pedicura Completa',               'Paola Jiménez',      CURRENT_DATE, '15:30', 75, 'pending',     '',                                 'landing'),

  -- Citas de mañana (preview)
  ('Isabella Fernández', '829-555-0008', 'Limpieza Facial Premium',         'Dra. Nadieska Soto', CURRENT_DATE + 1, '09:00', 60, 'confirmed', '',                               'whatsapp'),
  ('Valentina Cruz',     '829-555-0007', 'Depilación Láser - Zona Grande',  'Dra. Nadieska Soto', CURRENT_DATE + 1, '11:00', 60, 'pending',   'Sesión 4 de 5',                  'landing'),
  ('Paola Torres',       '829-555-0010', 'Tratamiento Corporal Reductivo',  'Carmen Rodríguez',   CURRENT_DATE + 1, '10:00', 60, 'confirmed', 'Sesión 3 de 8',                  'whatsapp'),
  ('María García',       '829-555-0001', 'Belleza Integral',                'Paola Jiménez',      CURRENT_DATE + 1, '11:00', 120, 'confirmed','Evento importante mañana',        'manual'),

  -- Citas de ayer (historial)
  ('Laura Sánchez',      '829-555-0002', 'Limpieza Facial Básica',          'Dra. Nadieska Soto', CURRENT_DATE - 1, '10:00', 45, 'completed', '',                               'landing'),
  ('Ana López',          '829-555-0005', 'Hidratación Facial Profunda',     'Dra. Nadieska Soto', CURRENT_DATE - 1, '11:30', 45, 'completed', '',                               'manual'),
  ('Camila Rodríguez',   '829-555-0009', 'Drenaje Linfático',               'Carmen Rodríguez',   CURRENT_DATE - 1, '09:00', 60, 'completed', '',                               'whatsapp'),
  ('Isabella Fernández', '829-555-0008', 'Diseño de Cejas',                 'Paola Jiménez',      CURRENT_DATE - 1, '10:00', 30, 'completed', '',                               'whatsapp'),
  ('Valentina Cruz',     '829-555-0007', 'Manicura Semipermanente',         'Paola Jiménez',      CURRENT_DATE - 1, '11:00', 60, 'no_show',   'No se presentó sin avisar',      'manual');

-- ── 7. PRODUCTOS ──────────────────────────────────────────────────────
INSERT INTO products (name, category, purchase_price, sale_price, stock, min_stock, unit, active) VALUES
  ('Protector Solar SPF 50',    'Cuidado Solar',     450,  950,  24, 5,  'unidad', true),
  ('Crema Hidratante Facial',   'Cuidado Facial',    380,  850,  18, 5,  'unidad', true),
  ('Sérum Vitamina C',          'Cuidado Facial',    520, 1200,  12, 3,  'unidad', true),
  ('Gel Post-Láser',            'Post-Tratamiento',  280,  650,  30, 10, 'unidad', true),
  ('Mascarilla Hidratante',     'Cuidado Facial',    200,  450,  15, 5,  'unidad', true),
  ('Aceite Corporal Reductivo', 'Cuidado Corporal',  350,  780,   8, 3,  'unidad', true),
  ('Exfoliante Corporal',       'Cuidado Corporal',  310,  700,  10, 3,  'unidad', true),
  ('Crema Anti-Age',            'Cuidado Facial',    680, 1500,   6, 3,  'unidad', true),
  ('Gel de Aloe Vera',          'Post-Tratamiento',  150,  350,   3, 5,  'unidad', true),
  ('Tónico Facial',             'Cuidado Facial',    250,  580,  14, 5,  'unidad', true),
  ('Sérum Retinol Noche',       'Cuidado Facial',    490, 1100,   9, 3,  'unidad', true),
  ('Crema Contorno de Ojos',    'Cuidado Facial',    420,  980,   7, 3,  'unidad', true);

-- ── 8. SECUENCIAS NCF ─────────────────────────────────────────────────
INSERT INTO ncf_sequences (type, prefix, current_number, range_start, range_end) VALUES
  ('B01', 'B01', 1, 1, 500),
  ('B02', 'B02', 1, 1, 500),
  ('B04', 'B04', 1, 1, 200),
  ('B14', 'B14', 1, 1, 100),
  ('B15', 'B15', 1, 1, 100)
ON CONFLICT (type) DO UPDATE SET current_number = 1;

-- ── 9. CONFIGURACIÓN DEL NEGOCIO ──────────────────────────────────────
INSERT INTO business_settings (key, value) VALUES
  ('business_name',    'Anadsll Beauty Esthetic'),
  ('rnc',              ''),
  ('address',          'C/Altagracia #65, Pueblo Abajo'),
  ('phone',            '829-322-4014'),
  ('email',            'info@anadsll.com'),
  ('instagram',        '@anadsllbeautyesthetic.rd'),
  ('schedule_mon_fri', '8:00 AM - 6:00 PM'),
  ('schedule_saturday','8:00 AM - 2:00 PM'),
  ('schedule_sunday',  'Cerrado')
ON CONFLICT (key) DO NOTHING;

-- Settings de pagos (tabla separada usada en el formulario de reservas)
INSERT INTO settings (id, deposit_amount, bank_name, account_number, account_name, whatsapp_number)
VALUES (1, 500, 'Banco Popular', '123456789012', 'Anadsll Beauty Esthetic', '18293224014')
ON CONFLICT (id) DO UPDATE SET
  deposit_amount  = EXCLUDED.deposit_amount,
  bank_name       = EXCLUDED.bank_name,
  account_number  = EXCLUDED.account_number,
  account_name    = EXCLUDED.account_name,
  whatsapp_number = EXCLUDED.whatsapp_number;

-- ═══════════════════════════════════════════════════════════════════════
--  ✅ SEED COMPLETADO
--  Staff: 2 no-citas (admin + recepción) + 3 especialistas
--  Servicios: 20 servicios en 4 categorías
--  Citas hoy: 16 (Nadieska x6, Carmen x5, Paola x5)
--  Citas mañana: 4 | Ayer: 5 (historial)
--  Clientes: 10
--  Productos: 12
-- ═══════════════════════════════════════════════════════════════════════
