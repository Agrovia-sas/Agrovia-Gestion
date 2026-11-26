-- =====================================================================
-- AGROVIA SAS — Tesorería: cobros, pagos y gastos en un solo paso, y arqueos
-- Las reglas siguen en los triggers; estas funciones solo agrupan en una
-- transacción lo que la pantalla registra junto. Corren con los permisos
-- del usuario (security invoker): se aplican las reglas por rol.
-- =====================================================================

-- Registra un movimiento confirmado con sus aplicaciones y, si es un gasto, el gasto.
-- p = {cuenta_id, fecha, importe (+ ingreso / − egreso), medio, concepto, tercero_id, operacion_id,
--      aplicaciones: [{obligacion_id, importe, iva_facturado, factura_numero}],
--      gasto: {categoria_id, descripcion, importe_neto, iva, otros_impuestos, proveedor_id, numero_factura}}
create or replace function registrar_movimiento(p jsonb)
returns uuid language plpgsql security invoker set search_path = public, auth as $$
declare
  v_mov uuid;
  a jsonb;
  g jsonb := p->'gasto';
  v_total_gasto numeric;
begin
  insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id, operacion_id, estado)
  values ((p->>'cuenta_id')::uuid, coalesce((p->>'fecha')::date, current_date), (p->>'importe')::numeric,
          coalesce(p->>'medio', 'efectivo')::medio_pago, p->>'concepto',
          nullif(p->>'tercero_id', '')::uuid, nullif(p->>'operacion_id', '')::uuid, 'confirmado')
  returning id into v_mov;

  for a in select * from jsonb_array_elements(coalesce(p->'aplicaciones', '[]'::jsonb)) loop
    if coalesce((a->>'importe')::numeric, 0) > 0 then
      insert into aplicaciones (obligacion_id, origen, movimiento_id, importe, iva_facturado, factura_numero, fecha)
      values ((a->>'obligacion_id')::uuid, 'movimiento', v_mov, (a->>'importe')::numeric,
              coalesce((a->>'iva_facturado')::numeric, 0), nullif(a->>'factura_numero', ''),
              coalesce((p->>'fecha')::date, current_date));
    end if;
  end loop;

  if g is not null and jsonb_typeof(g) = 'object' then
    if (p->>'importe')::numeric >= 0 then
      raise exception 'Un gasto tiene que ser un egreso';
    end if;
    v_total_gasto := coalesce((g->>'importe_neto')::numeric, 0) + coalesce((g->>'iva')::numeric, 0) + coalesce((g->>'otros_impuestos')::numeric, 0);
    if v_total_gasto <> abs((p->>'importe')::numeric) then
      raise exception 'El gasto (neto + IVA + otros = %) no coincide con lo que salió de la cuenta (%)', v_total_gasto, abs((p->>'importe')::numeric);
    end if;
    insert into gastos (fecha, categoria_id, proveedor_id, operacion_id, descripcion, importe_neto, iva, otros_impuestos,
                        numero_factura, forma, movimiento_id)
    values (coalesce((p->>'fecha')::date, current_date), (g->>'categoria_id')::uuid, nullif(g->>'proveedor_id', '')::uuid,
            nullif(p->>'operacion_id', '')::uuid, coalesce(nullif(g->>'descripcion', ''), p->>'concepto'),
            coalesce((g->>'importe_neto')::numeric, 0), coalesce((g->>'iva')::numeric, 0), coalesce((g->>'otros_impuestos')::numeric, 0),
            nullif(g->>'numero_factura', ''), 'pagado', v_mov);
  end if;
  return v_mov;
end;
$$;

-- Arqueos de caja: lo contado contra lo que dice el sistema
create table arqueos (
  id                    uuid primary key default gen_random_uuid(),
  cuenta_id             uuid not null references cuentas_tesoreria(id),
  fecha                 date not null default current_date,
  contado               numeric(18,2) not null check (contado >= 0),
  saldo_sistema         numeric(18,2) not null,
  diferencia            numeric(18,2) generated always as (contado - saldo_sistema) stored,
  movimiento_ajuste_id  uuid references movimientos(id),
  observaciones         text,
  created_by            uuid default auth.uid(),
  created_at            timestamptz not null default now()
);

create or replace function registrar_arqueo(p_cuenta uuid, p_contado numeric, p_ajustar boolean default false,
  p_observaciones text default null, p_fecha date default current_date)
returns uuid language plpgsql security invoker set search_path = public, auth as $$
declare
  v_saldo numeric;
  v_mov uuid;
  v_id uuid;
begin
  select saldo into v_saldo from v_saldos_cuentas where cuenta_id = p_cuenta;
  if p_ajustar and p_contado <> v_saldo then
    insert into movimientos (cuenta_id, fecha, importe, medio, concepto, estado)
    values (p_cuenta, p_fecha, p_contado - v_saldo, 'efectivo',
            'Diferencia de arqueo' || coalesce(': ' || nullif(btrim(p_observaciones), ''), ''), 'confirmado')
    returning id into v_mov;
  end if;
  insert into arqueos (cuenta_id, fecha, contado, saldo_sistema, movimiento_ajuste_id, observaciones)
  values (p_cuenta, p_fecha, p_contado, v_saldo, v_mov, p_observaciones)
  returning id into v_id;
  return v_id;
end;
$$;

select auditar_tabla('arqueos');
alter table arqueos enable row level security;
create policy acceso on arqueos for all to authenticated
  using (tiene_rol('admin', 'finanzas')) with check (tiene_rol('admin', 'finanzas'));
grant select, insert on arqueos to authenticated;
revoke all on arqueos from anon;
revoke execute on function registrar_movimiento(jsonb), registrar_arqueo(uuid, numeric, boolean, text, date) from public, anon;
grant execute on function registrar_movimiento(jsonb), registrar_arqueo(uuid, numeric, boolean, text, date) to authenticated;
