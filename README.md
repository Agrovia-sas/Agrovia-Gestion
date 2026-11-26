# AGROVIA — Sistema de gestión

Sistema de gestión comercial y financiera de AGROVIA SAS: operaciones (Facturado, Menudeo, Compra-venta), cargas, stock, comisiones, cuentas corrientes, Banco Galicia, Caja y eCheqs.

Stack: Next.js + TypeScript + Tailwind (Vercel) y Supabase (PostgreSQL, Auth, Storage).

Repositorio privado. **No subir datos reales** (planillas, extractos, documentos).

## Estado

- Etapa 1 — base de datos con todas las reglas y pruebas automáticas. ✅
- Etapa 2 — aplicación: login, panel, terceros, operaciones, cargas, comisiones, catálogos. En curso.

## Aplicación

```bash
cp .env.example .env.local   # completar URL y clave publicable de Supabase
npm install
npm run dev
```

`src/app/(app)/` tiene las pantallas; toda escritura pasa por acciones del servidor (`actions.ts`) con la sesión del usuario, así se aplican las reglas por rol de la base.

## Base de datos

`supabase/migrations/`, en orden:

| Archivo | Contenido |
|---|---|
| `…0100_base.sql` | Usuarios y roles, auditoría automática, configuración, terceros, catálogos |
| `…0200_comercial.sql` | Operaciones y numeración (1-xx, 2-xx, A-x), ajustes, cargas, comisiones y reparto, stock, reposiciones |
| `…0300_financiero.sql` | Galicia y Caja, obligaciones, movimientos inmutables, aplicaciones, anticipos, cheques, descuentos, gastos, extractos |
| `…0400_saldos_documentos_seguridad.sql` | Vistas de saldos, documentos, seguridad por rol (RLS) |

Principios:

- **La plata de AGROVIA, separada de la que solo pasa cerca.** En Facturado solo la comisión es plata propia; el pago comprador → productor es seguimiento.
- **Obligaciones** (lo que alguien debe), **movimientos** (lo que se movió en Galicia o Caja) y **aplicaciones** (qué cancela qué). Todos los saldos salen de sumar.
- **Nada calculado se tipea**: bolsas cargadas, pendientes, estados y comisiones los mantiene la base.
- **Libro inmutable**: un movimiento confirmado no se edita ni se borra; se revierte con motivo.
- **Las reglas viven en la base**, no solo en la pantalla, y la seguridad por rol se aplica aunque alguien saltee la interfaz.

## Pruebas

Necesita PostgreSQL 15+ local:

```bash
tests/db/run.sh
```

Crea una base `agrovia_test`, aplica las migraciones y corre `tests/db/test_*.sql` (cada una en una transacción que se deshace).

## Decisiones tomadas con AGROVIA

| Fecha | Tema | Decisión |
|---|---|---|
| 25/11/2026 | Utilidad en Menudeo y Compra-venta | Se considera cobrada en la proporción en que el comprador pagó la venta |
| 25/11/2026 | Cobro antes de completar la carga | Queda "Cobrada" con marca de cobro anticipado |
| 25/11/2026 | Comisión en 0 (compra = venta) | Estado "Sin comisión" |
| 26/11/2026 | Bolsas en custodia | La deuda con el dueño es en bolsas y nace al vender; se repone en bolsas o se paga en plata |
| 26/11/2026 | Numeración desde 2027 | **Reinicia en 1 cada año** (1-1, 2-1, A-1). Se distingue por año ("1-1/27"). Implementar en diciembre 2026: numerador por modalidad y año, unicidad (modalidad, año, número), selector de año en Operaciones y Panel |
