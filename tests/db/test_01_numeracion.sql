-- Número automático, correlativo por modalidad, no se reutiliza
do $$
declare a uuid; b uuid; c uuid; h uuid; n uuid;
begin
  a := t.operacion('facturado', 600, 35000, 35500);
  b := t.operacion('facturado', 600, 35000, 35500);
  c := t.operacion('menudeo', 600, 31500, 32000);
  perform t.igual((select numero from operaciones where id = a), '1-1', 'primera facturada');
  perform t.igual((select numero from operaciones where id = b), '1-2', 'segunda facturada');
  perform t.igual((select numero from operaciones where id = c), '2-1', 'primera de menudeo');

  -- Importación histórica con su número original: el contador sigue desde ahí
  insert into operaciones (modalidad, numero_seq, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta)
  values ('facturado', 85, t.tercero('EL BAJO SRL'), t.tercero('LODISER'), 580, 31000, 31310) returning id into h;
  perform t.igual((select numero from operaciones where id = h), '1-85', 'número importado');
  n := t.operacion('facturado', 100, 1, 2);
  perform t.igual((select numero from operaciones where id = n), '1-86', 'sigue después del importado');

  -- Una cancelada no libera su número
  update operaciones set estado_comercial = 'cancelada', motivo_cancelacion = 'El comprador desistió' where id = n;
  n := t.operacion('facturado', 100, 1, 2);
  perform t.igual((select numero from operaciones where id = n), '1-87', 'no reutiliza el número de una cancelada');

  perform t.falla(format('delete from operaciones where id = %L', a), 'no se borran', 'una operación no se borra');
  perform t.falla(format('update operaciones set numero_seq = 99 where id = %L', a), 'no se modifican', 'el número no se edita');
  perform t.falla(format('insert into operaciones (modalidad, numero_seq, vendedor_id, comprador_id, bolsas_negociadas, precio_compra, precio_venta) values (''facturado'', 85, %L, %L, 1, 1, 1)',
                         t.tercero('X'), t.tercero('Y')), 'duplicate', 'no se repite un número');
end $$;
