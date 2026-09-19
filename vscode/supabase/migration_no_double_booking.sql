-- Candado contra doble reserva. Aplicado en Supabase el 2026-09-19
-- (migracion "prevent_double_booking").
-- Dos citas no pueden solaparse para la misma empleada, sin importar si entran
-- por la web, por el panel o por SQL. Las canceladas y los no-show no cuentan.
create extension if not exists btree_gist;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    lower(employee) with =,
    tsrange(
      (date + time),
      (date + time) + make_interval(mins => coalesce(duration, 45))
    ) with &&
  )
  where (status not in ('cancelled', 'no_show'));
