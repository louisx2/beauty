-- Visitas de antes sin detalle (Clientas → ficha → Visitas): las veces que una clienta vino antes de usar el sistema
-- y que no están anotadas en su historial previo. Se suman a sus visitas: citas completadas + días del historial
-- previo + este número. Lo cambian administración y recepción desde la ficha (los permisos son los de la tabla).
-- Aplicado en Supabase el 2026-10-20.
alter table public.clients
  add column if not exists visitas_previas integer not null default 0
  constraint clients_visitas_previas_rango check (visitas_previas between 0 and 9999);

comment on column public.clients.visitas_previas is
  'Visitas de antes del sistema que no están en client_history. Se suman a las visitas de la ficha.';
