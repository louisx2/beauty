-- Cobro del sistema en tiempo real: SellAlleS avisa (función aviso-cobro) cada vez que cambia un comprobante o un
-- pago del salón, y aquí queda una fila. El panel de la administración escucha esta tabla por Realtime y vuelve a
-- pedir su suscripción, sin recargar. Las filas no llevan datos (solo la hora) y se borran pasado un día.
create table public.avisos_cobro (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now()
);

comment on table public.avisos_cobro is
  'Un aviso de SellAlleS por cada cambio en los comprobantes o pagos del salón. Solo la escribe la función aviso-cobro; la lee la administración por Realtime.';

alter table public.avisos_cobro enable row level security;
revoke all on public.avisos_cobro from anon, authenticated;
grant select on public.avisos_cobro to authenticated;
grant select, insert, delete on public.avisos_cobro to service_role;

-- Realtime solo entrega la fila a quien pasa esta política: la administración del salón.
create policy "la administración ve los avisos de cobro" on public.avisos_cobro
  for select to authenticated
  using ((select public.staff_role()) = 'admin');

alter publication supabase_realtime add table public.avisos_cobro;
