-- Cobros y pagos ocurridos antes de usar el sistema (importación de la planilla).
-- No mueven Galicia ni Caja: esos saldos arrancan con el saldo inicial.
alter type origen_aplicacion add value if not exists 'previo';
