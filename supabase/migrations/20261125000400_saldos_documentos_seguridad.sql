-- =====================================================================
-- AGROVIA SAS — Saldos (vistas), documentos y seguridad por rol (RLS)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Saldos de tesorería: saldo inicial + movimientos confirmados.
-- (Un movimiento revertido y su contramovimiento se anulan entre sí.)
-- ---------------------------------------------------------------------
create view v_saldos_cuentas with (security_invoker = true) as
select c.id as cuenta_id, c.nombre, c.tipo,
       c.saldo_inicial
       + coalesce(sum(m.importe) filter (where m.estado in ('confirmado', 'revertido')), 0) as saldo,
       coalesce(sum(m.importe) filter (where m.estado = 'borrador'), 0) as borradores
  from cuentas_tesoreria c
  left join movimientos m on m.cuenta_id = c.id
 group by c.id;

-- ---------------------------------------------------------------------
-- Obligaciones con su pendiente
-- ---------------------------------------------------------------------
create view v_obligaciones with (security_invoker = true) as
select o.*,
       obligacion_aplicado(o.id) as aplicado,
       o.importe - obligacion_aplicado(o.id) as pendiente,
       case when o.exigible and o.vencimiento is not null and o.vencimiento < current_date
                 and o.importe - obligacion_aplicado(o.id) > 0
            then current_date - o.vencimiento else 0 end as dias_atraso
  from obligaciones o
 where not o.anulada;

-- ---------------------------------------------------------------------
-- Cuenta corriente por tercero
-- a_cobrar: lo que nos deben (solo lo exigible)
-- a_pagar: lo que debemos
-- cobros_anticipados: cobrado de obligaciones todavía no exigibles
-- anticipos sin aplicar, en ambos sentidos
-- ---------------------------------------------------------------------
create view v_cuentas_corrientes with (security_invoker = true) as
with ob as (
  select tercero_id,
         sum(case when sentido = 'cobrar' and exigible then pendiente else 0 end) as a_cobrar,
         sum(case when sentido = 'pagar' then pendiente else 0 end) as a_pagar,
         sum(case when sentido = 'cobrar' and not exigible then aplicado else 0 end) as cobros_anticipados,
         sum(case when sentido = 'cobrar' and not exigible then pendiente else 0 end) as a_cobrar_no_exigible
    from v_obligaciones group by tercero_id
), an as (
  select tercero_id,
         sum(case when sentido = 'recibido' then anticipo_disponible(id) else 0 end) as anticipos_recibidos,
         sum(case when sentido = 'entregado' then anticipo_disponible(id) else 0 end) as anticipos_entregados
    from anticipos where not anulado group by tercero_id
)
select t.id as tercero_id, t.razon_social,
       coalesce(ob.a_cobrar, 0) as a_cobrar,
       coalesce(ob.a_cobrar_no_exigible, 0) as a_cobrar_no_exigible,
       coalesce(ob.a_pagar, 0) as a_pagar,
       coalesce(ob.cobros_anticipados, 0) as cobros_anticipados,
       coalesce(an.anticipos_recibidos, 0) as anticipos_recibidos,
       coalesce(an.anticipos_entregados, 0) as anticipos_entregados,
       -- Positivo: el tercero le debe a AGROVIA. Negativo: AGROVIA le debe.
       coalesce(ob.a_cobrar, 0) - coalesce(ob.a_pagar, 0)
       - coalesce(an.anticipos_recibidos, 0) + coalesce(an.anticipos_entregados, 0) as saldo_neto
  from terceros t
  left join ob on ob.tercero_id = t.id
  left join an on an.tercero_id = t.id;

