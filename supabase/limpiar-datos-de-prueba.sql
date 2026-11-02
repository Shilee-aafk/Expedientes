-- ══════════════════════════════════════════════════════════════════════
-- ⚠️  BORRA DATOS DE SUPABASE. Úsalo SOLO si lo que hay en Supabase son
-- pruebas (por ejemplo, de la primera versión web) y vas a subir los datos
-- reales desde un equipo con la app de escritorio (pantalla «Subir datos»).
--
-- No toca los datos guardados en los computadores.
-- Revisa antes qué hay:
--   select codigo, predio, created_at from public.expedientes order by id;
--   select usuario, nombre from public.profiles;
-- ══════════════════════════════════════════════════════════════════════

begin;

-- 1. Expedientes de prueba (con su checklist, dueños e historial) y numeración
delete from public.expedientes;
delete from public.correlativos;

-- 2. Archivos adjuntos de prueba: Supabase no permite borrarlos con SQL. Si quieres
--    quitarlos, hazlo en el panel: Storage → documentos → seleccionar → Delete.

-- 3. Usuarios de prueba (cuentas de Supabase Auth y sus perfiles)
delete from auth.users where id in (select id from public.profiles);
delete from public.profiles;

commit;
