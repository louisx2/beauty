-- Enlazar citas con su clienta por telefono. Aplicado en Supabase el 2026-09-27
-- (migracion: link_appointments_to_clients_by_phone).
--
-- PROBLEMA
-- Las citas quedaban sin client_id: la reserva web no conoce a la clienta y el
-- panel lo perdia al guardar. Sin ese enlace no se descontaban sesiones de
-- paquete, el historial de la clienta salia vacio y las especialistas no veian
-- a sus clientas ni sus paquetes (sus politicas RLS dependen de ese enlace).
--
-- REGLA
-- Se compara por los ultimos 10 digitos del telefono y solo se enlaza cuando UNA
-- sola clienta tiene ese numero. Si el panel manda la clienta, se respeta.

create or replace function public.telefono_clave(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when length(d) >= 10 then right(d, 10) end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- Al crear (o cambiar el telefono de) una cita sin clienta, busca a la clienta.
-- SECURITY DEFINER para que funcione en la reserva web sin darle a anon acceso a clients.
create or replace function public.link_client_by_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clave text := public.telefono_clave(new.client_phone);
  v_ids uuid[];
begin
  if new.client_id is null and v_clave is not null then
    select array_agg(id) into v_ids from public.clients where public.telefono_clave(phone) = v_clave;
    if array_length(v_ids, 1) = 1 then
      new.client_id := v_ids[1];
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_link_client on public.appointments;
create trigger appointments_link_client
  before insert or update of client_phone on public.appointments
  for each row execute function public.link_client_by_phone();

-- Al registrar una clienta (p. ej. "Guardar clienta" desde una reserva web),
-- se le enlazan las citas anteriores que tenian su telefono.
create or replace function public.link_appointments_to_new_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clave text := public.telefono_clave(new.phone);
begin
  if v_clave is null then
    return null;
  end if;
  if (select count(*) from public.clients where public.telefono_clave(phone) = v_clave) = 1 then
    update public.appointments
       set client_id = new.id
     where client_id is null
       and public.telefono_clave(client_phone) = v_clave;
  end if;
  return null;
end;
$$;

drop trigger if exists clients_link_appointments on public.clients;
create trigger clients_link_appointments
  after insert or update of phone on public.clients
  for each row execute function public.link_appointments_to_new_client();

-- Son funciones de trigger: nadie debe llamarlas por la API.
revoke execute on function public.link_client_by_phone() from public, anon, authenticated;
revoke execute on function public.link_appointments_to_new_client() from public, anon, authenticated;

-- Enlace de las citas que ya existian (mismo criterio). El 2026-09-27 no cambio
-- ninguna: los telefonos de las citas de prueba no coincidian con clientas.
update public.appointments a
   set client_id = c.id
  from public.clients c
 where a.client_id is null
   and public.telefono_clave(a.client_phone) is not null
   and public.telefono_clave(c.phone) = public.telefono_clave(a.client_phone)
   and (select count(*) from public.clients c2
         where public.telefono_clave(c2.phone) = public.telefono_clave(a.client_phone)) = 1;
