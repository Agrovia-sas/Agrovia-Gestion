-- =====================================================================
-- AGROVIA SAS — Gestión financiera
-- Regla madre: obligaciones = lo que alguien debe; movimientos = lo que
-- efectivamente se movió en Galicia o Caja; aplicaciones = qué cancela qué.
-- Los saldos salen siempre de sumar, nunca se tipean.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cuentas de tesorería
-- ---------------------------------------------------------------------
create table cuentas_tesoreria (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null unique,
  tipo                 text not null check (tipo in ('banco', 'caja')),
  banco                text,
  numero               text,
  saldo_inicial        numeric(18,2) not null default 0,
  fecha_saldo_inicial  date,
  activa               boolean not null default true,
  created_at           timestamptz not null default now()
);
insert into cuentas_tesoreria (nombre, tipo, banco) values
  ('Banco Galicia', 'banco', 'Galicia'),
  ('Caja efectivo', 'caja', null);

-- ---------------------------------------------------------------------
-- Obligaciones: lo que alguien debe
-- ---------------------------------------------------------------------
create type sentido_obligacion as enum ('cobrar', 'pagar');
create type tipo_obligacion as enum (
  'factura', 'liquido_producto', 'venta_sin_factura', 'compra_sin_factura',
  'comision', 'nota_debito', 'nota_credito', 'saldo_inicial', 'otro');

create table obligaciones (
  id                  uuid primary key default gen_random_uuid(),
  sentido             sentido_obligacion not null,
  tipo                tipo_obligacion not null,
  tercero_id          uuid not null references terceros(id),
  operacion_id        uuid references operaciones(id),
  comision_id         uuid unique references comisiones(id),
  ajuste_id           uuid references operacion_ajustes(id),
  gasto_id            uuid,
  importe             numeric(18,2) not null check (importe > 0),
  fecha               date not null default current_date,
  vencimiento         date,
  exigible            boolean not null default true,
  concepto            text not null,
  numero_comprobante  text,
  anulada             boolean not null default false,
  motivo_anulacion    text,
  created_by          uuid default auth.uid(),
  created_at          timestamptz not null default now(),
  check (not anulada or motivo_anulacion is not null)
);
create index obligaciones_tercero_idx on obligaciones (tercero_id);
create index obligaciones_op_idx on obligaciones (operacion_id);

-- ---------------------------------------------------------------------
-- Movimientos: libro inmutable de Galicia y Caja
-- ---------------------------------------------------------------------
create type estado_movimiento as enum ('borrador', 'confirmado', 'revertido');
create type medio_pago as enum ('transferencia', 'efectivo', 'cheque', 'echeq', 'debito_automatico', 'tarjeta', 'otro');

create table movimientos (
  id                 uuid primary key default gen_random_uuid(),
  cuenta_id          uuid not null references cuentas_tesoreria(id),
  fecha              date not null default current_date,
  importe            numeric(18,2) not null check (importe <> 0),  -- + ingreso, − egreso
  medio              medio_pago not null default 'transferencia',
  concepto           text not null check (length(btrim(concepto)) > 0),
  tercero_id         uuid references terceros(id),
  operacion_id       uuid references operaciones(id),
  estado             estado_movimiento not null default 'confirmado',
  revierte_a         uuid unique references movimientos(id),
  motivo_reversion   text,
  par_transferencia  uuid references movimientos(id),
  cheque_id          uuid,   -- movimiento generado por acreditación, débito o descuento de cheque
  extracto_linea_id  uuid,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  check (revierte_a is null or motivo_reversion is not null)
);
create index movimientos_cuenta_fecha_idx on movimientos (cuenta_id, fecha);
create index movimientos_tercero_idx on movimientos (tercero_id);

create or replace function fn_movimientos_proteger()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.estado <> 'borrador' then
      raise exception 'Un movimiento confirmado no se borra: se revierte con un contramovimiento';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.estado = 'revertido' then
      raise exception 'Un movimiento no puede nacer revertido';
    end if;
    return new;
  end if;
  -- UPDATE
  if old.estado = 'borrador' then
    if new.estado = 'revertido' then
      raise exception 'Un borrador no se revierte: se borra';
    end if;
    return new;
  end if;
  if old.estado = 'confirmado' and new.estado = 'revertido' and es_escritura_interna()
     and (new.cuenta_id, new.fecha, new.importe, new.concepto)
         is not distinct from (old.cuenta_id, old.fecha, old.importe, old.concepto) then
    return new;
  end if;
  if es_escritura_interna() and old.estado = new.estado
     and (new.cuenta_id, new.fecha, new.importe) is not distinct from (old.cuenta_id, old.fecha, old.importe) then
    return new;  -- vínculos internos (par de transferencia, línea de extracto)
  end if;
  raise exception 'Un movimiento confirmado no se edita: revertilo con motivo y cargalo de nuevo';
end;
$$;

create trigger trg_movimientos_proteger
  before insert or update or delete on movimientos
  for each row execute function fn_movimientos_proteger();

