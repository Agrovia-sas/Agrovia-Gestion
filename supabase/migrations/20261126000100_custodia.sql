-- =====================================================================
-- AGROVIA SAS — Bolsas en custodia (26/11/2026)
-- Bolsas de un cliente que AGROVIA guarda y mueve. AGROVIA puede usarlas
-- para vender (la venta es de AGROVIA) y queda debiéndole bolsas al dueño,
-- que se reponen en bolsas o se pagan en plata.
--   físicas en mi poder = ingresos + reposiciones − entregas − retiros (± traslados)
--   bolsas a reponer    = entregas − reposiciones − pagadas en plata
-- =====================================================================

create type tipo_mov_custodia as enum ('ingreso', 'traslado', 'entrega', 'reposicion', 'pago_plata', 'retiro');

create table custodia_movimientos (
  id                  uuid primary key default gen_random_uuid(),
  fecha               date not null default current_date,
  dueno_id            uuid not null references terceros(id),
  tipo                tipo_mov_custodia not null,
  bolsas              integer not null check (bolsas > 0),
  marca_id            uuid references marcas(id),
  desde_ingenio_id    uuid references ingenios(id),
  desde_deposito_id   uuid references depositos(id),
  hacia_ingenio_id    uuid references ingenios(id),
  hacia_deposito_id   uuid references depositos(id),
  destinatario_id     uuid references terceros(id),       -- a quién se entregó (entregas manuales)
  operacion_id        uuid references operaciones(id),
  carga_id            uuid unique references cargas(id) on delete cascade,
  importe             numeric(18,2) check (importe is null or importe > 0),  -- pago en plata
  remito              text,
  chofer              text,
  patente             text,
  observaciones       text,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  check (desde_ingenio_id is null or desde_deposito_id is null),
  check (hacia_ingenio_id is null or hacia_deposito_id is null),
  check (tipo <> 'traslado' or (coalesce(desde_ingenio_id, desde_deposito_id) is not null
                                and coalesce(hacia_ingenio_id, hacia_deposito_id) is not null
                                and coalesce(desde_ingenio_id, desde_deposito_id) <> coalesce(hacia_ingenio_id, hacia_deposito_id))),
  check (tipo <> 'pago_plata' or importe is not null)
);
create index custodia_mov_dueno_idx on custodia_movimientos (dueno_id, fecha);

alter table operaciones add column bolsas_en_custodia boolean not null default false;
alter table operaciones add constraint operaciones_custodia_check
  check (not bolsas_en_custodia or modalidad in ('menudeo', 'compraventa'));

-- Lugar de un movimiento (ingenio o depósito) como una sola clave
create or replace function custodia_lugar(p_ingenio uuid, p_deposito uuid)
returns uuid language sql immutable set search_path = public as $$ select coalesce(p_ingenio, p_deposito); $$;

-- Saldos físicos por dueño y lugar
create view v_custodia_fisicas with (security_invoker = true) as
select dueno_id, lugar_id, sum(bolsas)::integer as bolsas
from (
  select dueno_id, custodia_lugar(hacia_ingenio_id, hacia_deposito_id) as lugar_id, bolsas
    from custodia_movimientos where tipo in ('ingreso', 'traslado', 'reposicion')
  union all
  select dueno_id, custodia_lugar(desde_ingenio_id, desde_deposito_id), -bolsas
    from custodia_movimientos where tipo in ('traslado', 'entrega', 'retiro')
) x
group by dueno_id, lugar_id
having sum(bolsas) <> 0;

-- Resumen por dueño
create view v_custodia_saldos with (security_invoker = true) as
select t.id as dueno_id, t.razon_social as dueno,
       coalesce(sum(case when m.tipo in ('ingreso', 'reposicion') then m.bolsas
                         when m.tipo in ('entrega', 'retiro') then -m.bolsas else 0 end), 0)::integer as fisicas,
       coalesce(sum(case when m.tipo = 'entrega' then m.bolsas
                         when m.tipo in ('reposicion', 'pago_plata') then -m.bolsas else 0 end), 0)::integer as a_reponer,
       coalesce(sum(m.importe) filter (where m.tipo = 'pago_plata'), 0) as pagado_en_plata,
       max(m.fecha) as ultimo_movimiento
  from terceros t
  join custodia_movimientos m on m.dueno_id = t.id
 group by t.id;

-- Reglas: no se saca de un lugar más de lo que hay; no se repone más de lo que se debe
create or replace function fn_custodia_check()
returns trigger language plpgsql set search_path = public, auth as $$
declare
  v_lugar uuid;
  v_hay integer;
  v_debe integer;