-- ---------------------------------------------------------------------
-- Operaciones con bolsas pendientes, comisión y reparto
-- ---------------------------------------------------------------------
create view v_operaciones with (security_invoker = true) as
select o.*,
       o.bolsas_negociadas + o.bolsas_ajustes as bolsas_totales,
       o.bolsas_negociadas + o.bolsas_ajustes - o.bolsas_cargadas as bolsas_pendientes,
       round(100.0 * o.bolsas_cargadas / nullif(o.bolsas_negociadas + o.bolsas_ajustes, 0), 1) as avance_carga_pct,
       c.id as comision_id, c.importe as comision_bruta, c.estado as estado_comision,
       c.importe - coalesce(rp.repartido, 0) as comision_neta_agrovia,
       c.importe_cobrado, c.fecha_exigible, c.fecha_cobro, c.cobro_anticipado, c.cobro_parcial,
       v.razon_social as vendedor, cp.razon_social as comprador
  from operaciones o
  join comisiones c on c.operacion_id = o.id
  join terceros v on v.id = o.vendedor_id
  left join terceros cp on cp.id = o.comprador_id
  left join lateral (
    select sum(case when p.tipo = 'porcentaje' then round(c.importe * p.valor / 100, 2) else p.valor end) as repartido
      from comision_participantes p where p.comision_id = c.id
  ) rp on true;

-- ---------------------------------------------------------------------
-- Comisiones percibidas por mes (fecha del cobro o de recepción del
-- eCheq, nunca la de cierre ni la de carga). En neto de IVA.
-- ---------------------------------------------------------------------
create view v_comisiones_percibidas with (security_invoker = true) as
select date_trunc('month', a.fecha)::date as mes,
       o.id as operacion_id, o.numero, o.modalidad,
       sum(a.importe) as cobrado_neto,
       sum(a.importe) * (1 - coalesce(max(rp.pct_repartido), 0) / 100) as cobrado_neto_agrovia
  from aplicaciones a
  join obligaciones ob on ob.id = a.obligacion_id and ob.tipo = 'comision'
  join operaciones o on o.id = ob.operacion_id
  join comisiones c on c.operacion_id = o.id
  left join lateral (
    select sum(case when p.tipo = 'porcentaje' then p.valor
                    else 100 * p.valor / nullif(c.importe, 0) end) as pct_repartido
      from comision_participantes p where p.comision_id = c.id
  ) rp on true
 where not a.anulada
 group by 1, 2, 3, 4;

-- ---------------------------------------------------------------------
-- Stock propio y disponible para vender
-- ---------------------------------------------------------------------
create view v_stock with (security_invoker = true) as
with st as (
  select producto_id, marca_id, ubicacion_tipo, ingenio_id, deposito_id, sum(bolsas) as stock
    from stock_movimientos group by 1, 2, 3, 4, 5
), vendido_sin_cargar as (
  select producto_id, marca_id, ubicacion_tipo, ingenio_id, deposito_id,
         sum(bolsas_negociadas + bolsas_ajustes - bolsas_cargadas) as bolsas
    from operaciones
   where modalidad in ('menudeo', 'compraventa') and comprador_id is not null
     and estado_comercial = 'cerrada'
   group by 1, 2, 3, 4, 5
)
select st.*, st.stock - coalesce(v.bolsas, 0) as disponible_para_vender
  from st
  left join vendido_sin_cargar v
    on  v.producto_id is not distinct from st.producto_id
   and v.marca_id is not distinct from st.marca_id
   and v.ubicacion_tipo is not distinct from st.ubicacion_tipo
   and v.ingenio_id is not distinct from st.ingenio_id
   and v.deposito_id is not distinct from st.deposito_id;

-- Reposiciones pendientes
create view v_reposiciones with (security_invoker = true) as
select r.*, r.bolsas - coalesce((select sum(m.bolsas) from reposicion_movimientos m
                                  where m.reposicion_id = r.id), 0) as pendiente
  from reposiciones r;

-- Cheques con lo usado en cada sentido
create view v_cheques with (security_invoker = true) as
select ch.*,
       cheque_usado(ch.id, 'cobrar') as aplicado_a_cobros,
       cheque_usado(ch.id, 'pagar') as aplicado_a_pagos,
       case when ch.origen = 'recibido' and ch.estado = 'en_cartera'
            then ch.importe - cheque_usado(ch.id, 'pagar') else 0 end as disponible_en_cartera
  from cheques ch;

-- Gastos con la parte que le corresponde a AGROVIA
create view v_gastos with (security_invoker = true) as
select g.*,
       case when exists (select 1 from reparto_gastos r where r.gasto_id = g.id)
            then round(g.total * coalesce((select r.porcentaje from reparto_gastos r
                                            where r.gasto_id = g.id and r.es_agrovia), 0) / 100, 2)
            else g.total end as parte_agrovia
  from gastos g;

