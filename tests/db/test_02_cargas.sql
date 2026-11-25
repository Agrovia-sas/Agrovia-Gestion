-- Bolsas pendientes = negociadas + ajustes − cargadas; nunca se supera lo pendiente
do $$
declare op uuid; ing uuid; o record;
begin
  insert into ingenios (nombre) values ('Ingenio Leach') returning id into ing;
  op := t.operacion('facturado', 2400, 35000, 35500);
  update operaciones set ubicacion_tipo = 'ingenio', ingenio_id = ing where id = op;

  perform t.cargar(op, 600, 'R-001');
  perform t.cargar(op, 600, 'R-002');
  select * into o from v_operaciones where id = op;
  perform t.igual(o.bolsas_cargadas, 1200, 'cargadas');
  perform t.igual(o.bolsas_pendientes, 1200, 'pendientes');
  perform t.igual(o.avance_carga_pct, 50.0, 'avance 50%');
  perform t.igual(o.estado_logistico, 'carga_parcial'::estado_logistico, 'estado parcial');

  -- Superar lo pendiente se rechaza
  perform t.falla(format('select t.cargar(%L, 1201)', op), 'supera lo pendiente', 'carga mayor a lo pendiente');

  -- Remito repetido en el mismo ingenio se rechaza (sin importar mayúsculas)
  perform t.falla(format('select t.cargar(%L, 10, ''r-001'')', op), 'duplicate', 'remito repetido');

  -- Columnas calculadas no se tipean
  perform t.falla(format('update operaciones set bolsas_cargadas = 0 where id = %L', op), 'se calculan solos', 'cargadas no se tipean');
  perform t.falla(format('update operaciones set bolsas_negociadas = 3000 where id = %L', op), 'ajuste autorizado', 'negociadas no se editan');
  -- Ni siquiera activando la marca interna desde una sentencia común de usuario
  set local role authenticated;
  perform set_config('agrovia.interno', 'on', true);
  perform t.ok(not es_escritura_interna(), 'un usuario no puede activar la escritura interna');
  reset role;
  perform set_config('agrovia.interno', 'off', true);

  -- Para cargar más hay que registrar un ajuste autorizado con motivo
  perform t.falla(format('insert into operacion_ajustes (operacion_id, delta_bolsas, motivo) values (%L, 100, '' '')', op),
                  'check', 'ajuste sin motivo');
  insert into operacion_ajustes (operacion_id, delta_bolsas, motivo) values (op, 100, 'Ampliación pedida por el comprador');
  perform t.cargar(op, 1300);
  select * into o from v_operaciones where id = op;
  perform t.igual(o.bolsas_totales, 2500, 'total con ajuste');
  perform t.igual(o.bolsas_pendientes, 0, 'sin pendientes');
  perform t.igual(o.estado_logistico, 'carga_completada'::estado_logistico, 'pasa solo a carga completada');

  -- Un ajuste no puede dejar menos bolsas que las cargadas
  perform t.falla(format('insert into operacion_ajustes (operacion_id, delta_bolsas, motivo) values (%L, -10, ''Reducción'')', op),
                  'menos bolsas', 'reducción por debajo de lo cargado');

  -- Borrar una carga recalcula
  delete from cargas where operacion_id = op and bolsas = 1300;
  perform t.igual((select estado_logistico from operaciones where id = op), 'carga_parcial'::estado_logistico, 'vuelve a parcial');

  -- Facturado no mueve stock propio
  perform t.igual((select count(*) from stock_movimientos where operacion_id = op), 0::bigint, 'facturado sin stock');

  -- No se cancela con cargas
  perform t.falla(format('update operaciones set estado_comercial = ''cancelada'', motivo_cancelacion = ''x'' where id = %L', op),
                  'ya tiene', 'cancelar con cargas');
end $$;
