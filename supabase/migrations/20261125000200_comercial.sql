-- =====================================================================
-- AGROVIA SAS — Gestión comercial
-- Operaciones, ajustes, cargas, comisiones, stock, reposiciones.
-- Las cifras derivadas (bolsas cargadas, ajustes, estados) las mantienen
-- los triggers: nunca se tipean.
-- =====================================================================

create type modalidad_operacion as enum ('facturado', 'menudeo', 'compraventa');
create type estado_comercial as enum ('cerrada', 'cancelada');
create type estado_logistico as enum ('sin_cargar', 'carga_parcial', 'carga_completada');
create type tipo_comision as enum ('diferencia', 'por_bolsa', 'fija', 'porcentaje');
create type estado_comision as enum ('esperando_carga', 'pendiente_cobro', 'cobrada', 'anulada');
create type tipo_ubicacion as enum ('ingenio', 'deposito');

-- Marca de "escritura interna": solo las funciones del sistema (security
-- definer, que corren como dueño de la base) pueden tocar columnas
-- calculadas. Un usuario logueado no puede activarla aunque llame a
-- set_config, porque sus sentencias corren con el rol authenticated.
create or replace function es_escritura_interna()
returns boolean language sql stable as $$
  select coalesce(current_setting('agrovia.interno', true), '') = 'on'
     and current_user not in ('authenticated', 'anon');
$$;

create or replace function set_interno(p_on boolean)
returns void language sql as $$
  select set_config('agrovia.interno', case when p_on then 'on' else 'off' end, true);
$$;

-- ---------------------------------------------------------------------
-- Numeración correlativa por modalidad: 1-xx, 2-xx, A-x. No se reutiliza.
-- ---------------------------------------------------------------------
create table numeradores (
  modalidad  modalidad_operacion primary key,
  prefijo    text not null unique,
  ultimo     integer not null default 0
);
insert into numeradores (modalidad, prefijo) values
  ('facturado', '1'), ('menudeo', '2'), ('compraventa', 'A');

-- ---------------------------------------------------------------------
-- Operaciones
-- ---------------------------------------------------------------------
create table operaciones (
  id                     uuid primary key default gen_random_uuid(),
  numero                 text not null unique,
  numero_seq             integer not null,
  modalidad              modalidad_operacion not null,
  fecha_cierre           date not null default current_date,
  estado_comercial       estado_comercial not null default 'cerrada',
  motivo_cancelacion     text,

  vendedor_id            uuid not null references terceros(id),
  comprador_id           uuid references terceros(id),
  comisionista_id        uuid references terceros(id),

  producto_id            uuid references productos(id),
  marca_id               uuid references marcas(id),
  zafra                  integer check (zafra between 2000 and 2100),
  ubicacion_tipo         tipo_ubicacion,
  ingenio_id             uuid references ingenios(id),
  deposito_id            uuid references depositos(id),

  bolsas_negociadas      integer not null check (bolsas_negociadas > 0),
  kg_por_bolsa           numeric(8,2) not null default 50 check (kg_por_bolsa > 0),
  precio_compra          numeric(18,2) not null check (precio_compra >= 0),
  precio_venta           numeric(18,2) check (precio_venta >= 0),
  precios_incluyen_iva   boolean not null default false,
  alicuota_iva           numeric(5,2) not null default 21 check (alicuota_iva >= 0),

  -- Costos por bolsa (se usan en Compra-venta: flete, IIBB, DyC, paletizado…)
  costo_flete            numeric(18,2) not null default 0 check (costo_flete >= 0),
  costo_iibb             numeric(18,2) not null default 0 check (costo_iibb >= 0),
  costo_dyc              numeric(18,2) not null default 0 check (costo_dyc >= 0),
  costo_otros            numeric(18,2) not null default 0 check (costo_otros >= 0),
  costo_ganancias        numeric(18,2) not null default 0 check (costo_ganancias >= 0),

  condiciones_pago       text,
  comision_tipo          tipo_comision not null default 'diferencia',
  comision_valor         numeric(18,4) check (comision_valor >= 0),
  observaciones          text,

  -- Calculados por triggers
  bolsas_ajustes         integer not null default 0,
  bolsas_cargadas        integer not null default 0,
  estado_logistico       estado_logistico not null default 'sin_cargar',

  created_by             uuid default auth.uid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  unique (modalidad, numero_seq),
  check (comprador_id is distinct from vendedor_id),
  check (modalidad <> 'facturado' or (comprador_id is not null and precio_venta is not null)),
  check (comision_tipo = 'diferencia' or comision_valor is not null),
  check (comision_tipo <> 'porcentaje' or comision_valor <= 100),
  check (estado_comercial <> 'cancelada' or motivo_cancelacion is not null),
  check (ubicacion_tipo is null
         or (ubicacion_tipo = 'ingenio' and ingenio_id is not null and deposito_id is null)
         or (ubicacion_tipo = 'deposito' and deposito_id is not null and ingenio_id is null))
);
create index operaciones_comprador_idx on operaciones (comprador_id);
create index operaciones_vendedor_idx on operaciones (vendedor_id);
create index operaciones_fecha_idx on operaciones (fecha_cierre);

