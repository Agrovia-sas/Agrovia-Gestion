-- Aplicación "previo": cobro o pago registrado antes del sistema, con una nota obligatoria.
alter table aplicaciones add column if not exists nota text;

alter table aplicaciones drop constraint aplicaciones_check;
alter table aplicaciones add constraint aplicaciones_origen_check check (
  (origen = 'movimiento'   and movimiento_id is not null and cheque_id is null and anticipo_id is null and obligacion_compensada_id is null) or
  (origen = 'cheque'       and cheque_id is not null and movimiento_id is null and anticipo_id is null and obligacion_compensada_id is null) or
  (origen = 'anticipo'     and anticipo_id is not null and movimiento_id is null and cheque_id is null and obligacion_compensada_id is null) or
  (origen = 'compensacion' and obligacion_compensada_id is not null and movimiento_id is null and cheque_id is null and anticipo_id is null) or
  (origen = 'retencion'    and retencion_tipo is not null and movimiento_id is null and cheque_id is null and anticipo_id is null and obligacion_compensada_id is null) or
  (origen = 'previo'       and nota is not null and movimiento_id is null and cheque_id is null and anticipo_id is null and obligacion_compensada_id is null)
);

-- Solo un administrador registra cobros o pagos previos al sistema
create or replace function fn_aplicaciones_previo_check()
returns trigger language plpgsql set search_path = public, auth as $$
begin
  if new.origen = 'previo' then
    perform exigir_rol('admin');
  end if;
  return new;
end;
$$;
revoke execute on function fn_aplicaciones_previo_check() from public, anon, authenticated;

drop trigger if exists trg_aplicaciones_previo on aplicaciones;
create trigger trg_aplicaciones_previo before insert on aplicaciones
  for each row execute function fn_aplicaciones_previo_check();
