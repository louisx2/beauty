-- ═══════════════════════════════════════════════════════════
-- Anadsll Beauty Esthetic — Schema + Seed Data
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- ── 1. TABLES ──

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cedula TEXT,
  skin_type TEXT,
  allergies TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('laser','facial','corporal','belleza')),
  description TEXT NOT NULL DEFAULT '',
  duration INT NOT NULL DEFAULT 45,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable BOOLEAN NOT NULL DEFAULT true,
  has_session BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS session_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sessions INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES session_packages(id) ON DELETE CASCADE,
  total_sessions INT NOT NULL,
  used_sessions INT NOT NULL DEFAULT 0,
  notes TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'specialist',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  schedule TEXT NOT NULL DEFAULT 'Lun-Vie 8am-6pm',
  working_days TEXT[] DEFAULT '{}',
  working_start TIME DEFAULT '09:00:00',
  working_end TIME DEFAULT '18:00:00',
  service_ids UUID[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL,
  employee TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT NOT NULL DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_cedula TEXT,
  ncf TEXT NOT NULL,
  ncf_type TEXT NOT NULL CHECK (ncf_type IN ('B01','B02','B04','B14','B15')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_itbis NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash','card','transfer','mixed')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','paid','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  taxable BOOLEAN NOT NULL DEFAULT true,
  itbis NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'unidad',
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ncf_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  current_number INT NOT NULL DEFAULT 1,
  range_start INT NOT NULL DEFAULT 1,
  range_end INT NOT NULL DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT ''
);

-- ── 2. INDEXES ──

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_ncf_type ON invoices(ncf_type);
CREATE INDEX IF NOT EXISTS idx_client_packages_client ON client_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- ── 3. ROW LEVEL SECURITY ──
-- For now, allow all authenticated users full access
-- (single business, all staff can read/write everything)

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncf_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything, anon can read some things
DROP POLICY IF EXISTS "auth_all" ON clients;
CREATE POLICY "auth_all" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SERVICES: Anon can read
DROP POLICY IF EXISTS "auth_all" ON services;
DROP POLICY IF EXISTS "anon_read" ON services;
CREATE POLICY "anon_read" ON services FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SESSION PACKAGES: Anon can read
DROP POLICY IF EXISTS "auth_all" ON session_packages;
DROP POLICY IF EXISTS "anon_read" ON session_packages;
CREATE POLICY "anon_read" ON session_packages FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all" ON session_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON client_packages;
CREATE POLICY "auth_all" ON client_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- APPOINTMENTS: Anon can insert and read
DROP POLICY IF EXISTS "auth_all" ON appointments;
DROP POLICY IF EXISTS "anon_insert" ON appointments;
DROP POLICY IF EXISTS "anon_read" ON appointments;
CREATE POLICY "anon_insert" ON appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_read" ON appointments FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON invoices;
CREATE POLICY "auth_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON invoice_items;
CREATE POLICY "auth_all" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON products;
CREATE POLICY "auth_all" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STAFF: Anon can read
DROP POLICY IF EXISTS "auth_all" ON staff;
DROP POLICY IF EXISTS "anon_read" ON staff;
CREATE POLICY "anon_read" ON staff FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all" ON staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all" ON ncf_sequences;
CREATE POLICY "auth_all" ON ncf_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BUSINESS SETTINGS: Anon can read
DROP POLICY IF EXISTS "auth_all" ON business_settings;
DROP POLICY IF EXISTS "anon_read" ON business_settings;
CREATE POLICY "anon_read" ON business_settings FOR SELECT TO anon USING (true);
CREATE POLICY "auth_all" ON business_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 4. SEED DATA ──

-- Staff
INSERT INTO staff (name, role, phone, email, commission_pct, schedule, active) VALUES
  ('Dra. Ana', 'specialist', '829-555-1001', 'ana@anadsll.com', 15, 'Lun-Vie 8am-6pm', true),
  ('Carmen', 'specialist', '829-555-1002', 'carmen@anadsll.com', 10, 'Lun-Sáb 9am-5pm', true);

-- Clients
INSERT INTO clients (name, phone, email, cedula, skin_type, allergies, notes, source) VALUES
  ('María García', '829-555-0001', 'maria@email.com', '001-1234567-8', 'Mixta', 'Ninguna', 'Clienta frecuente - Láser piernas', 'whatsapp'),
  ('Laura Sánchez', '829-555-0002', 'laura@email.com', '001-2345678-9', 'Sensible', 'Retinol', '', 'landing'),
  ('Carolina Pérez', '829-555-0003', NULL, '001-3456789-0', 'Normal', 'Ninguna', 'Primera vez', 'whatsapp'),
  ('Sofía Martínez', '829-555-0004', 'sofia@email.com', NULL, 'Seca', 'Ácido glicólico', '', 'manual'),
  ('Ana López', '829-555-0005', NULL, NULL, 'Grasa', 'Retinol, Vitamina C', 'Alergia confirmada al retinol', 'landing'),
  ('Diana Reyes', '829-555-0006', 'diana@email.com', '001-6789012-3', 'Mixta', 'Ninguna', 'Tratamiento corporal en curso', 'whatsapp'),
  ('Valentina Cruz', '829-555-0007', NULL, NULL, 'Normal', 'Ninguna', '', 'manual'),
  ('Isabella Fernández', '829-555-0008', 'isabella@email.com', '001-8901234-5', 'Sensible', 'Fragancias', '', 'whatsapp');

-- Services
INSERT INTO services (name, category, description, duration, price, taxable, has_session, active) VALUES
  ('Depilación Láser - Zona Pequeña', 'laser', 'Axilas, bikini, labio superior', 30, 1800, true, true, true),
  ('Depilación Láser - Zona Media', 'laser', 'Brazos, abdomen, espalda media', 45, 2500, true, true, true),
  ('Depilación Láser - Zona Grande', 'laser', 'Piernas completas, espalda completa', 60, 3500, true, true, true),
  ('Limpieza Facial', 'facial', 'Limpieza profunda de impurezas', 45, 1500, true, true, true),
  ('Limpieza Profunda Premium', 'facial', 'Limpieza + extracción + mascarilla', 60, 2200, true, true, true),
  ('Rejuvenecimiento Facial', 'facial', 'Radiofrecuencia y tratamientos anti-edad', 60, 3000, true, true, true),
  ('Microneedling', 'facial', 'Tratamiento de colágeno con micro-agujas', 75, 4500, true, true, true),
  ('Tratamiento Corporal Reductivo', 'corporal', 'Cavitación + radiofrecuencia', 60, 2800, true, true, true),
  ('Drenaje Linfático', 'corporal', 'Masaje de drenaje manual', 60, 1800, true, false, true),
  ('Belleza Integral', 'belleza', 'Maquillaje + cejas + pestañas', 90, 2000, true, false, true),
  ('Diseño de Cejas', 'belleza', 'Depilación y diseño profesional', 30, 600, true, false, true),
  ('Maquillaje Profesional', 'belleza', 'Maquillaje para eventos y ocasiones especiales', 60, 1500, true, false, true);

-- Session Packages (using subqueries to get service IDs)
INSERT INTO session_packages (service_id, name, sessions, price, active)
SELECT id, 'Láser Básico x3', 3, 4500, true FROM services WHERE name = 'Depilación Láser - Zona Pequeña'
UNION ALL
SELECT id, 'Láser Básico x5', 5, 7000, true FROM services WHERE name = 'Depilación Láser - Zona Pequeña'
UNION ALL
SELECT id, 'Láser Premium x5', 5, 15000, true FROM services WHERE name = 'Depilación Láser - Zona Grande'
UNION ALL
SELECT id, 'Facial Revitalizante x4', 4, 5200, true FROM services WHERE name = 'Limpieza Facial'
UNION ALL
SELECT id, 'Rejuvenecimiento x6', 6, 15000, true FROM services WHERE name = 'Rejuvenecimiento Facial'
UNION ALL
SELECT id, 'Cuerpo Reductivo x8', 8, 18000, true FROM services WHERE name = 'Tratamiento Corporal Reductivo';

-- NCF Sequences
INSERT INTO ncf_sequences (type, prefix, current_number, range_start, range_end) VALUES
  ('B01', 'B0100000001', 1, 1, 500),
  ('B02', 'B0200000001', 1, 1, 500),
  ('B04', 'B0400000001', 1, 1, 200),
  ('B14', 'B1400000001', 1, 1, 100),
  ('B15', 'B1500000001', 1, 1, 100)
ON CONFLICT (type) DO NOTHING;

-- Products
INSERT INTO products (name, category, purchase_price, sale_price, stock, min_stock, unit, active) VALUES
  ('Protector Solar SPF 50', 'Cuidado Solar', 450, 950, 24, 5, 'unidad', true),
  ('Crema Hidratante Facial', 'Cuidado Facial', 380, 850, 18, 5, 'unidad', true),
  ('Sérum Vitamina C', 'Cuidado Facial', 520, 1200, 12, 3, 'unidad', true),
  ('Gel Post-Láser', 'Post-Tratamiento', 280, 650, 30, 10, 'unidad', true),
  ('Mascarilla Hidratante', 'Cuidado Facial', 200, 450, 15, 5, 'unidad', true),
  ('Aceite Corporal', 'Cuidado Corporal', 350, 780, 8, 3, 'unidad', true),
  ('Exfoliante Corporal', 'Cuidado Corporal', 310, 700, 10, 3, 'unidad', true),
  ('Crema Anti-Age', 'Cuidado Facial', 680, 1500, 6, 3, 'unidad', true),
  ('Gel de Aloe Vera', 'Post-Tratamiento', 150, 350, 3, 5, 'unidad', true),
  ('Tónico Facial', 'Cuidado Facial', 250, 580, 14, 5, 'unidad', true);

-- Appointments (today and nearby dates)
INSERT INTO appointments (client_name, client_phone, service, employee, date, time, duration, status, notes, source) VALUES
  ('María García', '829-555-0001', 'Depilación Láser - Piernas', 'Dra. Ana', CURRENT_DATE, '09:00', 60, 'confirmed', 'Sesión 3 de 5', 'whatsapp'),
  ('Laura Sánchez', '829-555-0002', 'Limpieza Facial', 'Dra. Ana', CURRENT_DATE, '10:30', 45, 'confirmed', '', 'landing'),
  ('Carolina Pérez', '829-555-0003', 'Depilación Láser - Axilas', 'Carmen', CURRENT_DATE, '11:30', 30, 'pending', 'Primera vez', 'whatsapp'),
  ('Sofía Martínez', '829-555-0004', 'Rejuvenecimiento Facial', 'Dra. Ana', CURRENT_DATE, '13:00', 60, 'confirmed', '', 'manual'),
  ('Ana López', '829-555-0005', 'Cuidado Facial Premium', 'Carmen', CURRENT_DATE, '14:30', 45, 'pending', 'Tiene alergia al retinol', 'landing'),
  ('Diana Reyes', '829-555-0006', 'Tratamiento Corporal Reductivo', 'Dra. Ana', CURRENT_DATE, '15:30', 60, 'confirmed', 'Sesión 2 de 4', 'whatsapp'),
  ('Valentina Cruz', '829-555-0007', 'Belleza Integral', 'Carmen', CURRENT_DATE, '16:30', 90, 'confirmed', 'Maquillaje + cejas', 'manual'),
  -- Tomorrow
  ('Camila Rodríguez', '829-555-0009', 'Limpieza Profunda', 'Carmen', CURRENT_DATE + 1, '09:00', 45, 'confirmed', '', 'manual'),
  ('Lucía Gómez', '829-555-0010', 'Rejuvenecimiento', 'Dra. Ana', CURRENT_DATE + 1, '10:00', 60, 'pending', '', 'landing'),
  ('Gabriela Torres', '829-555-0011', 'Depilación Láser', 'Dra. Ana', CURRENT_DATE + 1, '14:00', 60, 'confirmed', 'Sesión 5 de 5 - última', 'whatsapp'),
  -- Yesterday
  ('Patricia Mendoza', '829-555-0012', 'Cuidado Facial', 'Carmen', CURRENT_DATE - 1, '10:00', 45, 'completed', '', 'manual'),
  ('Rosa Herrera', '829-555-0013', 'Belleza Integral', 'Dra. Ana', CURRENT_DATE - 1, '11:00', 60, 'completed', '', 'whatsapp');

-- Business Settings
INSERT INTO business_settings (key, value) VALUES
  ('business_name', 'Anadsll Beauty Esthetic'),
  ('rnc', ''),
  ('address', 'C/Altagracia, #65, Pueblo Abajo'),
  ('phone', '829-322-4014'),
  ('email', 'info@anadsll.com'),
  ('instagram', '@anadsllbeautyesthetic.rd'),
  ('schedule_mon_fri', '8:00 AM - 6:00 PM'),
  ('schedule_saturday', '8:00 AM - 2:00 PM'),
  ('schedule_sunday', 'Cerrado')
ON CONFLICT (key) DO NOTHING;
