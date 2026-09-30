-- Mis citas: las citas se buscan con la misma clave de 10 dígitos que los paquetes (telefono_clave). Así una cita
-- guardada como "+1 809-555-0101" (recepción guarda el teléfono tal como se escribe) aparece al escribir
-- "809-555-0101", y al revés. Firma, permisos y regla de 12 h sin cambios.

create or replace function public.get_client_appointments(p_phone text)
returns table(id uuid, client_name text, service text, employee text, date date, "time" time without time zone,
              duration integer, status text, notes text, source text)
language sql stable security definer set search_path = public
as $$
  select a.id, a.client_name, a.service, a.employee, a.date, a."time", a.duration, a.status, a.notes, a.source
  from public.appointments a
  where public.telefono_clave(p_phone) is not null
    and public.telefono_clave(a.client_phone) = public.telefono_clave(p_phone)
  order by a.date desc, a."time" desc
$$;

create or replace function public.get_client_appointment_services(p_phone text)
returns table(appointment_id uuid, servicio text, especialista text, hora time, duracion integer, orden integer)
language sql stable security definer set search_path = public
as $$
  select x.appointment_id, x.service_name, x.employee, x.start_time, x.duration, x.sort_order
  from public.appointment_services x
  join public.appointments a on a.id = x.appointment_id
  where public.telefono_clave(p_phone) is not null
    and public.telefono_clave(a.client_phone) = public.telefono_clave(p_phone)
  order by x.appointment_id, x.sort_order
$$;

create or replace function public.cancel_client_appointment(p_id uuid, p_phone text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.appointments a
  set status = 'cancelled'
  where a.id = p_id
    and public.telefono_clave(p_phone) is not null
    and public.telefono_clave(a.client_phone) = public.telefono_clave(p_phone)
    and a.status in ('pending', 'confirmed')
    and ((a.date::timestamp + a."time") at time zone 'America/Santo_Domingo') > now() + interval '12 hours';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
