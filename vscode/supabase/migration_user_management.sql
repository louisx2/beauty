-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Gestión de Usuarios desde Panel Administrativo
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Habilitar extensión para cifrado si no existe
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Listar cuentas de acceso registradas en Supabase Auth
CREATE OR REPLACE FUNCTION public.list_staff_logins()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar que el usuario ejecutor sea un administrador activo en la tabla public.staff
  IF NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: Solo administradoras activas pueden realizar esta acción.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at
  FROM auth.users u;
END;
$$;

-- 2. Crear una nueva cuenta de acceso en Supabase Auth
CREATE OR REPLACE FUNCTION public.create_staff_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  encrypted_pass TEXT;
BEGIN
  -- Validar que el usuario ejecutor sea un administrador activo
  IF NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: Solo administradoras activas pueden realizar esta acción.';
  END IF;

  -- Validar si el email ya existe en auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'El correo electrónico ya tiene una cuenta registrada.';
  END IF;

  -- Cifrar la contraseña usando bcrypt
  encrypted_pass := extensions.crypt(user_password, extensions.gen_salt('bf', 10));

  -- Insertar en la tabla auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    encrypted_pass,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('name', user_name, 'role', user_role),
    now(),
    now(),
    '',
    '',
    '',
    false
  );

  -- Insertar en la tabla auth.identities para habilitar el login por email
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id::text,
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', user_email),
    'email',
    now(),
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$;

-- 3. Actualizar la contraseña de una cuenta de acceso en Supabase Auth
CREATE OR REPLACE FUNCTION public.update_staff_user_password(
  user_email TEXT,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encrypted_pass TEXT;
BEGIN
  -- Validar que el usuario ejecutor sea un administrador activo
  IF NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: Solo administradoras activas pueden realizar esta acción.';
  END IF;

  -- Cifrar la contraseña usando bcrypt
  encrypted_pass := extensions.crypt(new_password, extensions.gen_salt('bf', 10));

  UPDATE auth.users
  SET encrypted_password = encrypted_pass,
      updated_at = now()
  WHERE email = user_email;

  RETURN FOUND;
END;
$$;

-- 4. Eliminar una cuenta de acceso de Supabase Auth
CREATE OR REPLACE FUNCTION public.delete_staff_user(
  user_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar que el usuario ejecutor sea un administrador activo
  IF NOT EXISTS (
    SELECT 1 FROM public.staff
    WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true
  ) THEN
    RAISE EXCEPTION 'No autorizado: Solo administradoras activas pueden realizar esta acción.';
  END IF;

  -- Eliminar de auth.users (el motor de BD elimina en cascada las identidades asociadas)
  DELETE FROM auth.users WHERE email = user_email;

  RETURN FOUND;
END;
$$;
