-- Estilo de los paquetes en la página principal (spec §6.4 y §7).
-- 'menu' = Menú con foto (por defecto), 'membresia' = tarjeta de socia, 'ahorro' = sello de ahorro.
-- settings ya es de lectura pública (política public_read_settings y grant de tabla): no hace falta grant.
alter table public.settings
  add column if not exists estilo_paquetes text not null default 'menu';

alter table public.settings
  drop constraint if exists settings_estilo_paquetes_check;

alter table public.settings
  add constraint settings_estilo_paquetes_check
  check (estilo_paquetes in ('membresia', 'menu', 'ahorro'));
