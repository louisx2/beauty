-- Aplicado en Supabase el 2026-10-14 (migración "direccion_clientas").
-- Dirección de la clienta (opcional): calle, sector o barrio. La pidió Louis el 2026-10-14 para guardar la dirección
-- que traía el Excel de control del láser (antes iba a las notas). Se edita en Clientas → Datos de la clienta y se ve
-- en su ficha. Los permisos son los de la tabla (no hace falta tocar las políticas).
alter table public.clients add column if not exists address text;

comment on column public.clients.address is 'Dirección de la clienta (opcional): calle, sector o barrio.';