begin
  if tg_op = 'UPDATE' and old.carga_id is null and not es_escritura_interna() then
    raise exception 'Un movimiento de custodia no se edita: borralo y cargalo de nuevo';
  end if;
  perform pg_advisory_xact_lock(hashtext('custodia:' || new.dueno_id::text));

  if new.tipo in ('traslado', 'entrega', 'retiro') then
    v_lugar := custodia_lugar(new.desde_ingenio_id, new.desde_deposito_id);
    select coalesce(sum(bolsas), 0) into v_hay from v_custodia_fisicas
     where dueno_id = new.dueno_id and lugar_id is not distinct from v_lugar;
    if tg_op = 'UPDATE' and custodia_lugar(old.desde_ingenio_id, old.desde_deposito_id) is not distinct from v_lugar then
      v_hay := v_hay + old.bolsas;
    end if;
    if new.bolsas > v_hay then
      raise exception 'De % hay % bolsas en %, no alcanzan para sacar %',
        (select razon_social from terceros where id = new.dueno_id), v_hay,
        coalesce((select 'el ingenio ' || nombre from ingenios where id = new.desde_ingenio_id),
                 (select 'el depósito ' || nombre from depositos where id = new.desde_deposito_id), 'ese lugar'),
        new.bolsas
        using hint = 'Revisá desde dónde salen o registrá primero el ingreso de esas bolsas en Bolsas en custodia';
    end if;
  end if;

  if new.tipo in ('reposicion', 'pago_plata') then
    select a_reponer into v_debe from v_custodia_saldos where dueno_id = new.dueno_id;
    if new.bolsas > coalesce(v_debe, 0) then
      raise exception 'A % se le deben % bolsas: no se puede reponer o pagar %',
        (select razon_social from terceros where id = new.dueno_id), coalesce(v_debe, 0), new.bolsas;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_custodia_check before insert or update on custodia_movimientos
  for each row execute function fn_custodia_check();

-- No se cambia la marca de custodia de una operación que ya tiene cargas
create or replace function fn_operaciones_custodia_check()
returns trigger language plpgsql set search_path = public, auth as $$
begin
  if new.bolsas_en_custodia is distinct from old.bolsas_en_custodia and old.bolsas_cargadas > 0 then
    raise exception 'La operación % ya tiene cargas: no se puede cambiar si las bolsas son en custodia', old.numero;
  end if;
  if new.bolsas_en_custodia and new.vendedor_id is distinct from old.vendedor_id and old.bolsas_cargadas > 0 then
    raise exception 'La operación % ya tiene cargas: no se puede cambiar el dueño de las bolsas', old.numero;
  end if;
  return new;
end;
$$;
create trigger trg_operaciones_custodia_check before update on operaciones
  for each row execute function fn_operaciones_custodia_check();

-- Si se marca/desmarca custodia antes de cargar, se ajustan stock y deuda
create or replace function fn_operaciones_custodia_after()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.bolsas_en_custodia is distinct from old.bolsas_en_custodia then
    if new.bolsas_en_custodia then
      delete from stock_movimientos where operacion_id = new.id and tipo = 'entrada_compra';
    else
      insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                     deposito_id, bolsas, costo_unitario, operacion_id)
      values (new.fecha_cierre, 'entrada_compra', new.producto_id, new.marca_id, new.ubicacion_tipo,
              new.ingenio_id, new.deposito_id, new.bolsas_negociadas + new.bolsas_ajustes, new.precio_compra, new.id);
    end if;
    perform sincronizar_obligaciones_operacion(new.id);
  end if;
  return new;
end;
$$;
create trigger trg_operaciones_custodia_after after update on operaciones
  for each row execute function fn_operaciones_custodia_after();

-- Funciones existentes, ahora con custodia
create or replace function fn_operaciones_after_insert()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_comision_id uuid;
begin
  perform set_interno(true);
  insert into comisiones (operacion_id) values (new.id) returning id into v_comision_id;
  perform set_interno(false);

  if new.comisionista_id is not null then
    insert into comision_participantes (comision_id, tercero_id, tipo, valor, motivo)
    values (v_comision_id, new.comisionista_id, 'porcentaje', 50, 'Comisionista de la operación');
  end if;

  -- Bolsas en custodia: no son stock de AGROVIA
  if new.modalidad in ('menudeo', 'compraventa') and not new.bolsas_en_custodia then
    insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                   deposito_id, bolsas, costo_unitario, operacion_id)
    values (new.fecha_cierre, 'entrada_compra', new.producto_id, new.marca_id, new.ubicacion_tipo,
            new.ingenio_id, new.deposito_id, new.bolsas_negociadas, new.precio_compra, new.id);
  end if;

  perform recalcular_comision(new.id);
  return new;
