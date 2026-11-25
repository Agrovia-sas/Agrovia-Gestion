-- =====================================================================
-- AGROVIA SAS — Migración base
-- Funciones comunes, usuarios y roles, auditoría, configuración,
-- terceros y catálogos.
-- Importes: numeric(18,2). Fechas: date / timestamptz (UTC, se muestran
-- en America/Argentina/Buenos_Aires).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Usuarios y roles
-- ---------------------------------------------------------------------
create type rol_usuario as enum ('admin', 'operador', 'finanzas', 'lectura');

create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text,
  rol         rol_usuario not null default 'lectura',
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ¿El usuario actual está activo y tiene alguno de estos roles?
create or replace function tiene_rol(variadic roles rol_usuario[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from perfiles p
    where p.id = auth.uid() and p.activo and p.rol = any(roles)
  );
$$;

create or replace function es_usuario_activo()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from perfiles p where p.id = auth.uid() and p.activo);
$$;

-- Para las acciones que corren con permisos del sistema (revertir,
-- transferir, endosar…): exige que el usuario logueado tenga el rol.
-- Sin usuario logueado solo llegan las conexiones de confianza (dueño de
-- la base, service_role), porque anon no tiene permiso de ejecución.
create or replace function exigir_rol(variadic roles rol_usuario[])
returns void
language plpgsql stable
as $$
begin
  if auth.uid() is not null and not tiene_rol(variadic roles) then
    raise exception 'No tenés permiso para esta acción';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Auditoría automática: quién cambió qué, cuándo, valor anterior y nuevo
-- ---------------------------------------------------------------------
create table auditoria (
  id              bigint generated always as identity primary key,
  tabla           text not null,
  registro_id     text,
  accion          text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  valor_anterior  jsonb,
  valor_nuevo     jsonb,
  usuario_id      uuid,
  fecha           timestamptz not null default now()
);
create index auditoria_tabla_registro_idx on auditoria (tabla, registro_id);

create or replace function fn_auditar()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;
  insert into auditoria (tabla, registro_id, accion, valor_anterior, valor_nuevo, usuario_id)
  values (tg_table_name, coalesce(v_new, v_old) ->> 'id', tg_op, v_old, v_new, auth.uid());
  return coalesce(new, old);
end;
$$;

-- Atajo para activar auditoría en una tabla
create or replace function auditar_tabla(p_tabla regclass)
returns void
language plpgsql
as $$
begin
  execute format(
    'create trigger trg_auditoria after insert or update or delete on %s
       for each row execute function fn_auditar()', p_tabla);
end;
$$;

-- Columna updated_at
create or replace function fn_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Configuración de la empresa (una sola fila)
-- ---------------------------------------------------------------------
create table configuracion (
  id                          boolean primary key default true check (id),
  razon_social                text not null default 'AGROVIA SAS',
  cuit                        text,
  domicilio                   text,
  logo_path                   text,
  alicuota_iva_default        numeric(5,2) not null default 21,
  kg_por_bolsa_default        numeric(8,2) not null default 50,
  dias_vencimiento_comision   integer not null default 7,
  dias_alerta_vencimiento     integer not null default 3,
  updated_at                  timestamptz not null default now()
);
insert into configuracion default values;

-- ---------------------------------------------------------------------
-- Terceros
-- ---------------------------------------------------------------------
create type tipo_rol_tercero as enum ('comprador', 'productor', 'proveedor', 'transportista', 'comisionista', 'otro');

create table terceros (
  id                uuid primary key default gen_random_uuid(),
  razon_social      text not null,
  nombre_comercial  text,
  cuit              text unique check (cuit is null or cuit ~ '^[0-9]{11}$'),
  domicilio         text,
  provincia         text,
  contacto          text,
  telefono          text,
  email             text,
  condicion_fiscal  text,
  observaciones     text,
  activo            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Evita duplicados por mayúsculas o espacios ("DOG" y "DOG ")
create unique index terceros_razon_social_norm_idx on terceros (lower(btrim(razon_social)));
create trigger trg_terceros_updated before update on terceros for each row execute function fn_updated_at();

create table tercero_roles (
  tercero_id  uuid not null references terceros(id) on delete cascade,
  rol         tipo_rol_tercero not null,
  primary key (tercero_id, rol)
);

create table tercero_cuentas_bancarias (
  id          uuid primary key default gen_random_uuid(),
  tercero_id  uuid not null references terceros(id) on delete cascade,
  cbu         text check (cbu is null or cbu ~ '^[0-9]{22}$'),
  alias       text,
  banco       text,
  titular     text,
  check (cbu is not null or alias is not null)
);

-- ---------------------------------------------------------------------
-- Catálogos editables
-- ---------------------------------------------------------------------
create table productos (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  activo  boolean not null default true
);
create unique index productos_nombre_idx on productos (lower(btrim(nombre)));

-- Marca = ingenio de origen del azúcar (Florida, Leach, Santa Rosa…)
create table marcas (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  activo  boolean not null default true
);
create unique index marcas_nombre_idx on marcas (lower(btrim(nombre)));

-- Ingenio como lugar físico de carga
create table ingenios (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  activo  boolean not null default true
);
create unique index ingenios_nombre_idx on ingenios (lower(btrim(nombre)));

-- Depósito del cañero
create table depositos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  canero_id   uuid references terceros(id),
  activo      boolean not null default true
);
create unique index depositos_nombre_idx on depositos (lower(btrim(nombre)));

create table categorias_gasto (
  id      uuid primary key default gen_random_uuid(),
  nombre  text not null,
  activo  boolean not null default true
);
create unique index categorias_gasto_nombre_idx on categorias_gasto (lower(btrim(nombre)));

insert into productos (nombre) values ('Azúcar común tipo A');
insert into categorias_gasto (nombre) values
  ('Honorarios'), ('Alquiler oficina'), ('Fletes'), ('Servicios'),
  ('Impuestos'), ('Gastos bancarios'), ('Gastos financieros'), ('Sueldos'), ('Otros');

select auditar_tabla('perfiles');
select auditar_tabla('configuracion');
select auditar_tabla('terceros');
select auditar_tabla('tercero_roles');
select auditar_tabla('tercero_cuentas_bancarias');
