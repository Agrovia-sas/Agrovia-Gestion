-- Editar operaciones: cambios de vendedor/comprador acomodan las deudas
do $$
declare op uuid; m uuid;
begin
  op := t.operacion('menudeo', 600, 34000, 34500, 'JUAREZ CHICO', 'PATO SERVITJE');
  -- Cambiar comprador: la deuda pasa al nuevo
  update operaciones set comprador_id = t.tercero('FREI') where id = op;
  perform t.igual((select tercero_id from obligaciones where operacion_id = op and sentido = 'cobrar' and not anulada), t.tercero('FREI'), 'crédito al nuevo comprador');
  -- Cambiar vendedor
  update operaciones set vendedor_id = t.tercero('DOG SRL') where id = op;
  perform t.igual((select tercero_id from obligaciones where operacion_id = op and sentido = 'pagar' and not anulada), t.tercero('DOG SRL'), 'deuda al nuevo vendedor');
  -- Quitar la venta: se anula lo que había que cobrar; volver a ponerla la reactiva
  update operaciones set comprador_id = null, precio_venta = null where id = op;
  perform t.igual((select count(*) from obligaciones where operacion_id = op and sentido = 'cobrar' and not anulada), 0::bigint, 'sin venta, sin crédito');
  update operaciones set comprador_id = t.tercero('FREI'), precio_venta = 35000 where id = op;
  perform t.igual((select importe from obligaciones where operacion_id = op and sentido = 'cobrar' and not anulada), 21000000.00, 'venta reactivada con el precio nuevo');
  -- Cambiar el lugar mueve el stock propio
  insert into depositos (nombre) values ('Dep Edicion');
  update operaciones set ubicacion_tipo = 'deposito', deposito_id = (select id from depositos where nombre = 'Dep Edicion') where id = op;
  perform t.ok((select deposito_id from stock_movimientos where operacion_id = op and tipo = 'entrada_compra') is not null, 'stock en el lugar nuevo');
  -- Con cobros aplicados no se cambia el comprador
  m := t.mov('Caja efectivo', 1000, 'FREI');
  insert into aplicaciones (obligacion_id, origen, movimiento_id, importe)
  select id, 'movimiento', m, 1000 from obligaciones where operacion_id = op and sentido = 'cobrar' and not anulada;
  perform t.falla(format('update operaciones set comprador_id = %L where id = %L', t.tercero('LODISER'), op), 'cobros o pagos aplicados', 'no se cambia con cobros');
  -- Ni se toca la obligación a mano
  perform t.falla(format('update obligaciones set tercero_id = %L where operacion_id = %L and sentido = ''pagar''', t.tercero('LODISER'), op), 'desde la operación', 'tercero a mano');
end $$;

-- Facturado: cambiar el comprador mueve la comisión a cobrar
do $$
declare op uuid;
begin
  op := t.operacion('facturado', 600, 35000, 35500);
  update operaciones set comprador_id = t.tercero('FREI') where id = op;
  perform t.igual((select tercero_id from obligaciones where id = t.obl_comision(op)), t.tercero('FREI'), 'comisión al nuevo comprador');
end $$;
