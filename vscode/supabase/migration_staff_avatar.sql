-- 1. Agregar columna avatar_url a la tabla staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Crear el bucket publico 'avatars' para almacenar las fotos del equipo
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar politicas de almacenamiento para el bucket 'avatars'
-- Permitir lectura publica para cualquiera (anonimo y autenticado)
CREATE POLICY "Permitir lectura publica de avatares"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Permitir a usuarios autenticados (staff de la estetica) subir y modificar avatares
CREATE POLICY "Permitir subida de avatares a empleados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Permitir actualizacion de avatares a empleados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Permitir eliminacion de avatares a empleados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