end;
$$;

create or replace function fn_ajustes_after()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  o operaciones;
begin
  select * into o from operaciones where id = new.operacion_id;
  if o.modalidad in ('menudeo', 'compraventa') and not o.bolsas_en_custodia then
    insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                   deposito_id, bolsas, costo_unitario, operacion_id, ajuste_id, motivo)
    values (new.fecha, 'entrada_compra', o.producto_id, o.marca_id, o.ubicacion_tipo, o.ingenio_id,
            o.deposito_id, new.delta_bolsas, o.precio_compra, o.id, new.id, new.motivo);
  end if;
  perform recalcular_logistica(new.operacion_id);
  return new;
end;
$$;

create or replace function fn_cargas_after()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  o operaciones;
begin
  select * into o from operaciones where id = coalesce(new.operacion_id, old.operacion_id);

  -- Stock: en Menudeo y Compra-venta la carga descuenta stock propio
  if o.modalidad in ('menudeo', 'compraventa') and not o.bolsas_en_custodia then
    delete from stock_movimientos where carga_id = coalesce(new.id, old.id);
    if tg_op <> 'DELETE' and not new.es_apertura then
      insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                     deposito_id, bolsas, operacion_id, carga_id)
      values (new.fecha, 'salida_carga', o.producto_id, o.marca_id, new.ubicacion_tipo,
              new.ingenio_id, new.deposito_id, -new.bolsas, o.id, new.id);
    end if;
  end if;

  -- Bolsas en custodia: cada carga es una entrega de bolsas del dueño (vendedor),
  -- que AGROVIA le queda debiendo
  if o.bolsas_en_custodia then
    delete from custodia_movimientos where carga_id = coalesce(new.id, old.id);
    if tg_op <> 'DELETE' then
      insert into custodia_movimientos (fecha, dueno_id, tipo, bolsas, marca_id, desde_ingenio_id, desde_deposito_id,
                                        operacion_id, carga_id, remito, chofer, patente, observaciones)
      values (new.fecha, o.vendedor_id, 'entrega', new.bolsas, o.marca_id, new.ingenio_id, new.deposito_id,
              o.id, new.id, new.remito, new.chofer, new.patente, 'Carga de la operación ' || o.numero);
    end if;
  end if;

  perform recalcular_logistica(o.id);
  return coalesce(new, old);
end;
$$;