create or replace function bolsas_totales(o operaciones)
returns integer language sql immutable as $$
  select o.bolsas_negociadas + o.bolsas_ajustes;
$$;

create or replace function bolsas_pendientes(o operaciones)
returns integer language sql immutable as $$
  select o.bolsas_negociadas + o.bolsas_ajustes - o.bolsas_cargadas;
$$;

-- Asigna número y protege columnas calculadas
create or replace function fn_operaciones_before()
returns trigger language plpgsql as $$
declare
  v_prefijo text;
  v_seq integer;
begin
  if tg_op = 'INSERT' then
    if new.numero_seq is null then
      update numeradores set ultimo = ultimo + 1
       where modalidad = new.modalidad
       returning prefijo, ultimo into v_prefijo, v_seq;
      new.numero_seq := v_seq;
    else
      -- Importación de operaciones históricas con su número original
      update numeradores set ultimo = greatest(ultimo, new.numero_seq)
       where modalidad = new.modalidad
       returning prefijo into v_prefijo;
    end if;
    new.numero := v_prefijo || '-' || new.numero_seq;
    new.bolsas_ajustes := 0;
    new.bolsas_cargadas := 0;
    new.estado_logistico := 'sin_cargar';
    if new.estado_comercial = 'cancelada' then
      raise exception 'Una operación no puede crearse cancelada';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.numero is distinct from old.numero
     or new.numero_seq is distinct from old.numero_seq
     or new.modalidad is distinct from old.modalidad then
    raise exception 'El número y la modalidad de una operación no se modifican';
  end if;
  if not es_escritura_interna() and (
       new.bolsas_ajustes is distinct from old.bolsas_ajustes
    or new.bolsas_cargadas is distinct from old.bolsas_cargadas
    or new.estado_logistico is distinct from old.estado_logistico) then
    raise exception 'Bolsas cargadas, ajustes y estado logístico se calculan solos: registrá una carga o un ajuste';
  end if;
  if new.bolsas_negociadas is distinct from old.bolsas_negociadas and not es_escritura_interna() then
    raise exception 'Las bolsas negociadas no se editan: registrá un ajuste autorizado con motivo';
  end if;
  if old.estado_comercial = 'cancelada' and not es_escritura_interna() then
    raise exception 'La operación % está cancelada y no se modifica', old.numero;
  end if;
  if new.estado_comercial = 'cancelada' and old.estado_comercial <> 'cancelada'
     and old.bolsas_cargadas > 0 then
    raise exception 'No se puede cancelar la operación %: ya tiene % bolsas cargadas', old.numero, old.bolsas_cargadas;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_operaciones_before
  before insert or update on operaciones
  for each row execute function fn_operaciones_before();

create or replace function fn_no_borrar()
returns trigger language plpgsql as $$
begin
  raise exception 'Los registros de % no se borran (%). Usá cancelación o reversión.', tg_table_name, old.id;
end;
$$;

create trigger trg_operaciones_no_borrar
  before delete on operaciones
  for each row execute function fn_no_borrar();

