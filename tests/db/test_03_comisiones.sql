-- Comisión: cálculo, exigibilidad al completar carga, cobro, reparto
do $$
declare op uuid; op2 uuid; op3 uuid; ob uuid; m uuid; c comisiones; v record;
begin
  -- Ejemplo del documento: $35.500 venta, $35.000 compra, 600 bolsas → $500 × 600
  op := t.operacion('facturado', 600, 35000, 35500);
  c := t.comision(op);
  perform t.igual(c.importe, 300000.00, 'diferencia comercial × bolsas');
  perform t.igual(c.estado, 'esperando_carga'::estado_comision, 'espera la carga');

  -- Mientras espera la carga, la obligación existe pero no es exigible: no es deuda del comprador
  ob := t.obl_comision(op);
  perform t.ok((select not exigible from obligaciones where id = ob), 'no exigible');
  perform t.igual((select a_cobrar from v_cuentas_corrientes where razon_social = 'LODISER'), 0::numeric, 'sin deuda exigible');

  perform t.cargar(op, 300);
  perform t.igual((t.comision(op)).estado, 'esperando_carga'::estado_comision, 'sigue esperando con carga parcial');
  perform t.cargar(op, 300);
  c := t.comision(op);
  perform t.igual(c.estado, 'pendiente_cobro'::estado_comision, 'pasa sola a pendiente de cobro');
  perform t.ok(c.fecha_exigible is not null, 'tiene fecha exigible');
  perform t.ok((select exigible and vencimiento is not null from obligaciones where id = ob), 'obligación exigible con vencimiento');
  perform t.igual((select a_cobrar from v_cuentas_corrientes where razon_social = 'LODISER'), 300000.00, 'ahora es deuda');

  -- Cobro por transferencia a Galicia, con factura: neto + IVA 21%
  m := t.mov('Banco Galicia', 363000, 'LODISER');
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe, iva_facturado, factura_numero)
  values (ob, 'movimiento', m, 300000, 63000, 'A-0001-00000123');
  c := t.comision(op);
  perform t.igual(c.estado, 'cobrada'::estado_comision, 'cobrada');
  perform t.igual(c.fecha_cobro, current_date, 'fecha del cobro');
  perform t.igual((select sum(cobrado_neto) from v_comisiones_percibidas where operacion_id = op), 300000.00, 'percibido en neto');

  -- Cobro anticipado y parcial queda marcado
  op2 := t.operacion('facturado', 1180, 31000, 31500, 'TEMAS INDUSTRIALES', 'NORDESTE SRL');
  perform t.cargar(op2, 536);
  m := t.mov('Caja efectivo', 268000, 'NORDESTE SRL');
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe) values (t.obl_comision(op2), 'movimiento', m, 268000);
  c := t.comision(op2);
  perform t.igual(c.estado, 'esperando_carga'::estado_comision, 'parcial sigue esperando carga');
  perform t.ok(c.cobro_anticipado and c.cobro_parcial, 'marcada como anticipada y parcial');
  perform t.igual((select cobros_anticipados from v_cuentas_corrientes where razon_social = 'NORDESTE SRL'), 268000.00, 'se ve como cobro anticipado');

  -- Comisión por bolsa: se recalcula si se amplía
  op3 := t.operacion('facturado', 600, 30000, 30000, 'EL BAJO SRL', 'NORDESTE SRL');
  update operaciones set comision_tipo = 'por_bolsa', comision_valor = 200 where id = op3;
  perform t.igual((t.comision(op3)).importe, 120000.00, 'por bolsa');
  insert into operacion_ajustes (operacion_id, delta_bolsas, motivo) values (op3, 60, 'Ampliación');
  perform t.igual((t.comision(op3)).importe, 132000.00, 'recalculada con ampliación');
  perform t.ok(exists (select 1 from auditoria where tabla = 'comisiones' and registro_id = (t.comision(op3)).id::text
                        and accion = 'UPDATE' and valor_anterior->>'importe' = '120000.00'), 'queda registrado el cambio');

  -- Porcentaje del precio (vi 1% y 2% en las planillas)
  update operaciones set comision_tipo = 'porcentaje', comision_valor = 1 where id = op3;
  perform t.igual((t.comision(op3)).importe, 198000.00, '1% de 30.000 × 660');

  -- Comisionista: se reparte 50%, AGROVIA ve bruto y neto
  insert into operaciones (modalidad, vendedor_id, comprador_id, comisionista_id, bolsas_negociadas, precio_compra, precio_venta)
  values ('facturado', t.tercero('EL BAJO SRL'), t.tercero('LODISER'), t.tercero('Corredor Pérez'), 600, 35000, 35400)
  returning id into op;
  select * into v from v_operaciones where id = op;
  perform t.igual(v.comision_bruta, 240000.00, 'bruta');
  perform t.igual(v.comision_neta_agrovia, 120000.00, 'neta AGROVIA con reparto 50%');

  -- Las comisiones no se tocan a mano
  perform t.falla(format('update comisiones set estado = ''cobrada'' where operacion_id = %L', op), 'se calcula sola', 'comisión protegida');
end $$;

-- Compra-venta: utilidad = venta − compra − costos por bolsa (planilla A-1)
do $$
declare op uuid;
begin
  insert into operaciones (modalidad, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta,
                           costo_flete, costo_iibb)
  values ('compraventa', t.tercero('JUAREZ CHICO'), t.tercero('NORDESTE SRL'), 300, 34000, 40000, 2578, 500)
  returning id into op;
  perform t.igual((t.comision(op)).importe, 876600.00, 'utilidad A-1 = 2.922 × 300');
end $$;
