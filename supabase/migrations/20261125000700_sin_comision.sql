-- Operaciones con comisión/utilidad 0 (compra = venta): estado 'Sin comisión'
-- en lugar de 'Pendiente de cobro'. El valor del enum va en una migración aparte
-- (20261125000650) porque Postgres no deja usarlo en la misma transacción.

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
    when v_importe <= 0 then 'sin_comision'
    when v_cobrado >= v_importe then 'cobrada'
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


-- Recalcular las existentes
select recalcular_comision(id) from operaciones;

revoke execute on function recalcular_comision(uuid) from public, anon, authenticated;
