-- =====================================================================
-- AGROVIA SAS — Edición completa de operaciones (26/11/2026)
-- Al cambiar vendedor, comprador (o quitarlo), precios, ubicación o marca,
-- el sistema acomoda solo deudas, comisión y stock propio, siempre que no
-- haya cobros o pagos aplicados a lo que cambia.
-- =====================================================================

-- El tercero de una obligación se puede cambiar solo desde el sistema y sin cobros/pagos aplicados
create or replace function fn_obligaciones_proteger()
returns trigger language plpgsql set search_path = public, auth as $$
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
    if new.sentido is distinct from old.sentido then
      raise exception 'El sentido de una obligación no se cambia';
    end if;
    if new.tercero_id is distinct from old.tercero_id then
      if not es_escritura_interna() then
        raise exception 'El tercero de una obligación no se cambia a mano: se cambia desde la operación';
      end if;
      if obligacion_aplicado(old.id) > 0 then
        raise exception 'Ya hay cobros o pagos aplicados a "%": no se puede cambiar de tercero. Revertí esos cobros o pagos primero.', old.concepto;
      end if;
    end if;
  end if;
  return new;
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
  perform set_interno(true);

  -- Facturado: la comisión se le cobra al comprador
  if o.modalidad = 'facturado' then
    update obligaciones set tercero_id = o.comprador_id
     where comision_id = (select id from comisiones where operacion_id = o.id)
       and tercero_id is distinct from o.comprador_id and o.comprador_id is not null;
    perform set_interno(false);
    return;
  end if;

  v_tipo_compra := case o.modalidad when 'menudeo' then 'compra_sin_factura' else 'liquido_producto' end;
  v_tipo_venta  := case o.modalidad when 'menudeo' then 'venta_sin_factura' else 'factura' end;
  v_bolsas := o.bolsas_negociadas;

  -- Deuda con el productor (en custodia la deuda es en bolsas)
  if o.bolsas_en_custodia then
    update obligaciones set anulada = true, motivo_anulacion = 'Bolsas en custodia: la deuda con el dueño es en bolsas'
     where operacion_id = o.id and sentido = 'pagar' and ajuste_id is null and not anulada
       and obligacion_aplicado(id) = 0;
  else
    select * into ob from obligaciones
     where operacion_id = o.id and ajuste_id is null and sentido = 'pagar' and tipo = v_tipo_compra;
    if ob.id is not null and ob.anulada and ob.motivo_anulacion like 'Bolsas en custodia%' then
      update obligaciones set anulada = false, motivo_anulacion = null where id = ob.id;
      ob.anulada := false;
    end if;
    if ob.id is null then
      insert into obligaciones (sentido, tipo, tercero_id, operacion_id, importe, fecha, concepto)
      values ('pagar', v_tipo_compra, o.vendedor_id, o.id, importe_operacion(o, o.precio_compra, v_bolsas),
              o.fecha_cierre, 'Compra operación ' || o.numero);
    elsif not ob.anulada then
      update obligaciones set importe = importe_operacion(o, o.precio_compra, v_bolsas), tercero_id = o.vendedor_id, fecha = o.fecha_cierre
       where id = ob.id
         and (importe, tercero_id, fecha) is distinct from (importe_operacion(o, o.precio_compra, v_bolsas), o.vendedor_id, o.fecha_cierre);
    end if;
  end if;

  -- Crédito con el comprador
  select * into ob from obligaciones
   where operacion_id = o.id and ajuste_id is null and sentido = 'cobrar' and tipo = v_tipo_venta;
  if o.comprador_id is not null and o.precio_venta is not null then
    if ob.id is not null and ob.anulada and (ob.motivo_anulacion like 'Sin venta%' or ob.motivo_anulacion like 'Ya no se vende%') then
      update obligaciones set anulada = false, motivo_anulacion = null where id = ob.id;
      ob.anulada := false;
    end if;
    if ob.id is null then
      insert into obligaciones (sentido, tipo, tercero_id, operacion_id, importe, fecha, concepto)
      values ('cobrar', v_tipo_venta, o.comprador_id, o.id, importe_operacion(o, o.precio_venta, v_bolsas),
              o.fecha_cierre, 'Venta operación ' || o.numero);
    elsif not ob.anulada then
      update obligaciones set importe = importe_operacion(o, o.precio_venta, v_bolsas), tercero_id = o.comprador_id, fecha = o.fecha_cierre
       where id = ob.id
         and (importe, tercero_id, fecha) is distinct from (importe_operacion(o, o.precio_venta, v_bolsas), o.comprador_id, o.fecha_cierre);
    end if;
  elsif ob.id is not null and not ob.anulada then
    -- Se quitó el comprador o el precio de venta: ya no hay venta
    update obligaciones set anulada = true, motivo_anulacion = 'Sin venta: se quitó el comprador o el precio de venta'
     where id = ob.id;
  end if;

  -- Cancelación
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
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if tg_op = 'INSERT'
     or (new.precio_compra, new.precio_venta, new.comprador_id, new.vendedor_id, new.precios_incluyen_iva,
         new.alicuota_iva, new.estado_comercial, new.fecha_cierre)
        is distinct from
        (old.precio_compra, old.precio_venta, old.comprador_id, old.vendedor_id, old.precios_incluyen_iva,
         old.alicuota_iva, old.estado_comercial, old.fecha_cierre) then
    if new.modalidad <> 'facturado' or tg_op = 'UPDATE' then
      perform sincronizar_obligaciones_operacion(new.id);
    end if;
  end if;

  -- Stock propio: la entrada de la compra sigue a la operación (lugar, marca, fecha, costo)
  if tg_op = 'UPDATE' and new.modalidad <> 'facturado' and not new.bolsas_en_custodia
     and (new.ubicacion_tipo, new.ingenio_id, new.deposito_id, new.marca_id, new.producto_id, new.fecha_cierre, new.precio_compra)
         is distinct from
         (old.ubicacion_tipo, old.ingenio_id, old.deposito_id, old.marca_id, old.producto_id, old.fecha_cierre, old.precio_compra) then
    update stock_movimientos set ubicacion_tipo = new.ubicacion_tipo, ingenio_id = new.ingenio_id, deposito_id = new.deposito_id,
           marca_id = new.marca_id, producto_id = new.producto_id, fecha = new.fecha_cierre, costo_unitario = new.precio_compra
     where operacion_id = new.id and tipo = 'entrada_compra' and ajuste_id is null;
  end if;
  return new;
end;
$$;

revoke execute on function fn_obligaciones_proteger(), fn_operaciones_obligaciones() from public, anon, authenticated;
revoke execute on function sincronizar_obligaciones_operacion(uuid) from public, anon, authenticated;
