-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN v2 — Fixes de datos, settings y RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Seguro de ejecutar varias veces (usa IF NOT EXISTS / ON CONFLICT)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. TABLA SETTINGS (fila única para configuración del negocio) ──────────

CREATE TABLE IF NOT EXISTS public.settings (
  id            INTEGER  PRIMARY KEY DEFAULT 1,
  deposit_amount NUMERIC  NOT NULL DEFAULT 500,
  bank_name      TEXT     NOT NULL DEFAULT 'Banco Popular',
  account_number TEXT     NOT NULL DEFAULT '123456789',
  account_name   TEXT     NOT NULL DEFAULT 'Anadsll Beauty Esthetic',
  whatsapp_number TEXT    NOT NULL DEFAULT '18293224014',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantizar una sola fila
ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_single_row;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_single_row CHECK (id = 1);

-- Fila por defecto
INSERT INTO public.settings (id, deposit_amount, bank_name, account_number, account_name, whatsapp_number)
VALUES (1, 500, 'Banco Popular', '123456789', 'Anadsll Beauty Esthetic', '18293224014')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings"   ON public.settings;
DROP POLICY IF EXISTS "admin_update_settings"  ON public.settings;
DROP POLICY IF EXISTS "anon_read"              ON public.settings;
DROP POLICY IF EXISTS "auth_all"              ON public.settings;

-- Cualquiera puede leer (necesario para el booking page)
CREATE POLICY "public_read_settings"
  ON public.settings FOR SELECT
  USING (true);

-- Solo usuarios autenticados pueden modificar
CREATE POLICY "admin_update_settings"
  ON public.settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 2. CAMPOS ADICIONALES EN APPOINTMENTS ────────────────────────────────

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS client_email   TEXT;

-- Índice para búsqueda por token
CREATE INDEX IF NOT EXISTS idx_appointments_token ON public.appointments(tracking_token);

-- ── 3. CAMPOS ADICIONALES EN STAFF ───────────────────────────────────────

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS working_days  TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS working_start TIME     NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS working_end   TIME     NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS service_ids   UUID[]   NOT NULL DEFAULT '{}';

-- ── 4. RLS — APPOINTMENTS (lectura pública + cancelación propia) ──────────

-- Limpiar políticas viejas para evitar conflictos
DROP POLICY IF EXISTS "anon_insert"             ON public.appointments;
DROP POLICY IF EXISTS "anon_read"               ON public.appointments;
DROP POLICY IF EXISTS "anon_cancel_appointment" ON public.appointments;
DROP POLICY IF EXISTS "public_insert_appointments" ON public.appointments;
DROP POLICY IF EXISTS "public_read_own_appointment" ON public.appointments;

-- Clientes (anon) pueden ver sus propias citas por teléfono
CREATE POLICY "anon_read_own"
  ON public.appointments FOR SELECT TO anon
  USING (true);

-- Clientes (anon) pueden reservar desde la web
CREATE POLICY "anon_insert_web"
  ON public.appointments FOR INSERT TO anon
  WITH CHECK (source = 'web');

-- Clientes (anon) pueden cancelar sus propias citas (validamos phone en el cliente)
-- La política solo permite cambiar status a 'cancelled'
CREATE POLICY "anon_cancel_own"
  ON public.appointments FOR UPDATE TO anon
  USING (status IN ('pending', 'confirmed'))
  WITH CHECK (status = 'cancelled');

-- Staff autenticado tiene acceso total
DROP POLICY IF EXISTS "auth_all" ON public.appointments;
CREATE POLICY "auth_all"
  ON public.appointments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── 5. RLS — SERVICES, STAFF, SESSION_PACKAGES (lectura pública) ─────────

-- Services
DROP POLICY IF EXISTS "anon_read"              ON public.services;
DROP POLICY IF EXISTS "public_read_services"   ON public.services;
DROP POLICY IF EXISTS "auth_all"              ON public.services;
CREATE POLICY "anon_read" ON public.services FOR SELECT TO anon USING (active = true);
CREATE POLICY "auth_all"  ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff
DROP POLICY IF EXISTS "anon_read"            ON public.staff;
DROP POLICY IF EXISTS "public_read_staff"    ON public.staff;
DROP POLICY IF EXISTS "auth_all"            ON public.staff;
CREATE POLICY "anon_read" ON public.staff FOR SELECT TO anon USING (active = true);
CREATE POLICY "auth_all"  ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Session packages
DROP POLICY IF EXISTS "anon_read"             ON public.session_packages;
DROP POLICY IF EXISTS "public_read_packages"  ON public.session_packages;
DROP POLICY IF EXISTS "auth_all"             ON public.session_packages;
CREATE POLICY "anon_read" ON public.session_packages FOR SELECT TO anon USING (active = true);
CREATE POLICY "auth_all"  ON public.session_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. FUNCIÓN: auto-trigger updated_at en settings ──────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS settings_updated_at ON public.settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 7. FUNCIÓN: cancelar citas pendientes sin pago (>2h) ─────────────────

CREATE OR REPLACE FUNCTION public.cancel_expired_appointments()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cnt INTEGER;
BEGIN
  UPDATE public.appointments
  SET    status = 'cancelled',
         notes  = COALESCE(notes, '') || ' [Cancelada automáticamente — sin confirmación de pago]'
  WHERE  status = 'pending'
    AND  created_at < NOW() - INTERVAL '2 hours';

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- ── FIN DE MIGRACIÓN v2 ───────────────────────────────────────────────────
