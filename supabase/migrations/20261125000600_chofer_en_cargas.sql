-- Nombre y apellido del chofer en cada carga (pedido del 25/11/2026)
alter table cargas add column if not exists chofer text;
