-- Equipo en la web (spec §6.5 y §7). "Nuestro equipo" muestra a quien tenga mostrar_en_web = true y
-- active = true. anon lee staff columna por columna: cada columna nueva que la web lea necesita su grant.
-- authenticated tiene permisos de tabla; editar lo limita la RLS (solo admin).
alter table public.staff
  add column if not exists mostrar_en_web boolean not null default false,
  add column if not exists cargo_web text,
  add column if not exists especialidades_web text;

grant select (mostrar_en_web, cargo_web, especialidades_web) on public.staff to anon;
