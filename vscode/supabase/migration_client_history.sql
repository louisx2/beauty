-- Historial anterior de las clientas (Clientas → Historial). Lo que se les hizo antes de usar el sistema (libreta,
-- otro programa), para tenerlo junto a las visitas de la agenda. Se agrega, se edita y se borra desde el panel.
-- Los permisos son los de la ficha de la clienta: administración y recepción lo ven y lo cambian, y una
-- especialista solo lo ve de las clientas que ha atendido. Si se borra la clienta, se borra su historial.
create table public.client_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date,
  service text not null check (length(btrim(service)) > 0),
  employee text,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.client_history is
  'Historial anterior de cada clienta: servicios que se le hicieron antes de usar el sistema. Se edita en Clientas → Historial.';

create index client_history_client_id_idx on public.client_history (client_id);

alter table public.client_history enable row level security;
revoke all on public.client_history from anon, authenticated;
grant select, insert, update, delete on public.client_history to authenticated;

create policy staff_select_client_history on public.client_history
  for select to authenticated
  using (
    (select public.staff_role()) in ('admin', 'receptionist')
    or ((select public.staff_role()) = 'specialist' and exists (
      select 1 from public.appointments a
      where a.client_id = client_history.client_id
        and lower(a.employee) = lower(coalesce((select public.staff_name()), ''))
    ))
  );

create policy staff_insert_client_history on public.client_history
  for insert to authenticated
  with check ((select public.staff_role()) in ('admin', 'receptionist'));

create policy staff_update_client_history on public.client_history
  for update to authenticated
  using ((select public.staff_role()) in ('admin', 'receptionist'))
  with check ((select public.staff_role()) in ('admin', 'receptionist'));

create policy staff_delete_client_history on public.client_history
  for delete to authenticated
  using ((select public.staff_role()) in ('admin', 'receptionist'));
