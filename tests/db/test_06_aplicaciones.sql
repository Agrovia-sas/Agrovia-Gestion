-- No se aplica más de lo pendiente ni más de lo disponible; un pago cubre varias deudas
do $$
declare o1 uuid; o2 uuid; m uuid; p uuid; cli uuid;
begin
  cli := t.tercero('LODISER');
  insert into obligaciones (sentido, tipo, tercero_id, importe, concepto) values ('cobrar', 'factura', cli, 100000, 'F1') returning id into o1;
  insert into obligaciones (sentido, tipo, tercero_id, importe, concepto) values ('cobrar', 'factura', cli, 50000, 'F2') returning id into o2;
  m := t.mov('Banco Galicia', 120000, 'LODISER');

  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (o1, 'movimiento', m, 100000);
  perform t.falla(format('insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (%L, ''movimiento'', %L, 30000)', o2, m),
                  'disponible suficiente', 'más de lo disponible del pago');
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (o2, 'movimiento', m, 20000);
  perform t.igual(movimiento_disponible(m), 0::numeric, 'pago totalmente aplicado a dos facturas');
  perform t.igual((select a_cobrar from v_cuentas_corrientes where tercero_id = cli), 30000.00, 'queda 30.000');

  m := t.mov('Banco Galicia', 90000, 'LODISER');
  perform t.falla(format('insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (%L, ''movimiento'', %L, 40000)', o2, m),
                  'pendiente', 'más de lo pendiente de la obligación');

  -- Un egreso no cancela una cuenta a cobrar
  perform t.falla(format('insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (%L, ''movimiento'', %L, 1)', o2, t.mov('Banco Galicia', -10)),
                  'ingreso', 'sentido del movimiento');

  -- Retención: cancela parte de la deuda con su certificado
  perform t.falla(format('insert into aplicaciones (obligacion_id, origen, retencion_tipo, importe) values (%L, ''retencion'', ''IIBB'', 1000)', o2),
                  'certificado', 'retención sin certificado');
  insert into aplicaciones (obligacion_id, origen, retencion_tipo, retencion_certificado, importe)
  values (o2, 'retencion', 'IIBB', 'CERT-0001', 1500);
  perform t.igual((select pendiente from v_obligaciones where id = o2), 28500.00, 'cobrado + retenido cierra contra lo facturado');

  -- Compensación entre deudas cruzadas del mismo tercero
  insert into obligaciones (sentido, tipo, tercero_id, importe, concepto) values ('pagar', 'factura', cli, 8500, 'Le debemos') returning id into p;
  insert into aplicaciones (obligacion_id, origen, obligacion_compensada_id, importe) values (o2, 'compensacion', p, 8500);
  perform t.igual((select pendiente from v_obligaciones where id = o2), 20000.00, 'compensada del lado a cobrar');
  perform t.igual((select pendiente from v_obligaciones where id = p), 0::numeric, 'compensada del lado a pagar');

  -- Una aplicación no se borra ni se edita
  perform t.falla(format('delete from aplicaciones where obligacion_id = %L', o1), 'no se borra', 'no se borra');
  perform t.falla(format('update aplicaciones set importe = 1 where obligacion_id = %L', o1), 'no se edita', 'no se edita');
  perform t.falla(format('update obligaciones set importe = 10 where id = %L', o1), 'por debajo', 'importe bajo lo aplicado');
end $$;

-- Anticipos: saldo a favor / en contra hasta aplicarse, no es ingreso
do $$
declare m uuid; an uuid; ob uuid; prod uuid;
begin
  prod := t.tercero('JUAREZ CHICO');
  m := t.mov('Banco Galicia', -200000, 'JUAREZ CHICO');
  perform t.falla(format('insert into anticipos (sentido, tercero_id, movimiento_id, importe) values (''recibido'', %L, %L, 1)', prod, m),
                  'egreso', 'anticipo entregado sale de un egreso');
  insert into anticipos (sentido, tercero_id, movimiento_id, importe) values ('entregado', prod, m, 200000) returning id into an;
  perform t.igual((select anticipos_entregados from v_cuentas_corrientes where tercero_id = prod), 200000.00, 'saldo a favor');
  insert into obligaciones (sentido, tipo, tercero_id, importe, concepto) values ('pagar', 'liquido_producto', prod, 150000, 'LP') returning id into ob;
  insert into aplicaciones (obligacion_id, origen, anticipo_id, importe) values (ob, 'anticipo', an, 150000);
  perform t.igual(anticipo_disponible(an), 50000.00, 'queda 50.000 sin aplicar');
  perform t.falla(format('select revertir_movimiento(%L, ''x'')', m), 'anticipo', 'no se revierte un anticipo ya aplicado');
end $$;

-- Cobro previo al sistema: cancela la deuda sin mover Galicia ni Caja
do $$
declare op uuid; antes numeric;
begin
  antes := t.saldo('Banco Galicia');
  op := t.operacion('facturado', 600, 35000, 35500);
  perform t.cargar(op, 600);
  perform t.falla(format('insert into aplicaciones (obligacion_id, origen, importe) values (%L, ''previo'', 300000)', t.obl_comision(op)),
                  'check', 'previo sin nota');
  insert into aplicaciones (obligacion_id, origen, importe, nota, fecha)
  values (t.obl_comision(op), 'previo', 300000, 'Cobrado según planilla', current_date);
  perform t.igual((t.comision(op)).estado, 'cobrada'::estado_comision, 'cobrada');
  perform t.igual(t.saldo('Banco Galicia'), antes, 'no mueve Galicia');
end $$;
