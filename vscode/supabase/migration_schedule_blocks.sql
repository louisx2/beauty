-- Bloqueos de horario: vacaciones, dia libre, almuerzo, feriados del salon.
-- Aplicada en Supabase el 2026-09-18 (migracion "schedule_blocks").
-- staff_id NULL = bloquea a todo el salon. start_time/end_time NULL = todo el dia.
create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  start_time time without time zone,
  end_time time without time zone,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint schedule_blocks_dates_ok check (end_date >= start_date),
  constraint schedule_blocks_times_ok check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists schedule_blocks_range_idx
  on public.schedule_blocks (start_date, end_date);

alter table public.schedule_blocks enable row level security;

drop policy if exists staff_select_blocks on public.schedule_blocks;
create policy staff_select_blocks on public.schedule_blocks
  for select to authenticated using (true);

drop policy if exists staff_insert_blocks on public.schedule_blocks;
create policy staff_insert_blocks on public.schedule_blocks
  for insert to authenticated
  with check (staff_role() = any (array['admin','receptionist']));

drop policy if exists staff_update_blocks on public.schedule_blocks;
create policy staff_update_blocks on public.schedule_blocks
  for update to authenticated
  using (staff_role() = any (array['admin','receptionist']))
  with check (staff_role() = any (array['admin','receptionist']));

drop policy if exists staff_delete_blocks on public.schedule_blocks;
create policy staff_delete_blocks on public.schedule_blocks
  for delete to authenticated
  using (staff_role() = any (array['admin','receptionist']));

-- La pagina publica necesita saber QUE horas estan bloqueadas, pero no POR QUE.
create or replace view public.schedule_blocks_public
with (security_invoker = false) as
  select id, staff_id, start_date, end_date, start_time, end_time
  from public.schedule_blocks;

grant select on public.schedule_blocks_public to anon, authenticated;
