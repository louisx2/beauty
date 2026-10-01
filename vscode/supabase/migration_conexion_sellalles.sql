-- Cobro del sistema (SellAlleS): la dirección del proyecto y la clave de conexión viven en Vault, nunca en el
-- repo ni en el navegador. Solo las lee la función mi-suscripcion con service role.
create or replace function public._conexion_sellalles()
returns table (url text, clave text)
language sql
stable
security definer
set search_path = ''
as $$
  select (select decrypted_secret from vault.decrypted_secrets where name = 'sellalles_url' limit 1),
         (select decrypted_secret from vault.decrypted_secrets where name = 'sellalles_clave_cobro' limit 1)
$$;

revoke all on function public._conexion_sellalles() from public, anon, authenticated;
grant execute on function public._conexion_sellalles() to service_role;
