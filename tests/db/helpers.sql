-- Ayudas para las pruebas (solo en la base de pruebas)
create schema if not exists t;

create or replace function t.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'PRUEBA FALLIDA: %', p_msg;
  end if;
end;
$$;

create or replace function t.igual(p_real anyelement, p_esperado anyelement, p_msg text) returns void language plpgsql as $$
begin
  if p_real is distinct from p_esperado then
    raise exception 'PRUEBA FALLIDA: % (esperado %, obtenido %)', p_msg, p_esperado, p_real;
  end if;
end;
$$;

-- Verifica que una sentencia falle con un mensaje que contenga p_parte
create or replace function t.falla(p_sql text, p_parte text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(lower(p_parte) in lower(sqlerrm)) = 0 then
      raise exception 'PRUEBA FALLIDA: % (falló, pero con otro mensaje: %)', p_msg, sqlerrm;
    end if;
    return;
  end;
  raise exception 'PRUEBA FALLIDA: % (se esperaba un error y no hubo)', p_msg;
end;
$$;

-- Datos base: terceros y ubicaciones
create or replace function t.tercero(p_nombre text) returns uuid language sql as $$
  insert into terceros (razon_social) values (p_nombre)
  on conflict ((lower(btrim(razon_social)))) do update set razon_social = excluded.razon_social
  returning id;
$$;

create or replace function t.cuenta(p_nombre text) returns uuid language sql stable as $$
  select id from cuentas_tesoreria where nombre = p_nombre;
$$;

create or replace function t.saldo(p_cuenta text) returns numeric language sql stable as $$
  select saldo from v_saldos_cuentas where nombre = p_cuenta;
$$;

-- Crea una operación con valores habituales
create or replace function t.operacion(p_modalidad modalidad_operacion, p_bolsas integer,
  p_compra numeric, p_venta numeric, p_vendedor text default 'EL BAJO SRL', p_comprador text default 'LODISER')
returns uuid language sql as $$
  insert into operaciones (modalidad, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta)
  values (p_modalidad, t.tercero(p_vendedor), t.tercero(p_comprador), p_bolsas, p_compra, p_venta)
  returning id;
$$;

create or replace function t.cargar(p_op uuid, p_bolsas integer, p_remito text default null)
returns uuid language sql as $$
  insert into cargas (operacion_id, bolsas, remito) values (p_op, p_bolsas, p_remito) returning id;
$$;

create or replace function t.comision(p_op uuid) returns comisiones language sql stable as $$
  select * from comisiones where operacion_id = p_op;
$$;

create or replace function t.obl_comision(p_op uuid) returns uuid language sql stable as $$
  select o.id from obligaciones o join comisiones c on c.id = o.comision_id where c.operacion_id = p_op;
$$;

-- Ingreso o egreso confirmado
create or replace function t.mov(p_cuenta text, p_importe numeric, p_tercero text default null)
returns uuid language sql as $$
  insert into movimientos (cuenta_id, importe, concepto, tercero_id)
  values (t.cuenta(p_cuenta), p_importe, 'Prueba', case when p_tercero is not null then t.tercero(p_tercero) end)
  returning id;
$$;

create or replace function t.cheque(p_numero text, p_importe numeric, p_de text) returns uuid language sql as $$
  insert into cheques (origen, numero, banco, entregado_por_id, importe, fecha_pago, estado)
  values ('recibido', p_numero, 'Galicia', t.tercero(p_de), p_importe, current_date + 30, 'en_cartera')
  returning id;
$$;

grant usage on schema t to anon, authenticated;
grant execute on all functions in schema t to anon, authenticated;
