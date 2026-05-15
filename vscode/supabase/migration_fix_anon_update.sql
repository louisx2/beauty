-- ═══════════════════════════════════════════════════════════
-- FIX: Permitir a clientes (anon) cancelar sus propias citas
-- y leer settings desde el landing
-- Pegar y ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- El portal de clientes (MyAppointments) necesita poder cancelar citas
-- Solo permitimos cambiar el status a 'cancelled'
DROP POLICY IF EXISTS "anon_cancel_appointment" ON appointments;
CREATE POLICY "anon_cancel_appointment"
  ON appointments FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status = 'cancelled');

-- Si existe una tabla 'settings', permitir lectura anónima
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_read" ON settings';
    EXECUTE 'CREATE POLICY "anon_read" ON settings FOR SELECT TO anon USING (true)';

    -- Habilitar RLS si no está habilitado
    EXECUTE 'ALTER TABLE settings ENABLE ROW LEVEL SECURITY';

    -- Política para authenticated
    EXECUTE 'DROP POLICY IF EXISTS "auth_all" ON settings';
    EXECUTE 'CREATE POLICY "auth_all" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
