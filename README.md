# AGROVIA — Sistema de gestión

Sistema de gestión comercial y financiera de AGROVIA SAS: operaciones (Facturado, Menudeo, Compra-venta), cargas, stock, comisiones, cuentas corrientes, Banco Galicia, Caja y eCheqs.

Stack: Next.js + TypeScript + Tailwind (Vercel) y Supabase (PostgreSQL, Auth, Storage).

Repositorio privado. **No subir datos reales** (planillas, extractos, documentos).

## Estado

Etapa 1 — base de datos con todas las reglas y pruebas automáticas.

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