-- ---------------------------------------------------------------------
-- Documentos (archivos en Supabase Storage, bucket privado)
-- ---------------------------------------------------------------------
create table documentos (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('liquido_producto', 'factura', 'remito', 'comprobante',
                                              'nota_credito', 'nota_debito', 'certificado_retencion',
                                              'extracto', 'contrato', 'otro')),
  nombre        text not null,
  storage_path  text not null unique,
  mime          text,
  tamano_bytes  bigint check (tamano_bytes >= 0),
  subido_por    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

create table documento_vinculos (
  id             uuid primary key default gen_random_uuid(),
  documento_id   uuid not null references documentos(id) on delete cascade,
  operacion_id   uuid references operaciones(id),
  tercero_id     uuid references terceros(id),
  carga_id       uuid references cargas(id),
  movimiento_id  uuid references movimientos(id),
  cheque_id      uuid references cheques(id),
  obligacion_id  uuid references obligaciones(id),
  check (num_nonnulls(operacion_id, tercero_id, carga_id, movimiento_id, cheque_id, obligacion_id) = 1)
);

select auditar_tabla('documentos');
select auditar_tabla('documento_vinculos');

-- ---------------------------------------------------------------------
-- Seguridad por rol (Row Level Security)
-- admin: todo. operador: comercial. finanzas: financiero.
-- lectura: ve comercial. Caja y bancos solo admin y finanzas.
-- Se aplica aunque alguien saltee la interfaz.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  comerciales text[] := array[
    'terceros', 'tercero_roles', 'tercero_cuentas_bancarias', 'productos', 'marcas', 'ingenios',
    'depositos', 'operaciones', 'operacion_ajustes', 'cargas', 'comisiones', 'comision_participantes',
    'seguimiento_pagos_directos', 'stock_movimientos', 'reposiciones', 'reposicion_movimientos',
    'documentos', 'documento_vinculos'];
  financieras text[] := array[
    'cuentas_tesoreria', 'obligaciones', 'movimientos', 'anticipos', 'cheques', 'cheque_eventos',
    'descuentos_cheque', 'aplicaciones', 'gastos', 'reparto_gastos', 'categorias_gasto',
    'extractos_importados', 'extracto_lineas'];
begin
  foreach t in array comerciales loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy lectura on %I for select to authenticated using (es_usuario_activo())', t);
    execute format($p$create policy escritura on %I for all to authenticated
                     using (tiene_rol('admin', 'operador')) with check (tiene_rol('admin', 'operador'))$p$, t);
  end loop;
  foreach t in array financieras loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy acceso on %I for all to authenticated
                     using (tiene_rol('admin', 'finanzas')) with check (tiene_rol('admin', 'finanzas'))$p$, t);
  end loop;
end;
$$;

-- Lectura de comisiones/finanzas comerciales: el operador necesita ver
-- obligaciones de sus operaciones (sin tocar tesorería)
create policy lectura_operador on obligaciones for select to authenticated
  using (tiene_rol('operador'));

alter table perfiles enable row level security;
create policy propio on perfiles for select to authenticated using (id = auth.uid() or tiene_rol('admin'));
create policy admin on perfiles for all to authenticated using (tiene_rol('admin')) with check (tiene_rol('admin'));

alter table configuracion enable row level security;
create policy lectura on configuracion for select to authenticated using (es_usuario_activo());
create policy admin on configuracion for all to authenticated using (tiene_rol('admin')) with check (tiene_rol('admin'));

alter table numeradores enable row level security;
create policy lectura on numeradores for select to authenticated using (es_usuario_activo());

alter table auditoria enable row level security;
create policy admin on auditoria for select to authenticated using (tiene_rol('admin'));

-- Nadie anónimo ve nada
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Funciones: nada para anónimos. Los usuarios logueados ejecutan las de
-- consulta y las acciones (que validan rol adentro); las internas, que
-- recalculan o tocan columnas protegidas, solo las usa el sistema.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function
  set_interno(boolean),
  recalcular_comision(uuid),
  recalcular_logistica(uuid),
  sincronizar_obligaciones_operacion(uuid),
  auditar_tabla(regclass)
from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
