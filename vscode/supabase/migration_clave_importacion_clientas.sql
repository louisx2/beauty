-- Aplicado en Supabase el 2026-10-14 (migración "clave_importacion_clientas").
-- De dónde salió cada clienta importada de los datos viejos de la dueña: "excel:<hoja>:<nombre>" (Excel de control del
-- láser) o "gcal:<nombre>" (Google Calendar). Las que se crean en el sistema la dejan vacía. Es única, así que la
-- importación se puede volver a correr sin duplicar clientas (insert ... on conflict (import_key) do nothing).
alter table public.clients add column if not exists import_key text;
create unique index if not exists clients_import_key_key on public.clients (import_key);

comment on column public.clients.import_key is 'De dónde salió la clienta al importar los datos viejos (Excel de láser o Google Calendar); null si se creó en el sistema. Evita duplicar si la importación se corre otra vez.';
