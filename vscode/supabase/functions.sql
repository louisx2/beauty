-- Create the admin user for Anadsll Beauty
-- Run this in Supabase SQL Editor

-- First, create the get_next_ncf function for atomic NCF generation
CREATE OR REPLACE FUNCTION get_next_ncf(ncf_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq RECORD;
  ncf_number TEXT;
BEGIN
  SELECT * INTO seq FROM ncf_sequences WHERE type = ncf_type FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  ncf_number := LEFT(seq.prefix, 3) || LPAD(seq.current_number::TEXT, 8, '0');
  
  UPDATE ncf_sequences SET current_number = current_number + 1 WHERE type = ncf_type;
  
  RETURN ncf_number;
END;
$$;
