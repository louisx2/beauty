-- 1. Create Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id integer PRIMARY KEY DEFAULT 1, -- Single row constraint
  deposit_amount numeric NOT NULL DEFAULT 500,
  bank_name text NOT NULL DEFAULT 'Banco Popular',
  account_number text NOT NULL DEFAULT '123456789',
  account_name text NOT NULL DEFAULT 'Anadsll Beauty Esthetic',
  whatsapp_number text NOT NULL DEFAULT '18293224014',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Ensure only one row exists
ALTER TABLE public.settings ADD CONSTRAINT settings_single_row CHECK (id = 1);

-- Insert default row
INSERT INTO public.settings (id, deposit_amount, bank_name, account_number, account_name, whatsapp_number)
VALUES (1, 500, 'Banco Popular', '123456789', 'Anadsll Beauty Esthetic', '18293224014')
ON CONFLICT (id) DO NOTHING;

-- RLS for Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "public_read_settings" ON public.settings FOR SELECT USING (true);

-- Only authenticated users (admins) can update
CREATE POLICY "admin_update_settings" ON public.settings FOR UPDATE USING (auth.role() = 'authenticated');


-- 2. Function to cancel expired appointments (older than 2 hours and pending)
CREATE OR REPLACE FUNCTION public.cancel_expired_appointments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cancelled_count integer;
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled', 
      notes = COALESCE(notes, '') || ' (Cancelada automáticamente por falta de pago)'
  WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '2 hours';
    
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$;
