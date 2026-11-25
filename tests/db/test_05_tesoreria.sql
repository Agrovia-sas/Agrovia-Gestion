-- Libro de movimientos inmutable, saldos calculados, transferencias
do $$
declare m uuid; b uuid; contra uuid; tr uuid; ob uuid;
begin
  update cuentas_tesoreria set saldo_inicial = 1000000 where nombre = 'Banco Galicia';
  perform t.igual(t.saldo('Banco Galicia'), 1000000.00, 'saldo inicial');

  m := t.mov('Banco Galicia', 250000, 'LODISER');
  perform t.mov('Banco Galicia', -50000);
  insert into movimientos (cuenta_id, importe, concepto, estado) values (t.cuenta('Banco Galicia'), 999, 'Borrador', 'borrador')
  returning id into b;
  perform t.igual(t.saldo('Banco Galicia'), 1200000.00, 'solo confirmados mueven el saldo');

  -- Un confirmado no se edita ni se borra
  perform t.falla(format('update movimientos set importe = 1 where id = %L', m), 'no se edita', 'no se edita');
  perform t.falla(format('delete from movimientos where id = %L', m), 'no se borra', 'no se borra');
  delete from movimientos where id = b;  -- un borrador sí

  -- Reversión: contramovimiento vinculado con motivo; libera la deuda
  insert into obligaciones (sentido, tipo, tercero_id, importe, concepto)
  values ('cobrar', 'factura', t.tercero('LODISER'), 250000, 'Factura de prueba') returning id into ob;
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (ob, 'movimiento', m, 250000);
  perform t.igual((select pendiente from v_obligaciones where id = ob), 0::numeric, 'cancelada');
  perform t.falla(format('select revertir_movimiento(%L, '''')', m), 'motivo', 'reversión sin motivo');
  contra := revertir_movimiento(m, 'Transferencia cargada dos veces');
  perform t.igual(t.saldo('Banco Galicia'), 950000.00, 'la reversión deja el saldo sin ese ingreso');
  perform t.igual((select estado from movimientos where id = m), 'revertido'::estado_movimiento, 'original revertido');
  perform t.igual((select revierte_a from movimientos where id = contra), m, 'vinculado al original');
  perform t.igual((select pendiente from v_obligaciones where id = ob), 250000.00, 'la deuda vuelve a pendiente');
  perform t.falla(format('select revertir_movimiento(%L, ''otra vez'')', m), 'solo se revierten', 'no se revierte dos veces');

  -- Transferencia Galicia → Caja: dos movimientos que suman cero
  tr := transferir_entre_cuentas(t.cuenta('Banco Galicia'), t.cuenta('Caja efectivo'), 100000);
  perform t.igual(t.saldo('Banco Galicia'), 850000.00, 'sale de Galicia');
  perform t.igual(t.saldo('Caja efectivo'), 100000.00, 'entra a Caja');
  perform t.igual((select sum(importe) from movimientos where id = tr or par_transferencia = tr), 0::numeric, 'suman cero');
  perform t.falla(format('insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (%L, ''movimiento'', (select par_transferencia from movimientos where id = %L), 1)', ob, tr),
                  'no cancela', 'una transferencia propia no es cobro');
  -- Revertir una mitad revierte la transferencia entera
  perform revertir_movimiento(tr, 'Error de carga');
  perform t.igual(t.saldo('Caja efectivo'), 0::numeric, 'transferencia revertida entera');
end $$;