-- ---------------------------------------------------------------------
-- Ajustes autorizados de bolsas
-- ---------------------------------------------------------------------
create table operacion_ajustes (
  id            uuid primary key default gen_random_uuid(),
  operacion_id  uuid not null references operaciones(id),
  fecha         date not null default current_date,
  delta_bolsas  integer not null check (delta_bolsas <> 0),
  motivo        text not null check (length(btrim(motivo)) > 0),
  usuario_id    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index operacion_ajustes_op_idx on operacion_ajustes (operacion_id);

-- ---------------------------------------------------------------------
-- Cargas (cada carga = un equipo / camión)
-- ---------------------------------------------------------------------
create table cargas (
  id                uuid primary key default gen_random_uuid(),
  operacion_id      uuid not null references operaciones(id),
  fecha             date not null default current_date,
  bolsas            integer not null check (bolsas > 0),
  ubicacion_tipo    tipo_ubicacion,
  ingenio_id        uuid references ingenios(id),
  deposito_id       uuid references depositos(id),
  transportista_id  uuid references terceros(id),
  patente           text,
  remito            text,
  orden_retiro      text,
  es_apertura       boolean not null default false,  -- bolsas ya cargadas antes del sistema
  observaciones     text,
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  check (ubicacion_tipo is null
         or (ubicacion_tipo = 'ingenio' and ingenio_id is not null and deposito_id is null)
         or (ubicacion_tipo = 'deposito' and deposito_id is not null and ingenio_id is null))
);
create index cargas_op_idx on cargas (operacion_id);
-- El remito no se repite para el mismo ingenio o depósito
create unique index cargas_remito_unico_idx
  on cargas (coalesce(ingenio_id, deposito_id), lower(btrim(remito)))
  where remito is not null and btrim(remito) <> '';

-- ---------------------------------------------------------------------
-- Comisiones (una por operación)
-- En Facturado es la comisión que AGROVIA cobra al comprador.
-- En Menudeo y Compra-venta es la utilidad (margen) de la operación.
-- ---------------------------------------------------------------------
create table comisiones (
  id                 uuid primary key default gen_random_uuid(),
  operacion_id       uuid not null unique references operaciones(id),
  importe            numeric(18,2) not null default 0,   -- bruto, neto de IVA
  estado             estado_comision not null default 'esperando_carga',
  fecha_exigible     date,
  importe_cobrado    numeric(18,2) not null default 0,
  fecha_cobro        date,          -- fecha del cobro que la completó
  cobro_anticipado   boolean not null default false,
  cobro_parcial      boolean not null default false,
  updated_at         timestamptz not null default now()
);

create table comision_participantes (
  id           uuid primary key default gen_random_uuid(),
  comision_id  uuid not null references comisiones(id) on delete cascade,
  tercero_id   uuid not null references terceros(id),
  tipo         text not null check (tipo in ('porcentaje', 'monto')),
  valor        numeric(18,2) not null check (valor > 0),
  motivo       text,
  check (tipo <> 'porcentaje' or valor <= 100),
  unique (comision_id, tercero_id)
);

create or replace function fn_comisiones_proteger()
returns trigger language plpgsql as $$
begin
  if not es_escritura_interna() then
    raise exception 'La comisión se calcula sola desde la operación, las cargas y los cobros';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_comisiones_proteger
  before insert or update or delete on comisiones
  for each row execute function fn_comisiones_proteger();

-- Importe de la comisión (bruto, antes de repartir con participantes)
create or replace function calcular_importe_comision(o operaciones)
returns numeric language plpgsql immutable as $$
declare
  v_bolsas integer := o.bolsas_negociadas + o.bolsas_ajustes;
  v_costos numeric := o.costo_flete + o.costo_iibb + o.costo_dyc + o.costo_otros + o.costo_ganancias;
begin
  if o.precio_venta is null then
    return 0;
  end if;
  return round(case o.comision_tipo
    when 'diferencia' then (o.precio_venta - o.precio_compra - v_costos) * v_bolsas
    when 'por_bolsa'  then o.comision_valor * v_bolsas
    when 'fija'       then o.comision_valor
    when 'porcentaje' then o.precio_venta * o.comision_valor / 100 * v_bolsas
  end, 2);
end;
$$;

-- Cuánto se cobró de la comisión y desde cuándo.
-- La migración financiera la reemplaza con los cobros reales.
create or replace function comision_cobros(p_comision_id uuid, p_importe numeric,
  out cobrado numeric, out primera_fecha date, out ultima_fecha date)
language sql stable as $$
  select 0::numeric, null::date, null::date;
$$;

-- Recalcula importe y estado de la comisión de una operación
create or replace function recalcular_comision(p_operacion_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o operaciones;
  c comisiones;
  v_importe numeric;
  v_estado estado_comision;
  v_exigible date;
  v_cobrado numeric;
  v_primera date;
  v_ultima date;
begin
  select * into o from operaciones where id = p_operacion_id;
  select * into c from comisiones where operacion_id = p_operacion_id;
  if c.id is null then
    return;
  end if;

  v_importe := calcular_importe_comision(o);
  select cobrado, primera_fecha, ultima_fecha into v_cobrado, v_primera, v_ultima
    from comision_cobros(c.id, v_importe);

  -- Exigible recién al completar la carga
  if bolsas_pendientes(o) = 0 then
    v_exigible := coalesce(c.fecha_exigible,
      (select max(fecha) from cargas where operacion_id = o.id), current_date);
  else
    v_exigible := null;
  end if;

  v_estado := case
    when o.estado_comercial = 'cancelada' then 'anulada'
    when v_importe > 0 and v_cobrado >= v_importe then 'cobrada'
    when bolsas_pendientes(o) > 0 then 'esperando_carga'
    else 'pendiente_cobro'
  end::estado_comision;

  perform set_interno(true);
  update comisiones set
    importe          = v_importe,
    estado           = v_estado,
    fecha_exigible   = v_exigible,
    importe_cobrado  = v_cobrado,
    fecha_cobro      = case when v_estado = 'cobrada' then v_ultima end,
    cobro_anticipado = v_cobrado > 0 and (v_exigible is null or v_primera < v_exigible),
    cobro_parcial    = v_cobrado > 0 and v_cobrado < v_importe,
    updated_at       = now()
  where id = c.id;
  perform set_interno(false);
end;
$$;

-- ---------------------------------------------------------------------
-- Seguimiento de pagos directos comprador → productor (solo Facturado)
-- Informativo: no toca tesorería.
-- ---------------------------------------------------------------------
create table seguimiento_pagos_directos (
  id            uuid primary key default gen_random_uuid(),
  operacion_id  uuid not null references operaciones(id),
  fecha         date not null,
  importe       numeric(18,2) not null check (importe > 0),
  medio         text,
  referencia    text,
  observaciones text,
  created_at    timestamptz not null default now()
);

create or replace function fn_pagos_directos_check()
returns trigger language plpgsql as $$
begin
  if (select modalidad from operaciones where id = new.operacion_id) <> 'facturado' then
    raise exception 'Los pagos directos comprador → productor solo existen en Facturado';
  end if;
  return new;
end;
$$;
create trigger trg_pagos_directos_check before insert or update on seguimiento_pagos_directos
  for each row execute function fn_pagos_directos_check();

-- ---------------------------------------------------------------------
-- Stock propio (solo Menudeo y Compra-venta)
-- ---------------------------------------------------------------------
create type tipo_mov_stock as enum ('entrada_compra', 'salida_carga', 'ajuste', 'reposicion');

create table stock_movimientos (
  id               uuid primary key default gen_random_uuid(),
  fecha            date not null default current_date,
  tipo             tipo_mov_stock not null,
  producto_id      uuid references productos(id),
  marca_id         uuid references marcas(id),
  ubicacion_tipo   tipo_ubicacion,
  ingenio_id       uuid references ingenios(id),
  deposito_id      uuid references depositos(id),
  bolsas           integer not null check (bolsas <> 0),  -- + entra, − sale
  costo_unitario   numeric(18,2),
  operacion_id     uuid references operaciones(id),
  carga_id         uuid references cargas(id) on delete cascade,
  ajuste_id        uuid references operacion_ajustes(id),
  reposicion_mov_id uuid,
  motivo           text,
  created_at       timestamptz not null default now(),
  check (tipo <> 'ajuste' or motivo is not null)
);
create index stock_mov_op_idx on stock_movimientos (operacion_id);

-- ---------------------------------------------------------------------
-- Reposiciones de bolsas (nacen solo por motivo explícito)
-- ---------------------------------------------------------------------
create table reposiciones (
  id                  uuid primary key default gen_random_uuid(),
  sentido             text not null check (sentido in ('agrovia_debe', 'le_deben')),
  tercero_id          uuid not null references terceros(id),
  operacion_origen_id uuid references operaciones(id),
  motivo              text not null check (motivo in ('prestamo', 'faltante', 'devolucion', 'otro')),
  detalle             text,
  bolsas              integer not null check (bolsas > 0),
  fecha               date not null default current_date,
  fecha_prevista      date,
  created_at          timestamptz not null default now()
);

create table reposicion_movimientos (
  id             uuid primary key default gen_random_uuid(),
  reposicion_id  uuid not null references reposiciones(id),
  fecha          date not null default current_date,
  bolsas         integer not null check (bolsas > 0),
  remito         text,
  observaciones  text,
  created_at     timestamptz not null default now()
);

create or replace function fn_reposicion_mov_check()
returns trigger language plpgsql as $$
declare
  v_total integer;
  v_entregado integer;
begin
  select bolsas into v_total from reposiciones where id = new.reposicion_id for update;
  select coalesce(sum(bolsas), 0) into v_entregado
    from reposicion_movimientos where reposicion_id = new.reposicion_id and id <> new.id;
  if v_entregado + new.bolsas > v_total then
    raise exception 'La entrega supera lo pendiente de la reposición (pendiente: % bolsas)', v_total - v_entregado;
  end if;
  return new;
end;
$$;
create trigger trg_reposicion_mov_check before insert or update on reposicion_movimientos
  for each row execute function fn_reposicion_mov_check();

-- ---------------------------------------------------------------------
-- Lógica de operaciones, ajustes y cargas
-- ---------------------------------------------------------------------

-- Recalcula bolsas cargadas y estado logístico
create or replace function recalcular_logistica(p_operacion_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cargadas integer;
  v_ajustes integer;
  v_negociadas integer;
begin
  select bolsas_negociadas into v_negociadas from operaciones where id = p_operacion_id;
  select coalesce(sum(bolsas), 0) into v_cargadas from cargas where operacion_id = p_operacion_id;
  select coalesce(sum(delta_bolsas), 0) into v_ajustes from operacion_ajustes where operacion_id = p_operacion_id;

  perform set_interno(true);
  update operaciones set
    bolsas_cargadas = v_cargadas,
    bolsas_ajustes = v_ajustes,
    estado_logistico = case
      when v_cargadas = 0 then 'sin_cargar'
      when v_cargadas >= v_negociadas + v_ajustes then 'carga_completada'
      else 'carga_parcial'
    end::estado_logistico
  where id = p_operacion_id;
  perform set_interno(false);

  perform recalcular_comision(p_operacion_id);
end;
$$;

-- Al cerrar una operación: crea su comisión, participante y stock de compra
create or replace function fn_operaciones_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
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

  if new.modalidad in ('menudeo', 'compraventa') then
    insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                   deposito_id, bolsas, costo_unitario, operacion_id)
    values (new.fecha_cierre, 'entrada_compra', new.producto_id, new.marca_id, new.ubicacion_tipo,
            new.ingenio_id, new.deposito_id, new.bolsas_negociadas, new.precio_compra, new.id);
  end if;

  perform recalcular_comision(new.id);
  return new;
end;
$$;

create trigger trg_operaciones_after_insert
  after insert on operaciones
  for each row execute function fn_operaciones_after_insert();

-- Cambios de precio, tipo de comisión o cancelación recalculan la comisión
create or replace function fn_operaciones_after_update()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() > 1 and es_escritura_interna() then
    return new;  -- cambio interno de logística: ya recalcula quien lo llamó
  end if;
  perform recalcular_comision(new.id);
  return new;
end;
$$;

create trigger trg_operaciones_after_update
  after update on operaciones
  for each row execute function fn_operaciones_after_update();

-- Ajustes: no pueden dejar el total por debajo de lo cargado
create or replace function fn_ajustes_before()
returns trigger language plpgsql as $$
declare
  o operaciones;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Un ajuste registrado no se modifica ni se borra: registrá otro ajuste en sentido contrario';
  end if;
  select * into o from operaciones where id = new.operacion_id for update;
  if o.estado_comercial = 'cancelada' then
    raise exception 'La operación % está cancelada', o.numero;
  end if;
  if o.bolsas_negociadas + o.bolsas_ajustes + new.delta_bolsas < greatest(o.bolsas_cargadas, 1) then
    raise exception 'El ajuste deja la operación % con menos bolsas que las ya cargadas (%)', o.numero, o.bolsas_cargadas;
  end if;
  return new;
end;
$$;

create trigger trg_ajustes_before
  before insert or update or delete on operacion_ajustes
  for each row execute function fn_ajustes_before();

create or replace function fn_ajustes_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o operaciones;
begin
  select * into o from operaciones where id = new.operacion_id;
  if o.modalidad in ('menudeo', 'compraventa') then
    insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                   deposito_id, bolsas, costo_unitario, operacion_id, ajuste_id, motivo)
    values (new.fecha, 'entrada_compra', o.producto_id, o.marca_id, o.ubicacion_tipo, o.ingenio_id,
            o.deposito_id, new.delta_bolsas, o.precio_compra, o.id, new.id, new.motivo);
  end if;
  perform recalcular_logistica(new.operacion_id);
  return new;
end;
$$;

create trigger trg_ajustes_after
  after insert on operacion_ajustes
  for each row execute function fn_ajustes_after();

-- Cargas: nunca superan lo pendiente
create or replace function fn_cargas_before()
returns trigger language plpgsql as $$
declare
  o operaciones;
  v_otras integer;
begin
  if tg_op = 'UPDATE' and new.operacion_id <> old.operacion_id then
    raise exception 'Una carga no se cambia de operación: borrala y registrala en la correcta';
  end if;
  select * into o from operaciones
   where id = coalesce(new.operacion_id, old.operacion_id) for update;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if o.estado_comercial = 'cancelada' then
    raise exception 'La operación % está cancelada', o.numero;
  end if;
  select coalesce(sum(bolsas), 0) into v_otras
    from cargas where operacion_id = new.operacion_id and id <> new.id;
  if v_otras + new.bolsas > o.bolsas_negociadas + o.bolsas_ajustes then
    raise exception 'La carga de % bolsas supera lo pendiente de la operación % (pendiente: % bolsas). Para cargar más registrá un ajuste autorizado.',
      new.bolsas, o.numero, o.bolsas_negociadas + o.bolsas_ajustes - v_otras;
  end if;
  -- Por defecto, la carga sale de la ubicación de la operación
  if new.ubicacion_tipo is null and o.ubicacion_tipo is not null then
    new.ubicacion_tipo := o.ubicacion_tipo;
    new.ingenio_id := o.ingenio_id;
    new.deposito_id := o.deposito_id;
  end if;
  return new;
end;
$$;

create trigger trg_cargas_before
  before insert or update or delete on cargas
  for each row execute function fn_cargas_before();

create or replace function fn_cargas_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o operaciones;
begin
  select * into o from operaciones where id = coalesce(new.operacion_id, old.operacion_id);

  -- Stock: en Menudeo y Compra-venta la carga descuenta stock propio
  if o.modalidad in ('menudeo', 'compraventa') then
    delete from stock_movimientos where carga_id = coalesce(new.id, old.id);
    if tg_op <> 'DELETE' and not new.es_apertura then
      insert into stock_movimientos (fecha, tipo, producto_id, marca_id, ubicacion_tipo, ingenio_id,
                                     deposito_id, bolsas, operacion_id, carga_id)
      values (new.fecha, 'salida_carga', o.producto_id, o.marca_id, new.ubicacion_tipo,
              new.ingenio_id, new.deposito_id, -new.bolsas, o.id, new.id);
    end if;
  end if;

  perform recalcular_logistica(o.id);
  return coalesce(new, old);
end;
$$;

create trigger trg_cargas_after
  after insert or update or delete on cargas
  for each row execute function fn_cargas_after();

-- Participantes: recalcular no hace falta (el reparto se calcula en vistas),
-- pero el total repartido no puede superar el 100% ni el importe.
create or replace function fn_participantes_check()
returns trigger language plpgsql as $$
declare
  v_pct numeric;
begin
  select coalesce(sum(valor), 0) into v_pct
    from comision_participantes
   where comision_id = new.comision_id and tipo = 'porcentaje' and id <> new.id;
  if new.tipo = 'porcentaje' and v_pct + new.valor > 100 then
    raise exception 'El reparto de la comisión supera el 100%%';
  end if;
  return new;
end;
$$;
create trigger trg_participantes_check before insert or update on comision_participantes
  for each row execute function fn_participantes_check();

select auditar_tabla('operaciones');
select auditar_tabla('operacion_ajustes');
select auditar_tabla('cargas');
select auditar_tabla('comisiones');
select auditar_tabla('comision_participantes');
select auditar_tabla('seguimiento_pagos_directos');
select auditar_tabla('stock_movimientos');
select auditar_tabla('reposiciones');
select auditar_tabla('reposicion_movimientos');
