-- Pantalla de Caja: cobro aplicado a una comisión, gasto y arqueo
do $$
declare op uuid; caja uuid := t.cuenta('Caja efectivo'); cat uuid; arq uuid;
begin
  op := t.operacion('facturado', 600, 35000, 35500);
  perform t.cargar(op, 600);

  -- Cobro en efectivo con factura: 300.000 + IVA
  perform registrar_movimiento(jsonb_build_object(
    'cuenta_id', caja, 'importe', 363000, 'medio', 'efectivo', 'concepto', 'Cobro comisión',
    'tercero_id', t.tercero('LODISER'),
    'aplicaciones', jsonb_build_array(jsonb_build_object('obligacion_id', t.obl_comision(op), 'importe', 300000, 'iva_facturado', 63000, 'factura_numero', 'A-1'))));
  perform t.igual((t.comision(op)).estado, 'cobrada'::estado_comision, 'comisión cobrada desde Caja');
  perform t.igual(t.saldo('Caja efectivo'), 363000.00, 'entra a Caja');

  -- No se puede aplicar más de lo que entró (todo junto o nada)
  perform t.falla(format('select registrar_movimiento(%L::jsonb)', jsonb_build_object(
    'cuenta_id', caja, 'importe', 100, 'concepto', 'x', 'aplicaciones',
    jsonb_build_array(jsonb_build_object('obligacion_id', t.obl_comision(op), 'importe', 200))) ), 'pendiente', 'aplicación inválida');
  perform t.igual(t.saldo('Caja efectivo'), 363000.00, 'si falla no queda nada a medias');

  -- Gasto: tiene que coincidir con lo que salió
  select id into cat from categorias_gasto where nombre = 'Servicios';
  perform t.falla(format('select registrar_movimiento(%L::jsonb)', jsonb_build_object(
    'cuenta_id', caja, 'importe', -1000, 'concepto', 'Luz', 'gasto', jsonb_build_object('categoria_id', cat, 'importe_neto', 900))), 'no coincide', 'gasto que no cierra');
  perform registrar_movimiento(jsonb_build_object(
    'cuenta_id', caja, 'importe', -12100, 'concepto', 'Luz oficina', 'gasto', jsonb_build_object('categoria_id', cat, 'importe_neto', 10000, 'iva', 2100)));
  perform t.igual(t.saldo('Caja efectivo'), 350900.00, 'sale el gasto');
  perform t.igual((select count(*) from gastos where descripcion = 'Luz oficina' and forma = 'pagado'), 1::bigint, 'gasto registrado');

  -- Arqueo: contaron 350.000, faltan 900; se ajusta
  arq := registrar_arqueo(caja, 350000, true, 'Faltante');
  perform t.igual((select diferencia from arqueos where id = arq), -900.00, 'diferencia');
  perform t.igual(t.saldo('Caja efectivo'), 350000.00, 'ajustado al contado');
end $$;
