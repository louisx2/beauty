-- Aplicadas en Supabase el 2026-09-19:
--   "harden_staff_user_functions" y "schedule_blocks_public_column_privileges"
--
-- 1) Las cuatro funciones de gestion de usuarios YA validaban que quien llama
--    sea administradora activa. Lo que se corrige aqui es:
--    - create_staff_user no fijaba search_path (aviso 0011 del linter).
--    - La comparacion del correo era sensible a mayusculas, asi que una
--      diferencia de una letra dejaba a la dueña fuera de su propio panel.
--    - delete_staff_user ahora impide que una admin borre su propia cuenta.
--    El cuerpo completo esta en la migracion de Supabase; aqui queda la nota.
--
-- 2) La vista schedule_blocks_public ya no es SECURITY DEFINER (el linter lo
--    marca como error porque se salta la RLS). Ahora se ejecuta con los
--    permisos de quien consulta, y al rol anonimo se le conceden solo las
--    columnas de horario, nunca el motivo del bloqueo.

alter view public.schedule_blocks_public set (security_invoker = true);

drop policy if exists anon_select_blocks on public.schedule_blocks;
create policy anon_select_blocks on public.schedule_blocks
  for select to anon using (true);

revoke all on public.schedule_blocks from anon;
grant select (id, staff_id, start_date, end_date, start_time, end_time)
  on public.schedule_blocks to anon;
