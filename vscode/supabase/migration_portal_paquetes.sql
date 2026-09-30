-- Mis citas (spec §6.3 y §7). Dos funciones solo de lectura, ejecutables por anon, que buscan por teléfono
-- como las que ya existen.

-- Paquetes de la clienta: los activos y los terminados de los últimos 90 días (su última sesión completada,
-- o la compra si no hay sesiones). Busca con la clave de 10 dígitos de telefono_clave.
create or replace function public.get_client_packages(p_phone text)
returns table(
  id uuid, paquete_id uuid, paquete text, servicio text, sesiones integer, usadas integer,
  comprado date, estado text, paquete_activo boolean, cliente text
)
language sql stable security definer set search_path = public
as $$
  select cp.id, cp.package_id, sp.name, s.name, cp.total_sessions, cp.used_sessions,
         (cp.purchased_at at time zone 'America/Santo_Domingo')::date, cp.status, sp.active, c.name
  from public.client_packages cp
  join public.clients c on c.id = cp.client_id
  left join public.session_packages sp on sp.id = cp.package_id
  left join public.services s on s.id = sp.service_id
  where public.telefono_clave(p_phone) is not null
    and public.telefono_clave(c.phone) = public.telefono_clave(p_phone)
    and (
      cp.status = 'active'
      or (cp.status = 'completed' and coalesce(
            (select max(a.date)
               from public.appointments a
               join public.appointment_services x on x.appointment_id = a.id
              where a.client_id = cp.client_id and x.service_id = sp.service_id and a.status = 'completed'),
            (cp.purchased_at at time zone 'America/Santo_Domingo')::date) >= (now() at time zone 'America/Santo_Domingo')::date - 90)
    )
  order by (cp.status = 'active') desc, cp.purchased_at desc
$$;

-- Servicios de cada cita, con su hora y su especialista. get_client_appointments trae uno solo por cita.
-- Busca igual que get_client_appointments (todos los dígitos, mínimo 7), así las dos listas coinciden.
create or replace function public.get_client_appointment_services(p_phone text)
returns table(appointment_id uuid, servicio text, especialista text, hora time, duracion integer, orden integer)
language sql stable security definer set search_path = public
as $$
  select x.appointment_id, x.service_name, x.employee, x.start_time, x.duration, x.sort_order
  from public.appointment_services x
  join public.appointments a on a.id = x.appointment_id
  where length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and regexp_replace(a.client_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  order by x.appointment_id, x.sort_order
$$;

revoke all on function public.get_client_packages(text) from public;
revoke all on function public.get_client_appointment_services(text) from public;
grant execute on function public.get_client_packages(text) to anon, authenticated;
grant execute on function public.get_client_appointment_services(text) to anon, authenticated;
