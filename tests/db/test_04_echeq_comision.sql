-- Comisión cobrada con eCheq: cuenta como cobrada al recibirlo, pero no es saldo de Galicia.
-- Si se rechaza vuelve a pendiente de cobro.
do $$
declare op uuid; ch uuid; galicia_antes numeric;
begin
  op := t.operacion('facturado', 600, 35000, 35500);
  perform t.cargar(op, 600);
  galicia_antes := t.saldo('Banco Galicia');

  ch := t.cheque('E-555', 300000, 'LODISER');
  insert into aplicaciones (obligacion_id, origen, cheque_id, importe) values (t.obl_comision(op), 'cheque', ch, 300000);

  perform t.igual((t.comision(op)).estado, 'cobrada'::estado_comision, 'cobrada al recibir el eCheq');
  perform t.igual((select estado from cheques where id = ch), 'en_cartera'::estado_cheque, 'cheque en cartera');
  perform t.igual(t.saldo('Banco Galicia'), galicia_antes, 'recibir un cheque no mueve Galicia');
  perform t.igual((select disponible_en_cartera from v_cheques where id = ch), 300000.00, 'en cartera como derecho a cobrar');

  -- Rechazo: la comisión vuelve a pendiente y la deuda reaparece, con historial
  update cheques set estado = 'rechazado' where id = ch;
  perform t.igual((t.comision(op)).estado, 'pendiente_cobro'::estado_comision, 'vuelve a pendiente de cobro');
  perform t.igual((select pendiente from v_obligaciones where id = t.obl_comision(op)), 300000.00, 'deuda pendiente otra vez');
  perform t.ok(exists (select 1 from aplicaciones where cheque_id = ch and anulada), 'la aplicación queda anulada, no borrada');
  perform t.igual((select count(*) from cheque_eventos where cheque_id = ch), 2::bigint, 'historial del cheque');
  perform t.igual((select coalesce(sum(cobrado_neto), 0) from v_comisiones_percibidas where operacion_id = op), 0::numeric, 'ya no cuenta como percibida');

  perform t.falla(format('update cheques set estado = ''en_cartera'' where id = %L', ch), 'no pasa', 'un rechazado no vuelve a cartera');
end $$;

-- Cheque depositado y acreditado: recién ahí entra a Galicia
do $$
declare ch uuid; antes numeric;
begin
  antes := t.saldo('Banco Galicia');
  ch := t.cheque('E-777', 500000, 'NORDESTE SRL');
  update cheques set estado = 'depositado', cuenta_id = t.cuenta('Banco Galicia') where id = ch;
  perform t.igual(t.saldo('Banco Galicia'), antes, 'depositado todavía no es saldo');
  update cheques set estado = 'acreditado' where id = ch;
  perform t.igual(t.saldo('Banco Galicia'), antes + 500000, 'acreditado entra a Galicia');
end $$;
