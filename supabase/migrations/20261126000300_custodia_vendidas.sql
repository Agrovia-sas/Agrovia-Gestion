-- La deuda con el dueño nace al vender, no al cargar: se suman las bolsas
-- vendidas en operaciones en custodia que todavía no se cargaron.
--   a_reponer_total = entregadas no repuestas + vendidas sin cargar
--   libres          = físicas − vendidas sin cargar (lo que todavía se puede vender)
create or replace view v_custodia_saldos with (security_invoker = true) as
with mov as (
  select m.dueno_id,
         coalesce(sum(case when m.tipo in ('ingreso', 'reposicion') then m.bolsas
                           when m.tipo in ('entrega', 'retiro') then -m.bolsas else 0 end), 0)::integer as fisicas,
         coalesce(sum(case when m.tipo = 'entrega' then m.bolsas
                           when m.tipo in ('reposicion', 'pago_plata') then -m.bolsas else 0 end), 0)::integer as a_reponer,
         coalesce(sum(m.importe) filter (where m.tipo = 'pago_plata'), 0) as pagado_en_plata,
         max(m.fecha) as ultimo_movimiento
    from custodia_movimientos m group by m.dueno_id
), vend as (
  select vendedor_id as dueno_id,
         sum(bolsas_negociadas + bolsas_ajustes - bolsas_cargadas)::integer as vendidas_sin_cargar
    from operaciones
   where bolsas_en_custodia and estado_comercial = 'cerrada'
   group by vendedor_id
)
select t.id as dueno_id, t.razon_social as dueno,
       mov.fisicas, mov.a_reponer, mov.pagado_en_plata, mov.ultimo_movimiento,
       coalesce(vend.vendidas_sin_cargar, 0) as vendidas_sin_cargar,
       mov.a_reponer + coalesce(vend.vendidas_sin_cargar, 0) as a_reponer_total,
       mov.fisicas - coalesce(vend.vendidas_sin_cargar, 0) as libres
  from mov
  join terceros t on t.id = mov.dueno_id
  left join vend on vend.dueno_id = mov.dueno_id;

-- Se puede reponer (o pagar) hasta lo que se debe, contando lo vendido sin cargar
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
    select a_reponer_total into v_debe from v_custodia_saldos where dueno_id = new.dueno_id;
    if new.bolsas > coalesce(v_debe, 0) then
      raise exception 'A % se le deben % bolsas: no se puede reponer o pagar %',
        (select razon_social from terceros where id = new.dueno_id), coalesce(v_debe, 0), new.bolsas;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function fn_custodia_check() from public, anon, authenticated;