create or replace function sincronizar_obligaciones_operacion(p_operacion_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  o operaciones;
  v_bolsas integer;
  v_tipo_compra tipo_obligacion;
  v_tipo_venta tipo_obligacion;
  ob obligaciones;
begin
  select * into o from operaciones where id = p_operacion_id;
  if o.modalidad = 'facturado' then
    return;
  end if;
  v_tipo_compra := case o.modalidad when 'menudeo' then 'compra_sin_factura' else 'liquido_producto' end;
  v_tipo_venta  := case o.modalidad when 'menudeo' then 'venta_sin_factura' else 'factura' end;
  v_bolsas := o.bolsas_negociadas;  -- los ajustes generan sus propias obligaciones

  perform set_interno(true);
  -- Deuda con el productor (si las bolsas son suyas en custodia, la deuda es en bolsas:
  -- se lleva en custodia_movimientos y no se genera deuda en pesos)
  if o.bolsas_en_custodia then
    update obligaciones set anulada = true, motivo_anulacion = 'Bolsas en custodia: la deuda con el dueño es en bolsas'
     where operacion_id = o.id and sentido = 'pagar' and ajuste_id is null and not anulada
       and obligacion_aplicado(id) = 0;
  else
    select * into ob from obligaciones
     where operacion_id = o.id and ajuste_id is null and sentido = 'pagar' and tipo = v_tipo_compra;
    -- Si estaba anulada solo por custodia, vuelve a valer
    if ob.id is not null and ob.anulada and ob.motivo_anulacion like 'Bolsas en custodia%' then
      update obligaciones set anulada = false, motivo_anulacion = null where id = ob.id;
      ob.anulada := false;
    end if;
    if ob.id is null then
      insert into obligaciones (sentido, tipo, tercero_id, operacion_id, importe, fecha, concepto)
      values ('pagar', v_tipo_compra, o.vendedor_id, o.id, importe_operacion(o, o.precio_compra, v_bolsas),
              o.fecha_cierre, 'Compra operación ' || o.numero);
    elsif ob.importe <> importe_operacion(o, o.precio_compra, v_bolsas) and not ob.anulada then
      update obligaciones set importe = importe_operacion(o, o.precio_compra, v_bolsas) where id = ob.id;
    end if;
  end if;

  -- Crédito con el comprador (cuando ya hay venta)
  if o.comprador_id is not null and o.precio_venta is not null then
    select * into ob from obligaciones
     where operacion_id = o.id and ajuste_id is null and sentido = 'cobrar' and tipo = v_tipo_venta;
    if ob.id is null then
      insert into obligaciones (sentido, tipo, tercero_id, operacion_id, importe, fecha, concepto)
      values ('cobrar', v_tipo_venta, o.comprador_id, o.id, importe_operacion(o, o.precio_venta, v_bolsas),
              o.fecha_cierre, 'Venta operación ' || o.numero);
    elsif ob.tercero_id <> o.comprador_id then
      raise exception 'La venta de la operación % ya tiene obligaciones con otro comprador', o.numero;
    elsif ob.importe <> importe_operacion(o, o.precio_venta, v_bolsas) and not ob.anulada then
      update obligaciones set importe = importe_operacion(o, o.precio_venta, v_bolsas) where id = ob.id;
    end if;
  end if;

  -- Cancelación: se anulan las obligaciones sin aplicaciones
  if o.estado_comercial = 'cancelada' then
    if exists (select 1 from obligaciones where operacion_id = o.id and not anulada
                and obligacion_aplicado(id) > 0) then
      raise exception 'La operación % tiene cobros o pagos aplicados: anulalos antes de cancelarla', o.numero;
    end if;
    update obligaciones set anulada = true, motivo_anulacion = 'Operación cancelada: ' || o.motivo_cancelacion
     where operacion_id = o.id and not anulada and comision_id is null;
  end if;
  perform set_interno(false);
end;
$$;

create or replace function fn_ajustes_obligaciones()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  o operaciones;
  v_n integer := abs(new.delta_bolsas);
  v_amplia boolean := new.delta_bolsas > 0;
begin
  select * into o from operaciones where id = new.operacion_id;
  if o.modalidad = 'facturado' then
    return new;
  end if;
  -- Productor: ampliación = más deuda; reducción = nota de crédito a nuestro favor
  -- (en custodia la deuda con el dueño es en bolsas: no va en pesos)
  if not o.bolsas_en_custodia then
  insert into obligaciones (sentido, tipo, tercero_id, operacion_id, ajuste_id, importe, fecha, concepto)
  values (case when v_amplia then 'pagar' else 'cobrar' end::sentido_obligacion,
          case when v_amplia then 'nota_debito' else 'nota_credito' end::tipo_obligacion,
          o.vendedor_id, o.id, new.id, importe_operacion(o, o.precio_compra, v_n), new.fecha,
          'Ajuste de ' || new.delta_bolsas || ' bolsas (compra) op. ' || o.numero || ': ' || new.motivo);
  end if;
  if o.comprador_id is not null and o.precio_venta is not null then
    insert into obligaciones (sentido, tipo, tercero_id, operacion_id, ajuste_id, importe, fecha, concepto)
    values (case when v_amplia then 'cobrar' else 'pagar' end::sentido_obligacion,
            case when v_amplia then 'nota_debito' else 'nota_credito' end::tipo_obligacion,
            o.comprador_id, o.id, new.id, importe_operacion(o, o.precio_venta, v_n), new.fecha,
            'Ajuste de ' || new.delta_bolsas || ' bolsas (venta) op. ' || o.numero || ': ' || new.motivo);
  end if;
  return new;
end;
$$;

-- Al desmarcar custodia, la deuda en pesos con el productor vuelve a existir
-- (sincronizar la crea si falta, o reactiva una anulada por custodia).

select auditar_tabla('custodia_movimientos');

alter table custodia_movimientos enable row level security;
create policy lectura on custodia_movimientos for select to authenticated using (es_usuario_activo());
create policy escritura on custodia_movimientos for all to authenticated
  using (tiene_rol('admin', 'operador')) with check (tiene_rol('admin', 'operador'));
grant select, insert, update, delete on custodia_movimientos to authenticated;
grant select on v_custodia_fisicas, v_custodia_saldos to authenticated;
revoke all on custodia_movimientos, v_custodia_fisicas, v_custodia_saldos from anon;
revoke execute on function fn_custodia_check(), fn_operaciones_custodia_check(), fn_operaciones_custodia_after() from public, anon, authenticated;
revoke execute on function fn_cargas_after(), fn_ajustes_after(), fn_operaciones_after_insert(), fn_ajustes_obligaciones() from public, anon, authenticated;
revoke execute on function sincronizar_obligaciones_operacion(uuid) from authenticated;
