-- 1. Modificar client_packages para soportar control de pagos
ALTER TABLE client_packages
ADD COLUMN total_price numeric NOT NULL DEFAULT 0,
ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0,
ADD COLUMN status text NOT NULL DEFAULT 'active'; -- 'active', 'completed', 'cancelled'

-- Llenar total_price basado en el precio actual del paquete si existen paquetes viejos
UPDATE client_packages cp
SET total_price = (SELECT price FROM session_packages sp WHERE sp.id = cp.package_id)
WHERE total_price = 0;

-- Marcar como completados si ya usaron todas sus sesiones
UPDATE client_packages
SET status = 'completed'
WHERE used_sessions >= total_sessions;

-- 2. Crear tabla de pagos (payments) para registrar abonos
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  package_id uuid REFERENCES client_packages(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'cash', -- 'cash', 'card', 'transfer'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text -- (Optional) to track who received the payment
);

-- Políticas RLS para payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON payments FOR SELECT USING (true);

CREATE POLICY "Payments can be inserted by authenticated users"
ON payments FOR INSERT WITH CHECK (true);

-- 3. Modificar settings para incluir opciones de depósito para paquetes
ALTER TABLE settings
ADD COLUMN package_deposit_type text NOT NULL DEFAULT 'fixed', -- 'fixed' o 'percentage'
ADD COLUMN package_deposit_value numeric NOT NULL DEFAULT 500;
