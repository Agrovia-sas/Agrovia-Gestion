-- Seguridad por rol (RLS) y auditoría
do $$
declare admin_id uuid := gen_random_uuid(); lect_id uuid := gen_random_uuid();
        oper_id uuid := gen_random_uuid(); extra_id uuid := gen_random_uuid(); op uuid; n bigint;
begin
  insert into auth.users (id) values (admin_id), (lect_id), (oper_id), (extra_id);
  insert into perfiles (id, nombre, rol) values
    (admin_id, 'Admin', 'admin'), (lect_id, 'Lectura', 'lectura'), (oper_id, 'Operador', 'operador');
  op := t.operacion('facturado', 600, 35000, 35500);
  perform t.mov('Caja efectivo', 1000);

  -- Usuario sin perfil: no ve nada
  perform set_config('request.jwt.claim.sub', extra_id::text, true);
  set local role authenticated;
  select count(*) into n from operaciones;
  perform t.igual(n, 0::bigint, 'sin perfil no ve operaciones');
  reset role;

  -- Lectura: ve operaciones, no ve Caja ni puede escribir
  perform set_config('request.jwt.claim.sub', lect_id::text, true);
  set local role authenticated;
  select count(*) into n from operaciones;
  perform t.ok(n > 0, 'lectura ve operaciones');
  select count(*) into n from movimientos;
  perform t.igual(n, 0::bigint, 'lectura no ve Caja');
  perform t.falla('insert into terceros (razon_social) values (''Nuevo'')', 'row-level security', 'lectura no escribe');
  reset role;

  -- Operador: carga operaciones pero no toca tesorería
  perform set_config('request.jwt.claim.sub', oper_id::text, true);
  set local role authenticated;
  insert into terceros (razon_social) values ('Cliente del operador');
  perform t.falla(format('insert into movimientos (cuenta_id, importe, concepto) values (%L, 1, ''x'')',
                         (select id from cuentas_tesoreria limit 1)), 'row-level security', 'operador no carga movimientos');
  reset role;

  -- Admin: ve todo, incluida la auditoría
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  select count(*) into n from movimientos;
  perform t.ok(n > 0, 'admin ve Caja');
  update operaciones set precio_venta = 35600 where id = op;
  select count(*) into n from auditoria where tabla = 'operaciones' and registro_id = op::text
     and accion = 'UPDATE' and usuario_id = admin_id
     and valor_anterior->>'precio_venta' = '35500.00' and valor_nuevo->>'precio_venta' = '35600.00';
  perform t.igual(n, 1::bigint, 'auditoría registra quién, qué, antes y después');
  reset role;

  -- Anónimo: nada
  set local role anon;
  perform t.falla('select count(*) from operaciones', 'permission denied', 'anónimo sin acceso');
  reset role;
end $$;
