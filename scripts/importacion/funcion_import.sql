create or replace function importar_planilla(p jsonb) returns int
language plpgsql security definer set search_path = public, auth as $$
declare
  f jsonb; v_op uuid; v_vend uuid; v_comp uuid; v_marca uuid; ob record; n int := 0;
  v_mod modalidad_operacion; v_tipo tipo_comision; v_fecha date;
  v_prod uuid := (select id from productos order by nombre limit 1);
begin
  for f in select * from jsonb_array_elements(p) loop
    v_mod := case f->>1 when 'F' then 'facturado' when 'M' then 'menudeo' else 'compraventa' end;
    v_tipo := case f->>15 when 'D' then 'diferencia' when 'P' then 'porcentaje' when 'F' then 'fija' else 'por_bolsa' end;
    v_fecha := (f->>2)::date;
    if exists (select 1 from operaciones where modalidad = v_mod and numero_seq = (f->>0)::int) then continue; end if;

    insert into terceros (razon_social) select f->>3
      where not exists (select 1 from terceros where lower(btrim(razon_social)) = lower(f->>3));
    select id into v_vend from terceros where lower(btrim(razon_social)) = lower(f->>3);
    insert into tercero_roles values (v_vend, 'productor') on conflict do nothing;
    v_comp := null;
    if f->>4 is not null then
      insert into terceros (razon_social) select f->>4
        where not exists (select 1 from terceros where lower(btrim(razon_social)) = lower(f->>4));
      select id into v_comp from terceros where lower(btrim(razon_social)) = lower(f->>4);
      insert into tercero_roles values (v_comp, 'comprador') on conflict do nothing;
    end if;
    select id into v_marca from marcas where lower(nombre) = lower(f->>5);

    insert into operaciones (modalidad, numero_seq, fecha_cierre, vendedor_id, comprador_id, producto_id, marca_id, zafra,
      bolsas_negociadas, precio_compra, precio_venta, costo_flete, costo_iibb, costo_dyc, costo_otros, costo_ganancias,
      comision_tipo, comision_valor, observaciones)
    values (v_mod, (f->>0)::int, v_fecha, v_vend, v_comp, v_prod, v_marca, (f->>6)::int, (f->>7)::int,
      (f->>8)::numeric, (f->>9)::numeric, (f->>10)::numeric, (f->>11)::numeric, (f->>12)::numeric, (f->>13)::numeric, (f->>14)::numeric,
      v_tipo, (f->>16)::numeric, 'Importada de la planilla' || coalesce(' · ' || (f->>19), ''))
    returning id into v_op;

    if (f->>17)::int > 0 then
      insert into cargas (operacion_id, fecha, bolsas, observaciones) values (v_op, v_fecha, (f->>17)::int, 'Importada de la planilla');
    end if;
    if (f->>18)::int = 1 then
      for ob in select o.id, o.importe - obligacion_aplicado(o.id) as pend from obligaciones o
                 where o.operacion_id = v_op and not o.anulada loop
        if ob.pend > 0 then
          insert into aplicaciones (obligacion_id, origen, importe, fecha, nota)
          values (ob.id, 'previo', ob.pend, v_fecha, 'Cobrado según la planilla (antes del sistema)');
        end if;
      end loop;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function importar_planilla(jsonb) from public, anon, authenticated;
