-- Compra-venta facturada: LP al productor (deuda), factura al cliente (crédito),
-- eCheqs endosados; los que sobran son el margen
do $$
declare op uuid; deuda uuid; credito uuid; ch1 uuid; ch2 uuid; galicia numeric; prod uuid; cli uuid;
begin
  prod := t.tercero('JUAREZ CHICO');
  cli := t.tercero('NORDESTE SRL');
  insert into operaciones (modalidad, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta)
  values ('compraventa', prod, cli, 300, 34000, 40000) returning id into op;

  select id into deuda from obligaciones where operacion_id = op and sentido = 'pagar';
  select id into credito from obligaciones where operacion_id = op and sentido = 'cobrar';
  perform t.igual((select importe from obligaciones where id = deuda), 12342000.00, 'LP: 34.000 × 300 + IVA 21%');
  perform t.igual((select importe from obligaciones where id = credito), 14520000.00, 'factura: 40.000 × 300 + IVA 21%');
  perform t.igual((select sum(stock) from v_stock), 300::numeric, 'la compra suma stock');
  perform t.igual((select sum(disponible_para_vender) from v_stock), 0::numeric, 'vendido sin cargar: no disponible');

  -- El cliente paga con dos eCheqs que cancelan su deuda
  galicia := t.saldo('Banco Galicia');
  ch1 := t.cheque('E-1', 12342000, 'NORDESTE SRL');
  ch2 := t.cheque('E-2', 2178000, 'NORDESTE SRL');
  insert into aplicaciones (obligacion_id, origen, cheque_id, importe) values (credito, 'cheque', ch1, 12342000), (credito, 'cheque', ch2, 2178000);
  perform t.igual((select pendiente from v_obligaciones where id = credito), 0::numeric, 'cliente cancelado');

  -- AGROVIA endosa el primero al productor: cancela la deuda con él
  perform endosar_cheque(ch1, prod, deuda);
  perform t.igual((select pendiente from v_obligaciones where id = deuda), 0::numeric, 'productor cancelado con el endoso');
  perform t.igual(t.saldo('Banco Galicia'), galicia, 'endosar no mueve Galicia');

  -- El que sobra es el margen y entra a Galicia al acreditarse
  update cheques set estado = 'depositado', cuenta_id = t.cuenta('Banco Galicia') where id = ch2;
  update cheques set estado = 'acreditado' where id = ch2;
  perform t.igual(t.saldo('Banco Galicia'), galicia + 2178000, 'margen acreditado');
  perform t.igual((t.comision(op)).importe, 1800000.00, 'utilidad (6.000 × 300, sin IVA)');

  -- Stock se descuenta recién cuando carga el cliente
  perform t.cargar(op, 300);
  perform t.igual((select sum(stock) from v_stock), 0::numeric, 'la carga descuenta stock');
  perform t.igual((t.comision(op)).estado, 'cobrada'::estado_comision, 'utilidad cobrada');

  -- Si el endosado se rechaza: el cliente vuelve a deber y AGROVIA vuelve a deberle al productor
  update cheques set estado = 'rechazado' where id = ch1;
  perform t.igual((select pendiente from v_obligaciones where id = credito), 12342000.00, 'el cliente vuelve a deber');
  perform t.igual((select pendiente from v_obligaciones where id = deuda), 12342000.00, 'se vuelve a deber al productor');
  perform t.igual((t.comision(op)).estado, 'pendiente_cobro'::estado_comision, 'utilidad ya no está cobrada del todo');
end $$;

-- Menudeo: efectivo por Caja, sin IVA; deuda y crédito igual que compra-venta
do $$
declare op uuid; m uuid;
begin
  op := t.operacion('menudeo', 600, 31500, 32000, 'TEMAS INDUSTRIALES', 'MILLENIUM ECOLOGICO');
  perform t.igual((select importe from obligaciones where operacion_id = op and sentido = 'pagar'), 18900000.00, 'deuda sin IVA');
  perform t.igual((select importe from obligaciones where operacion_id = op and sentido = 'cobrar'), 19200000.00, 'crédito sin IVA');
  perform t.igual((t.comision(op)).importe, 300000.00, 'resultado = 500 × 600');

  m := t.mov('Caja efectivo', 19200000, 'MILLENIUM ECOLOGICO');
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe)
  select id, 'movimiento', m, 19200000 from obligaciones where operacion_id = op and sentido = 'cobrar';
  m := t.mov('Caja efectivo', -18900000, 'TEMAS INDUSTRIALES');
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe)
  select id, 'movimiento', m, 18900000 from obligaciones where operacion_id = op and sentido = 'pagar';
  perform t.igual(t.saldo('Caja efectivo'), 300000.00, 'en Caja queda la diferencia');
  perform t.igual((t.comision(op)).estado, 'cobrada'::estado_comision, 'cobrada antes de cargar');
  perform t.ok((t.comision(op)).cobro_anticipado, 'marcada como cobro anticipado');
  perform t.cargar(op, 600);

  -- Ampliación en menudeo: genera deuda y crédito por la diferencia y suma stock
  insert into operacion_ajustes (operacion_id, delta_bolsas, motivo) values (op, 40, 'Equipo más grande');
  perform t.igual((select sum(importe) from obligaciones where operacion_id = op and sentido = 'cobrar' and tipo = 'nota_debito'), 1280000.00, 'crédito por la ampliación');
  perform t.igual((t.comision(op)).importe, 320000.00, 'resultado recalculado');
end $$;

-- Cancelar una operación sin cobros: anula comisión y obligaciones
do $$
declare op uuid;
begin
  op := t.operacion('menudeo', 100, 1000, 1100);
  update operaciones set estado_comercial = 'cancelada', motivo_cancelacion = 'No se concretó' where id = op;
  perform t.igual((t.comision(op)).estado, 'anulada'::estado_comision, 'comisión anulada');
  perform t.igual((select count(*) from v_obligaciones where operacion_id = op), 0::bigint, 'obligaciones anuladas');
  perform t.falla(format('select t.cargar(%L, 10)', op), 'cancelada', 'no se carga una cancelada');
end $$;
