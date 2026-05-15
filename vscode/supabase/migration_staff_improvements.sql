-- ═══════════════════════════════════════════════════════════
-- Staff Improvements Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Add staff_id FK to appointments (proper relational link)
--    Keeps the TEXT "employee" column for backwards compatibility
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- 2. Backfill staff_id from employee name for existing rows
UPDATE appointments a
SET staff_id = s.id
FROM staff s
WHERE a.employee = s.name
  AND a.staff_id IS NULL;

-- 3. Index for faster staff lookups on appointments
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);

-- 4. Index on staff.active for filtered queries
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(active);
