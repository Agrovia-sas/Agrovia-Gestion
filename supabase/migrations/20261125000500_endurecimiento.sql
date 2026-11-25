-- =====================================================================
-- AGROVIA SAS — Endurecimiento según los avisos de Supabase
-- 1. search_path fijo en todas las funciones.
-- 2. Las funciones de trigger no quedan expuestas como RPC.
-- Las acciones (revertir, transferir, endosar, descontar, conciliar) siguen
-- disponibles para usuarios logueados: validan el rol adentro (exigir_rol).
-- =====================================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as firma, p.prorettype = 'trigger'::regtype as es_trigger
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, auth', f.firma);
    if f.es_trigger then
      execute format('revoke execute on function %s from public, anon, authenticated', f.firma);
    end if;
  end loop;
end;
$$;
