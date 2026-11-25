-- Importación de extractos: sin duplicados, conciliación
do $$
declare ex uuid; ex2 uuid; gal uuid := t.cuenta('Banco Galicia'); m uuid; l uuid; antes numeric;
begin
  insert into extractos_importados (cuenta_id, archivo_nombre, archivo_hash) values (gal, 'nov.xlsx', 'h1') returning id into ex;
  -- Dos transferencias iguales el mismo día son legítimas (distinto saldo)
  insert into extracto_lineas (extracto_id, cuenta_id, orden, fecha, concepto, referencia, importe, saldo_linea) values
    (ex, gal, 1, '2026-11-20', 'TRANSF LODISER', 'T1', 100000, 600000),
    (ex, gal, 2, '2026-11-20', 'TRANSF LODISER', 'T1', 100000, 700000);
  perform t.igual((select count(*) from extracto_lineas where extracto_id = ex), 2::bigint, 'dos líneas iguales legítimas');

  -- El mismo archivo no se importa dos veces
  perform t.falla(format('insert into extractos_importados (cuenta_id, archivo_nombre, archivo_hash) values (%L, ''nov.xlsx'', ''h1'')', gal),
                  'duplicate', 'archivo repetido');
  -- Un extracto que se superpone: la línea ya existente no se vuelve a importar
  insert into extractos_importados (cuenta_id, archivo_nombre, archivo_hash) values (gal, 'nov2.xlsx', 'h2') returning id into ex2;
  perform t.falla(format('insert into extracto_lineas (extracto_id, cuenta_id, orden, fecha, concepto, referencia, importe, saldo_linea) values (%L, %L, 7, ''2026-11-20'', ''TRANSF LODISER'', ''T1'', 100000, 600000)', ex2, gal),
                  'duplicate', 'línea repetida');

  -- Si coincide con un movimiento cargado a mano, se concilia (no se duplica)
  antes := t.saldo('Banco Galicia');
  m := t.mov('Banco Galicia', 100000, 'LODISER');
  select id into l from extracto_lineas where extracto_id = ex and orden = 1;
  perform conciliar_linea(l, m);
  perform t.igual((select estado from extracto_lineas where id = l), 'conciliada'::estado_linea_extracto, 'conciliada');
  perform t.igual(t.saldo('Banco Galicia'), antes + 100000, 'conciliar no duplica el saldo');
  -- La otra línea genera su propio movimiento
  perform movimiento_desde_linea((select id from extracto_lineas where extracto_id = ex and orden = 2), null);
  perform t.igual(t.saldo('Banco Galicia'), antes + 200000, 'línea nueva → movimiento');
end $$;

-- Descuento de cheque: entra el neto a Galicia, la diferencia es gasto financiero
do $$
declare ch uuid; d descuentos_cheque; antes numeric;
begin
  antes := t.saldo('Banco Galicia');
  ch := t.cheque('E-900', 1000000, 'LODISER');
  perform descontar_cheque(ch, t.cuenta('Banco Galicia'), 'Banco Galicia', 3, 30, 0, 5000, 1050);
  select * into d from descuentos_cheque where cheque_id = ch;
  perform t.igual(d.interes, 30000.00, 'interés 3% mensual × 30 días');
  perform t.igual(d.neto, 963950.00, 'neto');
  perform t.igual(t.saldo('Banco Galicia'), antes + 963950, 'entra el neto');
  perform t.igual((select total from gastos where descuento_id = d.id), 36050.00, 'gasto financiero');
  -- Rechazo de un cheque descontado: el banco debita el importe completo
  update cheques set estado = 'rechazado' where id = ch;
  perform t.igual(t.saldo('Banco Galicia'), antes - 36050, 'rechazo debita el total');
end $$;

-- Gastos: oficina compartida con los arquitectos, solo cuenta la parte de AGROVIA
do $$
declare g uuid; prov uuid;
begin
  prov := t.tercero('Inmobiliaria Centro');
  insert into gastos (categoria_id, proveedor_id, descripcion, importe_neto, forma)
  values ((select id from categorias_gasto where nombre = 'Alquiler oficina'), prov, 'Alquiler noviembre', 900000, 'a_pagar')
  returning id into g;
  perform t.igual((select a_pagar from v_cuentas_corrientes where tercero_id = prov), 900000.00, 'genera cuenta a pagar');
  insert into reparto_gastos (gasto_id, participante, es_agrovia, porcentaje) values
    (g, 'AGROVIA', true, 33.33), (g, 'Arquitecto 1', false, 33.33), (g, 'Arquitecto 2', false, 33.34);
  perform t.igual((select parte_agrovia from v_gastos where id = g), 299970.00, 'parte de AGROVIA');
  perform t.falla(format('insert into reparto_gastos (gasto_id, participante, porcentaje) values (%L, ''Otro'', 1)', g), '100%', 'reparto mayor a 100%');
end $$;

-- Reposiciones: entregas parciales, nunca más de lo pendiente
do $$
declare r uuid;
begin
  insert into reposiciones (sentido, tercero_id, motivo, bolsas) values ('agrovia_debe', t.tercero('EL BAJO SRL'), 'prestamo', 100) returning id into r;
  insert into reposicion_movimientos (reposicion_id, bolsas) values (r, 60);
  perform t.igual((select pendiente from v_reposiciones where id = r), 40::bigint, 'pendiente 40');
  perform t.falla(format('insert into reposicion_movimientos (reposicion_id, bolsas) values (%L, 41)', r), 'supera', 'más de lo pendiente');
end $$;
