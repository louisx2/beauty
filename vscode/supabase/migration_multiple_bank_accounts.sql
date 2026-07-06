-- Migration: Add multiple bank accounts to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS bank_accounts jsonb DEFAULT '[]'::jsonb;

-- Populate bank_accounts with existing single bank account data
UPDATE settings 
SET bank_accounts = jsonb_build_array(
  jsonb_build_object(
    'bank_name', bank_name,
    'account_number', account_number,
    'account_name', account_name
  )
)
WHERE bank_accounts = '[]'::jsonb OR bank_accounts IS NULL;
