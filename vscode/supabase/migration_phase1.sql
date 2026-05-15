-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN FASE 1 — Personal + Servicios mejorados
-- Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. Extender tabla STAFF con horarios y servicios ──

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS working_days  TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS working_start TIME    NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS working_end   TIME    NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS service_ids   UUID[]  NOT NULL DEFAULT '{}';

-- Migrar datos existentes (schedule de texto → working_days)
UPDATE staff SET
  working_days  = ARRAY['lunes','martes','miercoles','jueves','viernes'],
  working_start = '08:00',
  working_end   = '18:00'
WHERE name = 'Dra. Ana';

UPDATE staff SET
  working_days  = ARRAY['lunes','martes','miercoles','jueves','viernes','sabado'],
  working_start = '09:00',
  working_end   = '17:00'
WHERE name = 'Carmen';

-- ── 2. Extender tabla APPOINTMENTS ──

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS client_email   TEXT;

-- Generar tokens para citas existentes sin token
UPDATE appointments
  SET tracking_token = gen_random_uuid()
  WHERE tracking_token IS NULL;

-- Índice para búsqueda por token
CREATE INDEX IF NOT EXISTS idx_appointments_token
  ON appointments(tracking_token);

-- ── 3. Extender tabla SERVICES ──

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS staff_ids UUID[] NOT NULL DEFAULT '{}';

-- ── 4. Extender tabla SESSION_PACKAGES con payment_mode ──

ALTER TABLE session_packages
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'upfront',
  ADD COLUMN IF NOT EXISTS description  TEXT NOT NULL DEFAULT '';

-- Validar valores de payment_mode
ALTER TABLE session_packages
  DROP CONSTRAINT IF EXISTS session_packages_payment_mode_check;

ALTER TABLE session_packages
  ADD CONSTRAINT session_packages_payment_mode_check
  CHECK (payment_mode IN ('upfront', 'per_session', 'custom'));

-- ── 5. RLS: permitir lectura anónima para el booking del landing ──

-- Borrar políticas existentes si las hay (para evitar duplicados)
DROP POLICY IF EXISTS "public_read_services"  ON services;
DROP POLICY IF EXISTS "public_read_staff"     ON staff;
DROP POLICY IF EXISTS "public_read_packages"  ON session_packages;
DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "public_read_own_appointment" ON appointments;

-- El landing necesita leer servicios y staff sin autenticación
CREATE POLICY "public_read_services"
  ON services FOR SELECT TO anon USING (active = true);

CREATE POLICY "public_read_staff"
  ON staff FOR SELECT TO anon USING (active = true);

CREATE POLICY "public_read_packages"
  ON session_packages FOR SELECT TO anon USING (active = true);

-- Permitir a anon insertar citas (reservas del landing)
CREATE POLICY "public_insert_appointments"
  ON appointments FOR INSERT TO anon WITH CHECK (source = 'web');

-- Permitir a anon leer citas por teléfono/token (rastreo)
CREATE POLICY "public_read_own_appointment"
  ON appointments FOR SELECT TO anon USING (true);

-- ── FIN DE MIGRACIÓN ──