-- ---------------------------------------------------------------------
-- Anticipos (entregados o recibidos, saldo sin aplicar)
-- ---------------------------------------------------------------------
create table anticipos (
  id             uuid primary key default gen_random_uuid(),
  sentido        text not null check (sentido in ('recibido', 'entregado')),
  tercero_id     uuid not null references terceros(id),
  movimiento_id  uuid not null references movimientos(id),
  importe        numeric(18,2) not null check (importe > 0),
  fecha          date not null default current_date,
  concepto       text,
  anulado        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Cheques y eCheqs
-- ---------------------------------------------------------------------
create type estado_cheque as enum (
  'en_cartera', 'endosado', 'depositado', 'acreditado', 'descontado',
  'rechazado', 'emitido', 'debitado', 'anulado');

create table cheques (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null default 'echeq' check (tipo in ('echeq', 'fisico')),
  origen             text not null check (origen in ('recibido', 'emitido')),
  numero             text not null,
  banco              text,
  librador           text,
  cuit_librador      text,
  entregado_por_id   uuid references terceros(id),   -- quién nos lo dio
  beneficiario_id    uuid references terceros(id),   -- a quién se endosó o emitió
  importe            numeric(18,2) not null check (importe > 0),
  fecha_emision      date,
  fecha_pago         date not null,
  fecha_recepcion    date default current_date,
  estado             estado_cheque not null,
  cuenta_id          uuid references cuentas_tesoreria(id),  -- dónde se deposita / desde dónde se emite
  operacion_id       uuid references operaciones(id),
  observaciones      text,
  created_at         timestamptz not null default now(),
  check ((origen = 'recibido' and entregado_por_id is not null) or (origen = 'emitido' and beneficiario_id is not null))
);
create unique index cheques_numero_idx on cheques (origen, coalesce(banco, ''), numero);
alter table movimientos add constraint movimientos_cheque_fk foreign key (cheque_id) references cheques(id);

create table cheque_eventos (
  id               bigint generated always as identity primary key,
  cheque_id        uuid not null references cheques(id),
  estado_anterior  estado_cheque,
  estado_nuevo     estado_cheque not null,
  fecha            date not null default current_date,
  nota             text,
  usuario_id       uuid default auth.uid(),
  created_at       timestamptz not null default now()
);

create table descuentos_cheque (
  id               uuid primary key default gen_random_uuid(),
  cheque_id        uuid not null unique references cheques(id),
  fecha            date not null default current_date,
  cuenta_id        uuid not null references cuentas_tesoreria(id),
  entidad          text not null,
  tasa_mensual     numeric(8,4) not null check (tasa_mensual >= 0),  -- % mensual
  dias             integer not null check (dias >= 0),
  dias_clearing    integer not null default 0 check (dias_clearing >= 0),
  interes          numeric(18,2) not null,
  comisiones       numeric(18,2) not null default 0,
  iva_comisiones   numeric(18,2) not null default 0,
  costo_total      numeric(18,2) not null,
  neto             numeric(18,2) not null check (neto > 0),
  movimiento_id    uuid references movimientos(id),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Aplicaciones: qué movimiento, cheque, anticipo, compensación o
-- retención cancela qué obligación, y por cuánto. De acá salen los saldos.
-- ---------------------------------------------------------------------
create type origen_aplicacion as enum ('movimiento', 'cheque', 'anticipo', 'compensacion', 'retencion');

create table aplicaciones (
  id                        uuid primary key default gen_random_uuid(),
  obligacion_id             uuid not null references obligaciones(id),
  origen                    origen_aplicacion not null,
  movimiento_id             uuid references movimientos(id),
  cheque_id                 uuid references cheques(id),
  anticipo_id               uuid references anticipos(id),
  obligacion_compensada_id  uuid references obligaciones(id),
  retencion_tipo            text check (retencion_tipo in ('IIBB', 'Ganancias', 'IVA', 'SUSS', 'Otra')),
  retencion_certificado     text,
  importe                   numeric(18,2) not null check (importe > 0),
  iva_facturado             numeric(18,2) not null default 0 check (iva_facturado >= 0),  -- IVA cobrado con factura (no es ingreso)
  factura_numero            text,
  fecha                     date not null default current_date,
  anulada                   boolean not null default false,
  motivo_anulacion          text,
  anulada_at                timestamptz,
  created_by                uuid default auth.uid(),
  created_at                timestamptz not null default now(),
  check (
    (origen = 'movimiento'   and movimiento_id is not null and cheque_id is null and anticipo_id is null and obligacion_compensada_id is null) or
    (origen = 'cheque'       and cheque_id is not null and movimiento_id is null and anticipo_id is null and obligacion_compensada_id is null) or
    (origen = 'anticipo'     and anticipo_id is not null and movimiento_id is null and cheque_id is null and obligacion_compensada_id is null) or
    (origen = 'compensacion' and obligacion_compensada_id is not null and movimiento_id is null and cheque_id is null and anticipo_id is null) or
    (origen = 'retencion'    and retencion_tipo is not null and movimiento_id is null and cheque_id is null and anticipo_id is null and obligacion_compensada_id is null)
  ),
  check (not anulada or motivo_anulacion is not null),
  check (obligacion_compensada_id is distinct from obligacion_id)
);
create index aplicaciones_obl_idx on aplicaciones (obligacion_id) where not anulada;
create index aplicaciones_mov_idx on aplicaciones (movimiento_id) where not anulada;
create index aplicaciones_cheque_idx on aplicaciones (cheque_id) where not anulada;

-- Cuánto se aplicó a una obligación (incluye compensaciones que la usan)
create or replace function obligacion_aplicado(p_obligacion_id uuid)
returns numeric language sql stable as $$
  select coalesce(sum(importe), 0) from aplicaciones
   where not anulada and (obligacion_id = p_obligacion_id or obligacion_compensada_id = p_obligacion_id);
$$;

create or replace function obligacion_pendiente(p_obligacion_id uuid)
returns numeric language sql stable as $$
  select o.importe - obligacion_aplicado(o.id) from obligaciones o where o.id = p_obligacion_id;
$$;

-- Disponible de un movimiento para aplicar o convertir en anticipo
create or replace function movimiento_disponible(p_movimiento_id uuid)
returns numeric language sql stable as $$
  select abs(m.importe)
       - coalesce((select sum(a.importe + a.iva_facturado) from aplicaciones a
                    where a.movimiento_id = m.id and not a.anulada), 0)
       - coalesce((select sum(an.importe) from anticipos an
                    where an.movimiento_id = m.id and not an.anulado), 0)
    from movimientos m where m.id = p_movimiento_id;
$$;

create or replace function anticipo_disponible(p_anticipo_id uuid)
returns numeric language sql stable as $$
  select an.importe - coalesce((select sum(a.importe) from aplicaciones a
                                 where a.anticipo_id = an.id and not a.anulada), 0)
    from anticipos an where an.id = p_anticipo_id;
$$;

-- Usado de un cheque en un sentido (cobrar = recibido de un cliente; pagar = endosado o emitido)
create or replace function cheque_usado(p_cheque_id uuid, p_sentido sentido_obligacion)
returns numeric language sql stable as $$
  select coalesce(sum(a.importe + a.iva_facturado), 0)
    from aplicaciones a join obligaciones o on o.id = a.obligacion_id
   where a.cheque_id = p_cheque_id and not a.anulada and o.sentido = p_sentido;
$$;

create or replace function fn_aplicaciones_before()
returns trigger language plpgsql as $$
declare
  o obligaciones;
  oc obligaciones;
  m movimientos;
  ch cheques;
  an anticipos;
  v_pend numeric;
  v_total numeric := new.importe + new.iva_facturado;
begin
  if tg_op = 'DELETE' then
    raise exception 'Una aplicación no se borra: se anula con motivo';
  end if;
  if tg_op = 'UPDATE' then
    if old.anulada then
      raise exception 'La aplicación ya está anulada';
    end if;
    if new.anulada and (new.obligacion_id, new.origen, new.importe, new.iva_facturado, new.fecha)
        is not distinct from (old.obligacion_id, old.origen, old.importe, old.iva_facturado, old.fecha) then
      new.anulada_at := now();
      return new;
    end if;
    raise exception 'Una aplicación no se edita: anulala con motivo y registrala de nuevo';
  end if;

  -- INSERT
  select * into o from obligaciones where id = new.obligacion_id for update;
  if o.anulada then
    raise exception 'La obligación está anulada';
  end if;
  v_pend := o.importe - obligacion_aplicado(o.id);
  if new.importe > v_pend then
    raise exception 'No se puede aplicar % a una obligación con % pendiente', new.importe, v_pend;
  end if;

  if new.origen = 'movimiento' then
    select * into m from movimientos where id = new.movimiento_id for update;
    if m.estado <> 'confirmado' or m.revierte_a is not null then
      raise exception 'Solo se aplican movimientos confirmados que no sean reversiones';
    end if;
    if m.cheque_id is not null or m.par_transferencia is not null then
      raise exception 'Este movimiento (cheque o transferencia entre cuentas) no cancela obligaciones';
    end if;
    if (o.sentido = 'cobrar' and m.importe < 0) or (o.sentido = 'pagar' and m.importe > 0) then
      raise exception 'Un cobro tiene que ser un ingreso y un pago un egreso';
    end if;
    if v_total > movimiento_disponible(m.id) then
      raise exception 'El movimiento no tiene disponible suficiente (disponible: %)', movimiento_disponible(m.id);
    end if;

  elsif new.origen = 'cheque' then
    select * into ch from cheques where id = new.cheque_id for update;
    if ch.estado in ('rechazado', 'anulado') then
      raise exception 'El cheque % está %', ch.numero, ch.estado;
    end if;
    if o.sentido = 'cobrar' and ch.origen <> 'recibido' then
      raise exception 'Solo un cheque recibido cancela una cuenta a cobrar';
    end if;
    if v_total > ch.importe - cheque_usado(ch.id, o.sentido) then
      raise exception 'El cheque % no tiene disponible suficiente (disponible: %)',
        ch.numero, ch.importe - cheque_usado(ch.id, o.sentido);
    end if;

  elsif new.origen = 'anticipo' then
    select * into an from anticipos where id = new.anticipo_id for update;
    if an.anulado then
      raise exception 'El anticipo está anulado';
    end if;
    if an.tercero_id <> o.tercero_id then
      raise exception 'El anticipo es de otro tercero';
    end if;
    if (an.sentido = 'recibido') <> (o.sentido = 'cobrar') then
      raise exception 'Un anticipo recibido cancela cuentas a cobrar y uno entregado, cuentas a pagar';
    end if;
    if new.importe > anticipo_disponible(an.id) then
      raise exception 'El anticipo no tiene saldo suficiente (disponible: %)', anticipo_disponible(an.id);
    end if;

  elsif new.origen = 'compensacion' then
    select * into oc from obligaciones where id = new.obligacion_compensada_id for update;
    if oc.anulada or oc.tercero_id <> o.tercero_id or oc.sentido = o.sentido then
      raise exception 'Solo se compensan obligaciones vigentes, del mismo tercero y de sentido contrario';
    end if;
    if new.importe > oc.importe - obligacion_aplicado(oc.id) then
      raise exception 'La compensación supera lo pendiente de la otra obligación';
    end if;

  elsif new.origen = 'retencion' then
    if new.retencion_certificado is null then
      raise exception 'Una retención necesita número de certificado';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_aplicaciones_before
  before insert or update or delete on aplicaciones
  for each row execute function fn_aplicaciones_before();

-- Toda aplicación nueva o anulada recalcula la comisión de su operación
create or replace function fn_aplicaciones_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_op uuid;
begin
  for v_op in
    select distinct operacion_id from obligaciones
     where id in (new.obligacion_id, new.obligacion_compensada_id) and operacion_id is not null
  loop
    perform recalcular_comision(v_op);
  end loop;
  return new;
end;
$$;

create trigger trg_aplicaciones_after
  after insert or update on aplicaciones
  for each row execute function fn_aplicaciones_after();

-- Obligaciones: el importe nunca queda por debajo de lo aplicado
create or replace function fn_obligaciones_proteger()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una obligación no se borra: se anula con motivo';
  end if;
  if tg_op = 'UPDATE' then
    if new.importe < obligacion_aplicado(old.id) then
      raise exception 'El importe no puede quedar por debajo de lo ya cobrado o pagado (%)', obligacion_aplicado(old.id);
    end if;
    if new.anulada and not old.anulada and obligacion_aplicado(old.id) > 0 then
      raise exception 'No se anula una obligación con cobros o pagos aplicados: anulá primero las aplicaciones';
    end if;
    if old.anulada and not es_escritura_interna() then
      raise exception 'La obligación está anulada';
    end if;
    if (new.sentido, new.tercero_id) is distinct from (old.sentido, old.tercero_id) then
      raise exception 'El sentido y el tercero de una obligación no se cambian';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_obligaciones_proteger
  before update or delete on obligaciones
  for each row execute function fn_obligaciones_proteger();

-- ---------------------------------------------------------------------
-- Cobros de comisión: reemplaza la versión vacía de la migración comercial
-- Facturado: aplicaciones a la obligación de comisión.
-- Menudeo / Compra-venta: la utilidad se considera cobrada en la
-- proporción en que el comprador pagó la venta.
-- ---------------------------------------------------------------------
create or replace function comision_cobros(p_comision_id uuid, p_importe numeric,
  out cobrado numeric, out primera_fecha date, out ultima_fecha date)
language plpgsql stable as $$
declare
  v_modalidad modalidad_operacion;
  v_op uuid;
  v_total numeric;
  v_aplicado numeric;
begin
  select o.modalidad, o.id into v_modalidad, v_op
    from comisiones c join operaciones o on o.id = c.operacion_id where c.id = p_comision_id;

  if v_modalidad = 'facturado' then
    select coalesce(sum(a.importe), 0), min(a.fecha), max(a.fecha)
      into cobrado, primera_fecha, ultima_fecha
      from aplicaciones a join obligaciones ob on ob.id = a.obligacion_id
     where ob.comision_id = p_comision_id and not a.anulada;
    return;
  end if;

  select coalesce(sum(ob.importe), 0) into v_total
    from obligaciones ob
   where ob.operacion_id = v_op and ob.sentido = 'cobrar' and not ob.anulada
     and ob.tipo in ('factura', 'venta_sin_factura', 'nota_debito');
  select coalesce(sum(a.importe), 0), min(a.fecha), max(a.fecha)
    into v_aplicado, primera_fecha, ultima_fecha
    from aplicaciones a join obligaciones ob on ob.id = a.obligacion_id
   where ob.operacion_id = v_op and ob.sentido = 'cobrar' and not ob.anulada and not a.anulada
     and ob.tipo in ('factura', 'venta_sin_factura', 'nota_debito');
  cobrado := case when v_total > 0 then round(p_importe * least(v_aplicado / v_total, 1), 2) else 0 end;
end;
$$;

-- La obligación de comisión (solo Facturado) acompaña a la comisión:
-- existe desde el cierre pero no es exigible hasta completar la carga.
create or replace function fn_comisiones_obligacion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o operaciones;
  v_dias integer;
begin
  select * into o from operaciones where id = new.operacion_id;
  if o.modalidad <> 'facturado' then
    return new;
  end if;
  select dias_vencimiento_comision into v_dias from configuracion;

  if new.importe <= 0 then
    return new;  -- sin importe no hay nada que cobrar
  end if;

  perform set_interno(true);
  if not exists (select 1 from obligaciones where comision_id = new.id) then
    insert into obligaciones (sentido, tipo, tercero_id, operacion_id, comision_id, importe, fecha,
                              vencimiento, exigible, concepto)
    values ('cobrar', 'comision', o.comprador_id, o.id, new.id, new.importe, o.fecha_cierre,
            new.fecha_exigible + v_dias, new.fecha_exigible is not null,
            'Comisión operación ' || o.numero);
  else
    update obligaciones set
      importe     = new.importe,
      exigible    = new.fecha_exigible is not null,
      vencimiento = new.fecha_exigible + v_dias,
      anulada     = (new.estado = 'anulada' and obligacion_aplicado(id) = 0),
      motivo_anulacion = case when new.estado = 'anulada' and obligacion_aplicado(id) = 0
                              then 'Operación cancelada' end
    where comision_id = new.id
      and (importe, exigible, vencimiento, anulada)
          is distinct from (new.importe, new.fecha_exigible is not null, new.fecha_exigible + v_dias,
                            new.estado = 'anulada' and obligacion_aplicado(id) = 0);
  end if;
  perform set_interno(false);
  return new;
end;
$$;

create trigger trg_comisiones_obligacion
  after insert or update on comisiones
  for each row execute function fn_comisiones_obligacion();

-- Menudeo y Compra-venta: al comprar queda deuda con el productor,
-- al vender queda crédito con el comprador.
create or replace function importe_operacion(o operaciones, p_precio numeric, p_bolsas integer)
returns numeric language sql immutable as $$
  select round(p_precio * p_bolsas *
    case when o.modalidad = 'compraventa' and not o.precios_incluyen_iva
         then 1 + o.alicuota_iva / 100 else 1 end, 2);
$$;

create or replace function sincronizar_obligaciones_operacion(p_operacion_id uuid)
returns void language plpgsql security definer set search_path = public as $$
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
  -- Deuda con el productor
  select * into ob from obligaciones
   where operacion_id = o.id and ajuste_id is null and sentido = 'pagar' and tipo = v_tipo_compra;
  if ob.id is null then
    insert into obligaciones (sentido, tipo, tercero_id, operacion_id, importe, fecha, concepto)
    values ('pagar', v_tipo_compra, o.vendedor_id, o.id, importe_operacion(o, o.precio_compra, v_bolsas),
            o.fecha_cierre, 'Compra operación ' || o.numero);
  elsif ob.importe <> importe_operacion(o, o.precio_compra, v_bolsas) and not ob.anulada then
    update obligaciones set importe = importe_operacion(o, o.precio_compra, v_bolsas) where id = ob.id;
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

create or replace function fn_operaciones_obligaciones()
returns trigger language plpgsql as $$
begin
  if new.modalidad <> 'facturado' and (
       tg_op = 'INSERT'
    or (new.precio_compra, new.precio_venta, new.comprador_id, new.precios_incluyen_iva,
        new.alicuota_iva, new.estado_comercial)
       is distinct from
       (old.precio_compra, old.precio_venta, old.comprador_id, old.precios_incluyen_iva,
        old.alicuota_iva, old.estado_comercial)) then
    perform sincronizar_obligaciones_operacion(new.id);
  end if;
  return new;
end;
$$;

create trigger trg_operaciones_obligaciones
  after insert or update on operaciones
  for each row execute function fn_operaciones_obligaciones();

-- Ajustes en Menudeo/Compra-venta: obligaciones por la diferencia de bolsas
create or replace function fn_ajustes_obligaciones()
returns trigger language plpgsql security definer set search_path = public as $$
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
  insert into obligaciones (sentido, tipo, tercero_id, operacion_id, ajuste_id, importe, fecha, concepto)
  values (case when v_amplia then 'pagar' else 'cobrar' end::sentido_obligacion,
          case when v_amplia then 'nota_debito' else 'nota_credito' end::tipo_obligacion,
          o.vendedor_id, o.id, new.id, importe_operacion(o, o.precio_compra, v_n), new.fecha,
          'Ajuste de ' || new.delta_bolsas || ' bolsas (compra) op. ' || o.numero || ': ' || new.motivo);
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

create trigger trg_ajustes_obligaciones
  after insert on operacion_ajustes
  for each row execute function fn_ajustes_obligaciones();

-- ---------------------------------------------------------------------
-- Operaciones de tesorería
-- ---------------------------------------------------------------------

-- Revertir un movimiento confirmado: contramovimiento vinculado, con motivo
create or replace function revertir_movimiento(p_movimiento_id uuid, p_motivo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  m movimientos;
  v_contra uuid;
  v_par uuid;
begin
  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    raise exception 'Para revertir un movimiento hace falta un motivo';
  end if;
  select * into m from movimientos where id = p_movimiento_id for update;
  if m.id is null then
    raise exception 'Movimiento inexistente';
  end if;
  if m.estado <> 'confirmado' then
    raise exception 'Solo se revierten movimientos confirmados (estado actual: %)', m.estado;
  end if;
  if m.revierte_a is not null then
    raise exception 'Una reversión no se revierte: cargá el movimiento de nuevo';
  end if;
  if exists (select 1 from anticipos an where an.movimiento_id = m.id and not an.anulado
              and exists (select 1 from aplicaciones a where a.anticipo_id = an.id and not a.anulada)) then
    raise exception 'El movimiento originó un anticipo que ya se aplicó: anulá esas aplicaciones primero';
  end if;

  insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id, operacion_id,
                           estado, revierte_a, motivo_reversion, cheque_id)
  values (m.cuenta_id, current_date, -m.importe, m.medio, 'Reversión: ' || m.concepto, m.tercero_id,
          m.operacion_id, 'confirmado', m.id, p_motivo, m.cheque_id)
  returning id into v_contra;

  perform set_interno(true);
  update movimientos set estado = 'revertido' where id = m.id;
  perform set_interno(false);

  update aplicaciones set anulada = true, motivo_anulacion = 'Movimiento revertido: ' || p_motivo
   where movimiento_id = m.id and not anulada;
  update anticipos set anulado = true where movimiento_id = m.id and not anulado;

  -- Una transferencia entre cuentas se revierte entera
  if m.par_transferencia is not null then
    select id into v_par from movimientos where id = m.par_transferencia and estado = 'confirmado';
    if v_par is not null then
      perform revertir_movimiento(v_par, p_motivo);
    end if;
  end if;
  return v_contra;
end;
$$;

-- Transferencia Galicia ↔ Caja: dos movimientos vinculados que suman cero
create or replace function transferir_entre_cuentas(p_origen uuid, p_destino uuid, p_importe numeric,
  p_fecha date default current_date, p_concepto text default 'Transferencia entre cuentas propias')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sal uuid := gen_random_uuid();
  v_ent uuid := gen_random_uuid();
begin
  if p_origen = p_destino then
    raise exception 'Origen y destino tienen que ser cuentas distintas';
  end if;
  if p_importe <= 0 then
    raise exception 'El importe de la transferencia tiene que ser positivo';
  end if;
  insert into movimientos (id, cuenta_id, fecha, importe, medio, concepto, estado)
  values (v_sal, p_origen, p_fecha, -p_importe, 'transferencia', p_concepto, 'confirmado'),
         (v_ent, p_destino, p_fecha, p_importe, 'transferencia', p_concepto, 'confirmado');
  perform set_interno(true);
  update movimientos set par_transferencia = v_ent where id = v_sal;
  update movimientos set par_transferencia = v_sal where id = v_ent;
  perform set_interno(false);
  return v_sal;
end;
$$;

-- Registrar un anticipo a partir de un movimiento
create or replace function fn_anticipos_check()
returns trigger language plpgsql as $$
declare
  m movimientos;
begin
  if tg_op = 'UPDATE' then
    if new.anulado and not old.anulado and (new.importe, new.movimiento_id) = (old.importe, old.movimiento_id) then
      if exists (select 1 from aplicaciones where anticipo_id = old.id and not anulada) then
        raise exception 'El anticipo tiene aplicaciones: anulalas primero';
      end if;
      return new;
    end if;
    raise exception 'Un anticipo no se edita: anulalo y registralo de nuevo';
  end if;
  select * into m from movimientos where id = new.movimiento_id for update;
  if m.estado <> 'confirmado' or m.revierte_a is not null or m.par_transferencia is not null then
    raise exception 'El anticipo tiene que salir de un movimiento confirmado';
  end if;
  if (new.sentido = 'recibido') <> (m.importe > 0) then
    raise exception 'Un anticipo recibido sale de un ingreso y uno entregado, de un egreso';
  end if;
  if new.importe > movimiento_disponible(m.id) then
    raise exception 'El movimiento no tiene disponible suficiente para el anticipo';
  end if;
  return new;
end;
$$;

create trigger trg_anticipos_check
  before insert or update on anticipos
  for each row execute function fn_anticipos_check();

-- ---------------------------------------------------------------------
-- Ciclo de vida de los cheques
-- ---------------------------------------------------------------------
create or replace function cheque_transicion_valida(p_origen text, p_de estado_cheque, p_a estado_cheque)
returns boolean language sql immutable as $$
  select case p_origen
    when 'recibido' then (p_de, p_a) in (
      ('en_cartera', 'endosado'), ('en_cartera', 'depositado'), ('en_cartera', 'descontado'),
      ('en_cartera', 'rechazado'), ('en_cartera', 'acreditado'),
      ('depositado', 'acreditado'), ('depositado', 'rechazado'),
      ('endosado', 'rechazado'), ('descontado', 'rechazado'))
    when 'emitido' then (p_de, p_a) in (
      ('emitido', 'debitado'), ('emitido', 'rechazado'), ('emitido', 'anulado'))
  end;
$$;

create or replace function fn_cheques_before()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un cheque no se borra: queda su historial';
  end if;
  if tg_op = 'INSERT' then
    if (new.origen = 'recibido' and new.estado <> 'en_cartera')
       or (new.origen = 'emitido' and new.estado <> 'emitido') then
      raise exception 'Un cheque recibido entra "en cartera" y uno emitido, "emitido"';
    end if;
    return new;
  end if;
  if (new.importe, new.origen, new.numero) is distinct from (old.importe, old.origen, old.numero) then
    raise exception 'Importe, origen y número de un cheque no se modifican';
  end if;
  if new.estado <> old.estado and not cheque_transicion_valida(new.origen, old.estado, new.estado) then
    raise exception 'Un cheque % no pasa de "%" a "%"', new.origen, old.estado, new.estado;
  end if;
  if new.estado in ('acreditado', 'debitado') and new.cuenta_id is null then
    raise exception 'Indicá en qué cuenta se acreditó o debitó el cheque';
  end if;
  if new.estado = 'endosado' and new.beneficiario_id is null then
    raise exception 'Indicá a quién se endosó el cheque';
  end if;
  return new;
end;
$$;

create trigger trg_cheques_before
  before insert or update or delete on cheques
  for each row execute function fn_cheques_before();

create or replace function fn_cheques_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_desc descuentos_cheque;
begin
  if tg_op = 'INSERT' then
    insert into cheque_eventos (cheque_id, estado_anterior, estado_nuevo, fecha, nota)
    values (new.id, null, new.estado, coalesce(new.fecha_recepcion, current_date), 'Alta');
    return new;
  end if;
  if new.estado = old.estado then
    return new;
  end if;

  insert into cheque_eventos (cheque_id, estado_anterior, estado_nuevo)
  values (new.id, old.estado, new.estado);

  -- Acreditado (recibido) = ingreso bancario; debitado (emitido) = egreso bancario
  if new.estado = 'acreditado' then
    insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id, operacion_id, cheque_id)
    values (new.cuenta_id, current_date, new.importe, 'echeq',
            'Acreditación cheque ' || new.numero, new.entregado_por_id, new.operacion_id, new.id);
  elsif new.estado = 'debitado' then
    insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id, operacion_id, cheque_id)
    values (new.cuenta_id, current_date, -new.importe, 'echeq',
            'Débito cheque ' || new.numero, new.beneficiario_id, new.operacion_id, new.id);
  elsif new.estado = 'rechazado' then
    -- La deuda original vuelve a quedar pendiente, con el historial intacto
    update aplicaciones set anulada = true, motivo_anulacion = 'Cheque ' || new.numero || ' rechazado'
     where cheque_id = new.id and not anulada;
    -- Si estaba descontado, el banco debita el importe completo
    if old.estado = 'descontado' then
      select * into v_desc from descuentos_cheque where cheque_id = new.id;
      insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id, cheque_id)
      values (v_desc.cuenta_id, current_date, -new.importe, 'echeq',
              'Rechazo de cheque descontado ' || new.numero, new.entregado_por_id, new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_cheques_after
  after insert or update on cheques
  for each row execute function fn_cheques_after();

-- Endosar un cheque en cartera a un tercero, cancelando una deuda
create or replace function endosar_cheque(p_cheque_id uuid, p_beneficiario_id uuid,
  p_obligacion_id uuid default null, p_importe numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  ch cheques;
begin
  select * into ch from cheques where id = p_cheque_id for update;
  update cheques set estado = 'endosado', beneficiario_id = p_beneficiario_id where id = p_cheque_id;
  if p_obligacion_id is not null then
    if (select sentido from obligaciones where id = p_obligacion_id) <> 'pagar' then
      raise exception 'Un cheque endosado cancela una cuenta a pagar';
    end if;
    insert into aplicaciones (obligacion_id, origen, cheque_id, importe, fecha)
    values (p_obligacion_id, 'cheque', p_cheque_id,
            coalesce(p_importe, least(ch.importe, obligacion_pendiente(p_obligacion_id))), current_date);
  end if;
end;
$$;

-- Descontar un cheque: el banco acredita el neto y la diferencia es gasto financiero
create or replace function descontar_cheque(p_cheque_id uuid, p_cuenta_id uuid, p_entidad text,
  p_tasa_mensual numeric, p_dias integer, p_dias_clearing integer default 0,
  p_comisiones numeric default 0, p_iva_comisiones numeric default 0, p_fecha date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  ch cheques;
  v_interes numeric;
  v_costo numeric;
  v_mov uuid;
  v_desc uuid;
  v_cat uuid;
begin
  select * into ch from cheques where id = p_cheque_id for update;
  if ch.origen <> 'recibido' or ch.estado <> 'en_cartera' then
    raise exception 'Solo se descuenta un cheque recibido y en cartera';
  end if;
  v_interes := round(ch.importe * p_tasa_mensual / 100 / 30 * (p_dias + p_dias_clearing), 2);
  v_costo := v_interes + p_comisiones + p_iva_comisiones;

  update cheques set estado = 'descontado', cuenta_id = p_cuenta_id where id = ch.id;

  insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id, cheque_id)
  values (p_cuenta_id, p_fecha, ch.importe - v_costo, 'echeq',
          'Descuento cheque ' || ch.numero || ' en ' || p_entidad, ch.entregado_por_id, ch.id)
  returning id into v_mov;

  insert into descuentos_cheque (cheque_id, fecha, cuenta_id, entidad, tasa_mensual, dias, dias_clearing,
                                 interes, comisiones, iva_comisiones, costo_total, neto, movimiento_id)
  values (ch.id, p_fecha, p_cuenta_id, p_entidad, p_tasa_mensual, p_dias, p_dias_clearing,
          v_interes, p_comisiones, p_iva_comisiones, v_costo, ch.importe - v_costo, v_mov)
  returning id into v_desc;

  select id into v_cat from categorias_gasto where nombre = 'Gastos financieros';
  insert into gastos (fecha, categoria_id, descripcion, importe_neto, iva, forma, movimiento_id, descuento_id)
  values (p_fecha, v_cat, 'Descuento cheque ' || ch.numero || ' (' || p_entidad || ')',
          v_interes + p_comisiones, p_iva_comisiones, 'incluido', v_mov, v_desc);
  return v_desc;
end;
$$;

-- ---------------------------------------------------------------------
-- Gastos y reparto de la oficina compartida
-- ---------------------------------------------------------------------
create table gastos (
  id               uuid primary key default gen_random_uuid(),
  fecha            date not null default current_date,
  categoria_id     uuid not null references categorias_gasto(id),
  proveedor_id     uuid references terceros(id),
  operacion_id     uuid references operaciones(id),
  descripcion      text not null,
  importe_neto     numeric(18,2) not null check (importe_neto >= 0),
  iva              numeric(18,2) not null default 0 check (iva >= 0),
  otros_impuestos  numeric(18,2) not null default 0 check (otros_impuestos >= 0),
  total            numeric(18,2) generated always as (importe_neto + iva + otros_impuestos) stored,
  numero_factura   text,
  -- a_pagar: genera una cuenta a pagar; pagado: ya salió en un movimiento;
  -- incluido: el costo ya está dentro de otro movimiento (p. ej. descuento de cheque)
  forma            text not null check (forma in ('a_pagar', 'pagado', 'incluido')),
  movimiento_id    uuid references movimientos(id),
  descuento_id     uuid references descuentos_cheque(id),
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  check (forma <> 'a_pagar' or proveedor_id is not null),
  check (forma = 'a_pagar' or movimiento_id is not null),
  check (total > 0)
);
alter table obligaciones add constraint obligaciones_gasto_fk foreign key (gasto_id) references gastos(id);

create or replace function fn_gastos_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.forma = 'a_pagar' then
    insert into obligaciones (sentido, tipo, tercero_id, operacion_id, gasto_id, importe, fecha,
                              concepto, numero_comprobante)
    values ('pagar', 'factura', new.proveedor_id, new.operacion_id, new.id, new.total, new.fecha,
            new.descripcion, new.numero_factura);
  end if;
  return new;
end;
$$;

create trigger trg_gastos_after
  after insert on gastos
  for each row execute function fn_gastos_after();

create table reparto_gastos (
  id            uuid primary key default gen_random_uuid(),
  gasto_id      uuid not null references gastos(id) on delete cascade,
  participante  text not null,           -- "AGROVIA", "Arquitecto 1"…
  tercero_id    uuid references terceros(id),
  es_agrovia    boolean not null default false,
  porcentaje    numeric(6,2) not null check (porcentaje > 0 and porcentaje <= 100),
  unique (gasto_id, participante)
);

create or replace function fn_reparto_check()
returns trigger language plpgsql as $$
begin
  if (select coalesce(sum(porcentaje), 0) from reparto_gastos
       where gasto_id = new.gasto_id and id <> new.id) + new.porcentaje > 100 then
    raise exception 'El reparto del gasto supera el 100%%';
  end if;
  if new.es_agrovia and exists (select 1 from reparto_gastos
       where gasto_id = new.gasto_id and es_agrovia and id <> new.id) then
    raise exception 'AGROVIA ya figura en el reparto de este gasto';
  end if;
  return new;
end;
$$;
create trigger trg_reparto_check before insert or update on reparto_gastos
  for each row execute function fn_reparto_check();

-- ---------------------------------------------------------------------
-- Importación de extractos bancarios
-- ---------------------------------------------------------------------
create type estado_linea_extracto as enum ('nueva', 'conciliada', 'pendiente_identificar', 'ignorada');

create table extractos_importados (
  id              uuid primary key default gen_random_uuid(),
  cuenta_id       uuid not null references cuentas_tesoreria(id),
  archivo_nombre  text not null,
  archivo_hash    text not null,
  periodo_desde   date,
  periodo_hasta   date,
  saldo_final     numeric(18,2),
  usuario_id      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  unique (cuenta_id, archivo_hash)
);

create table extracto_lineas (
  id              uuid primary key default gen_random_uuid(),
  extracto_id     uuid not null references extractos_importados(id),
  cuenta_id       uuid not null references cuentas_tesoreria(id),
  orden           integer not null,
  fecha           date not null,
  concepto        text,
  referencia      text,
  importe         numeric(18,2) not null,
  saldo_linea     numeric(18,2),
  huella          text not null,
  estado          estado_linea_extracto not null default 'nueva',
  movimiento_id   uuid references movimientos(id),
  created_at      timestamptz not null default now(),
  unique (cuenta_id, huella),
  check (estado <> 'conciliada' or movimiento_id is not null)
);
alter table movimientos add constraint movimientos_extracto_fk foreign key (extracto_linea_id) references extracto_lineas(id);

-- Huella única: cuenta + fecha + importe + referencia + saldo de la línea.
-- Si el banco no informa saldo, entra el número de orden dentro del archivo
-- para no fusionar dos transferencias iguales del mismo día.
create or replace function huella_linea(p_cuenta uuid, p_fecha date, p_importe numeric,
  p_referencia text, p_saldo numeric, p_orden integer)
returns text language sql immutable as $$
  select md5(concat_ws('|', p_cuenta, p_fecha, p_importe, coalesce(btrim(p_referencia), ''),
                       coalesce(p_saldo::text, 'orden:' || p_orden)));
$$;

create or replace function fn_extracto_lineas_before()
returns trigger language plpgsql as $$
begin
  new.huella := huella_linea(new.cuenta_id, new.fecha, new.importe, new.referencia, new.saldo_linea, new.orden);
  return new;
end;
$$;
create trigger trg_extracto_lineas_before before insert on extracto_lineas
  for each row execute function fn_extracto_lineas_before();

-- Conciliar una línea con un movimiento ya cargado (no se duplica)
create or replace function conciliar_linea(p_linea_id uuid, p_movimiento_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  l extracto_lineas;
  m movimientos;
begin
  select * into l from extracto_lineas where id = p_linea_id for update;
  select * into m from movimientos where id = p_movimiento_id for update;
  if l.cuenta_id <> m.cuenta_id or l.importe <> m.importe then
    raise exception 'La línea y el movimiento no coinciden en cuenta o importe';
  end if;
  if m.estado <> 'confirmado' then
    raise exception 'Solo se concilian movimientos confirmados';
  end if;
  if m.extracto_linea_id is not null then
    raise exception 'El movimiento ya está conciliado con otra línea';
  end if;
  update extracto_lineas set estado = 'conciliada', movimiento_id = m.id where id = l.id;
  perform set_interno(true);
  update movimientos set extracto_linea_id = l.id where id = m.id;
  perform set_interno(false);
end;
$$;

-- Crear el movimiento a partir de una línea nueva del extracto
create or replace function movimiento_desde_linea(p_linea_id uuid, p_concepto text,
  p_tercero_id uuid default null, p_medio medio_pago default 'transferencia')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  l extracto_lineas;
  v_mov uuid;
begin
  select * into l from extracto_lineas where id = p_linea_id for update;
  if l.estado = 'conciliada' then
    raise exception 'La línea ya está conciliada';
  end if;
  insert into movimientos (cuenta_id, fecha, importe, medio, concepto, tercero_id)
  values (l.cuenta_id, l.fecha, l.importe, p_medio, coalesce(p_concepto, l.concepto), p_tercero_id)
  returning id into v_mov;
  perform conciliar_linea(l.id, v_mov);
  return v_mov;
end;
$$;

select auditar_tabla('cuentas_tesoreria');
select auditar_tabla('obligaciones');
select auditar_tabla('movimientos');
select auditar_tabla('anticipos');
select auditar_tabla('cheques');
select auditar_tabla('descuentos_cheque');
select auditar_tabla('aplicaciones');
select auditar_tabla('gastos');
select auditar_tabla('reparto_gastos');
select auditar_tabla('extractos_importados');
select auditar_tabla('extracto_lineas');
