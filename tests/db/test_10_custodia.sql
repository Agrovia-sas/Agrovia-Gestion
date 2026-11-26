-- Bolsas en custodia: el dueño deja bolsas, AGROVIA las mueve, vende y repone
do $$
declare v_dueno uuid; dep1 uuid; dep2 uuid; op uuid; c uuid; s record;
begin
  v_dueno := t.tercero('FABIO GONZALEZ');
  insert into depositos (nombre) values ('Dep Uno') returning id into dep1;
  insert into depositos (nombre) values ('Dep Dos') returning id into dep2;

  -- Ingreso de 1.200 bolsas al depósito 1
  insert into custodia_movimientos (dueno_id, tipo, bolsas, hacia_deposito_id) values (v_dueno, 'ingreso', 1200, dep1);
  -- Traslado de 600 al depósito 2
  insert into custodia_movimientos (dueno_id, tipo, bolsas, desde_deposito_id, hacia_deposito_id) values (v_dueno, 'traslado', 600, dep1, dep2);
  perform t.igual((select bolsas from v_custodia_fisicas where dueno_id = v_dueno and lugar_id = dep2), 600, 'traslado');
  perform t.falla(format('insert into custodia_movimientos (dueno_id, tipo, bolsas, desde_deposito_id, hacia_deposito_id) values (%L, ''traslado'', 700, %L, %L)', v_dueno, dep1, dep2),
                  'no alcanzan', 'no se traslada más de lo que hay');

  -- Venta de AGROVIA con sus bolsas: menudeo marcado en custodia
  insert into operaciones (modalidad, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta,
                           ubicacion_tipo, deposito_id, bolsas_en_custodia)
  values ('menudeo', v_dueno, t.tercero('MILLENIUM ECOLOGICO'), 600, 34000, 35000, 'deposito', dep2, true) returning id into op;
  perform t.igual((select count(*) from obligaciones where operacion_id = op and sentido = 'pagar' and not anulada), 0::bigint, 'sin deuda en pesos con el dueño');
  perform t.igual((select count(*) from obligaciones where operacion_id = op and sentido = 'cobrar'), 1::bigint, 'el comprador le debe a AGROVIA');
  perform t.igual((select count(*) from stock_movimientos where operacion_id = op), 0::bigint, 'no es stock de AGROVIA');

  -- La carga descuenta del dueño y suma a lo que se le debe
  c := t.cargar(op, 600, 'R-55');
  select * into s from v_custodia_saldos where dueno_id = v_dueno;
  perform t.igual(s.fisicas, 600, 'quedan 600 físicas');
  perform t.igual(s.a_reponer, 600, 'se le deben 600');
  perform t.igual((select bolsas from v_custodia_fisicas where dueno_id = v_dueno and lugar_id = dep2), null::integer, 'depósito 2 vacío');

  -- No se puede cargar más de lo que tiene el dueño en ese lugar
  perform t.falla(format('insert into operaciones (modalidad, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta, ubicacion_tipo, deposito_id, bolsas_en_custodia) values (''menudeo'', %L, %L, 100, 1, 2, ''deposito'', %L, true) returning t.cargar(id, 100)', v_dueno, t.tercero('FREI'), dep2),
                  'no alcanzan', 'carga sin bolsas del dueño en ese lugar');

  -- Borrar la carga devuelve todo
  delete from cargas where id = c;
  perform t.igual((select a_reponer from v_custodia_saldos where dueno_id = v_dueno), 0, 'borrar carga anula la entrega');
  perform t.cargar(op, 600);

  -- Reposición en bolsas (300) y pago en plata (300)
  insert into custodia_movimientos (dueno_id, tipo, bolsas, hacia_deposito_id) values (v_dueno, 'reposicion', 300, dep1);
  perform t.falla(format('insert into custodia_movimientos (dueno_id, tipo, bolsas, importe) values (%L, ''pago_plata'', 400, 1)', v_dueno),
                  'se le deben', 'no se paga más de lo que se debe');
  insert into custodia_movimientos (dueno_id, tipo, bolsas, importe) values (v_dueno, 'pago_plata', 300, 10500000);
  select * into s from v_custodia_saldos where dueno_id = v_dueno;
  perform t.igual(s.a_reponer, 0, 'deuda saldada');
  perform t.igual(s.fisicas, 900, '600 que quedaban + 300 repuestas');
  perform t.igual(s.pagado_en_plata, 10500000.00, 'pagado en plata');

  -- Desmarcar custodia antes de cargar vuelve a la deuda en pesos y al stock propio
  insert into operaciones (modalidad, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta, bolsas_en_custodia)
  values ('menudeo', v_dueno, t.tercero('FREI'), 100, 1000, 1100, true) returning id into op;
  update operaciones set bolsas_en_custodia = false where id = op;
  perform t.igual((select count(*) from obligaciones where operacion_id = op and sentido = 'pagar' and not anulada), 1::bigint, 'vuelve la deuda en pesos');
  perform t.igual((select sum(bolsas) from stock_movimientos where operacion_id = op)::int, 100, 'vuelve al stock propio');
end $$;
