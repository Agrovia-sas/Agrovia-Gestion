do $$
declare
  r jsonb;
  v_op uuid;
  v_vend uuid;
  v_comp uuid;
  v_marca uuid;
  ob record;
  v_prod uuid := (select id from productos order by nombre limit 1);
begin
  for r in select * from jsonb_array_elements('__PAYLOAD__'::jsonb) loop
    -- Terceros (se crean si faltan, con su rol)
    insert into terceros (razon_social) select r->>'vendedor'
      where not exists (select 1 from terceros where lower(btrim(razon_social)) = lower(r->>'vendedor'));
    select id into v_vend from terceros where lower(btrim(razon_social)) = lower(r->>'vendedor');
    insert into tercero_roles (tercero_id, rol) values (v_vend, 'productor') on conflict do nothing;
    v_comp := null;
    if r->>'comprador' is not null then
      insert into terceros (razon_social) select r->>'comprador'
        where not exists (select 1 from terceros where lower(btrim(razon_social)) = lower(r->>'comprador'));
      select id into v_comp from terceros where lower(btrim(razon_social)) = lower(r->>'comprador');
      insert into tercero_roles (tercero_id, rol) values (v_comp, 'comprador') on conflict do nothing;
    end if;
    select id into v_marca from marcas where lower(nombre) = lower(r->>'marca');

    -- Si el número ya existe, no se duplica
    if exists (select 1 from operaciones where modalidad = (r->>'modalidad')::modalidad_operacion
               and numero_seq = (r->>'seq')::int) then
      raise notice 'Ya existe %, se omite', r->>'numero';
      continue;
    end if;

    insert into operaciones (modalidad, numero_seq, fecha_cierre, vendedor_id, comprador_id, producto_id, marca_id, zafra,
      bolsas_negociadas, precio_compra, precio_venta, costo_flete, costo_iibb, costo_dyc, costo_otros, costo_ganancias,
      comision_tipo, comision_valor, observaciones)
    values ((r->>'modalidad')::modalidad_operacion, (r->>'seq')::int, (r->>'fecha')::date, v_vend, v_comp, v_prod, v_marca,
      (r->>'zafra')::int, (r->>'bolsas')::int, (r->>'compra')::numeric, (r->>'venta')::numeric,
      (r->>'flete')::numeric, (r->>'iibb')::numeric, (r->>'dyc')::numeric, (r->>'otros')::numeric, (r->>'ganancias')::numeric,
      (r->>'tipo')::tipo_comision, (r->>'valor')::numeric, r->>'obs')
    returning id into v_op;

    if (r->>'cargadas')::int > 0 then
      insert into cargas (operacion_id, fecha, bolsas, observaciones)
      values (v_op, (r->>'fecha')::date, (r->>'cargadas')::int, 'Importada de la planilla');
    end if;

    -- "Cobrado" en la planilla: cobro (y en compra-reventa, también el pago) previo al sistema
    if (r->>'cobrado')::boolean then
      for ob in select o.id, o.importe - obligacion_aplicado(o.id) as pend from obligaciones o
                 where o.operacion_id = v_op and not o.anulada loop
        if ob.pend > 0 then
          insert into aplicaciones (obligacion_id, origen, importe, fecha, nota)
          values (ob.id, 'previo', ob.pend, (r->>'fecha')::date, 'Cobrado según la planilla (antes del sistema)');
        end if;
      end loop;
    end if;
  end loop;
end;
$$;
