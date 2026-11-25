import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { SelectTercero } from "@/components/select-tercero";
import { Badge, Card, Field, ProgressBar, Table, inputCls, td, th, tonoComision, tonoLogistico } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { $, bolsas, fecha, fechaHora, hoy, ESTADO_COMISION, ESTADO_LOGISTICO, MODALIDADES, TIPO_COMISION } from "@/lib/format";
import {
  agregarParticipante,
  borrarCarga,
  cambiarComision,
  cancelarOperacion,
  editarDatos,
  quitarParticipante,
  registrarAjuste,
  registrarCarga,
  registrarPagoDirecto,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function Operacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: o } = await supabase.from("v_operaciones").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();

  const [{ data: cargas }, { data: ajustes }, { data: participantes }, { data: pagos }, { data: historial }, { data: marca }, c] = await Promise.all([
    supabase.from("cargas").select("*, transportista:terceros(razon_social), ingenio:ingenios(nombre), deposito:depositos(nombre)").eq("operacion_id", id).order("fecha"),
    supabase.from("operacion_ajustes").select("*").eq("operacion_id", id).order("created_at"),
    supabase.from("comision_participantes").select("*, tercero:terceros(razon_social)").eq("comision_id", o.comision_id!),
    supabase.from("seguimiento_pagos_directos").select("*").eq("operacion_id", id).order("fecha"),
    supabase.from("auditoria").select("id, tabla, accion, fecha, valor_anterior, valor_nuevo").or(`registro_id.eq.${id},registro_id.eq.${o.comision_id}`).order("fecha", { ascending: false }).limit(30),
    o.marca_id ? supabase.from("marcas").select("nombre").eq("id", o.marca_id).maybeSingle() : Promise.resolve({ data: null }),
    cargarCatalogos(supabase),
  ]);

  const activa = o.estado_comercial === "cerrada";
  const esFacturado = o.modalidad === "facturado";
  const totalPagosDirectos = (pagos ?? []).reduce((s, p) => s + Number(p.importe), 0);
  const ubicacionActual = o.ubicacion_tipo === "ingenio" ? `ingenio:${o.ingenio_id}` : o.ubicacion_tipo === "deposito" ? `deposito:${o.deposito_id}` : "";
  const costos = Number(o.costo_flete) + Number(o.costo_iibb) + Number(o.costo_dyc) + Number(o.costo_otros) + Number(o.costo_ganancias);

  return (
    <>
      {/* Encabezado */}
      <div className="mb-6 rounded-xl border border-borde bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-texto-2">
              <Link href="/operaciones" className="hover:underline">Operaciones</Link> / {MODALIDADES[o.modalidad!]}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tabular-nums">{o.numero}</h1>
            <p className="mt-1">
              <Link href={`/terceros/${o.vendedor_id}`} className="hover:underline">{o.vendedor}</Link>
              <span className="text-texto-2"> → </span>
              {o.comprador_id ? <Link href={`/terceros/${o.comprador_id}`} className="hover:underline">{o.comprador}</Link> : <span className="text-texto-2">sin comprador</span>}
            </p>
            <p className="mt-1 text-sm text-texto-2">
              Cierre {fecha(o.fecha_cierre)}{marca?.nombre ? ` · ${marca.nombre}` : ""}{o.zafra ? ` · Zafra ${o.zafra}` : ""} · {Number(o.kg_por_bolsa)} kg/bolsa
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={activa ? "ok" : "neutral"}>{activa ? "Cerrada" : "Cancelada"}</Badge>
            <Badge tone={tonoLogistico(o.estado_logistico!)}>{ESTADO_LOGISTICO[o.estado_logistico!]}</Badge>
            <Badge tone="neutral">Finanzas: próxima etapa</Badge>
            <Badge tone={tonoComision(o.estado_comision!)}>Comisión: {ESTADO_COMISION[o.estado_comision!]}</Badge>
            {o.cobro_anticipado && <Badge tone="pendiente">Cobro anticipado</Badge>}
            {o.cobro_parcial && <Badge tone="pendiente">Cobro parcial</Badge>}
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium tabular-nums">{bolsas(o.bolsas_cargadas)} / {bolsas(o.bolsas_totales)} bolsas ({o.avance_carga_pct ?? 0}%)</span>
            <span className="text-texto-2 tabular-nums">Pendientes: {bolsas(o.bolsas_pendientes)}</span>
          </div>
          <ProgressBar value={o.bolsas_cargadas ?? 0} max={o.bolsas_totales ?? 0} />
        </div>
        {!activa && <p className="mt-4 text-sm text-texto-2">Cancelada: {o.motivo_cancelacion}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Cargas */}
          <Card title={`Cargas (${cargas?.length ?? 0})`}>
            <Table
              head={
                <tr>
                  <th className={th}>Fecha</th>
                  <th className={th + " num"}>Bolsas</th>
                  <th className={th}>Desde</th>
                  <th className={th}>Transporte / Chofer</th>
                  <th className={th}>Remito / Orden</th>
                  <th className={th}></th>
                </tr>
              }
              empty={!cargas?.length ? "Todavía no hay cargas." : undefined}
            >
              {(cargas ?? []).map((cg) => (
                <tr key={cg.id}>
                  <td className={td}>{fecha(cg.fecha)}{cg.es_apertura && <div><Badge>Apertura</Badge></div>}</td>
                  <td className={td + " num font-medium"}>{bolsas(cg.bolsas)}</td>
                  <td className={td + " text-texto-2"}>{cg.ingenio?.nombre ?? cg.deposito?.nombre ?? "—"}</td>
                  <td className={td + " text-texto-2"}>{[cg.transportista?.razon_social, cg.patente, cg.chofer].filter(Boolean).join(" · ") || "—"}</td>
                  <td className={td + " text-texto-2"}>{[cg.remito, cg.orden_retiro && `Orden ${cg.orden_retiro}`].filter(Boolean).join(" · ") || "—"}</td>
                  <td className={td}>
                    {activa && (
                      <ActionForm action={borrarCarga.bind(null, id, cg.id)} submit="Borrar" variant="danger" confirm={`¿Borrar la carga de ${cg.bolsas} bolsas? Queda registrado en el historial.`} className="space-y-1 text-xs" />
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            {activa && (o.bolsas_pendientes ?? 0) > 0 && (
              <details className="mt-4 rounded-lg border border-borde p-4" open={(cargas?.length ?? 0) === 0}>
                <summary className="cursor-pointer font-medium text-marca">+ Registrar carga</summary>
                <ActionForm action={registrarCarga} submit="Registrar carga" className="mt-4 space-y-4">
                  <input type="hidden" name="operacion_id" value={id} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Fecha"><input type="date" name="fecha" defaultValue={hoy()} className={inputCls} /></Field>
                    <Field label="Bolsas *" hint={`Pendientes: ${bolsas(o.bolsas_pendientes)}`}>
                      <input name="bolsas" inputMode="numeric" required defaultValue={Math.min(o.bolsas_pendientes ?? 0, 600)} className={inputCls} />
                    </Field>
                    <Field label="Carga desde">
                      <select name="ubicacion" defaultValue={ubicacionActual} className={inputCls}>
                        <option value="">—</option>
                        {c.ubicaciones.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Transportista">
                      <SelectTercero name="transportista_id" principales={c.transportistas} todos={c.terceros} etiqueta="Transportistas" />
                    </Field>
                    <Field label="Chofer (nombre y apellido)"><input name="chofer" className={inputCls} /></Field>
                    <Field label="Patente"><input name="patente" className={inputCls} /></Field>
                    <Field label="Número de remito"><input name="remito" className={inputCls} /></Field>
                    <Field label="Orden de retiro"><input name="orden_retiro" className={inputCls} /></Field>
                    <Field label="Observaciones" className="sm:col-span-2"><input name="observaciones" className={inputCls} /></Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-texto-2">
                    <input type="checkbox" name="es_apertura" /> Carga de apertura (bolsas ya cargadas antes de usar el sistema; no mueve stock)
                  </label>
                </ActionForm>
              </details>
            )}
          </Card>

          {/* Ajustes */}
          <Card title="Ajustes autorizados de bolsas">
            {(ajustes ?? []).length > 0 ? (
              <ul className="mb-4 space-y-2 text-sm">
                {(ajustes ?? []).map((a) => (
                  <li key={a.id} className="flex justify-between gap-4 rounded-lg bg-fondo px-3 py-2">
                    <span><strong className="tabular-nums">{a.delta_bolsas > 0 ? "+" : ""}{bolsas(a.delta_bolsas)}</strong> bolsas · {a.motivo}</span>
                    <span className="text-texto-2">{fecha(a.fecha)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-texto-2">Sin ajustes. Negociadas: {bolsas(o.bolsas_negociadas)} bolsas.</p>
            )}
            {activa && (
              <details className="rounded-lg border border-borde p-4">
                <summary className="cursor-pointer font-medium text-marca">+ Ampliar o reducir</summary>
                <ActionForm action={registrarAjuste.bind(null, id)} submit="Registrar ajuste" className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Bolsas (+ amplía, − reduce)"><input name="delta_bolsas" inputMode="numeric" required placeholder="+100 o -50" className={inputCls} /></Field>
                    <Field label="Motivo *" className="sm:col-span-2"><input name="motivo" required className={inputCls} /></Field>
                  </div>
                </ActionForm>
              </details>
            )}
          </Card>

          {/* Pagos directos (Facturado) */}
          {esFacturado && (
            <Card title="Pagos del comprador al productor (seguimiento)">
              <p className="mb-3 text-sm text-texto-2">
                Esta plata no pasa por AGROVIA: se registra solo para seguir la operación. Total registrado: <strong>{$(totalPagosDirectos)}</strong>
                {o.precio_compra ? <> de {$(Number(o.precio_compra) * (o.bolsas_totales ?? 0))}</> : null}.
              </p>
              {(pagos ?? []).length > 0 && (
                <ul className="mb-4 space-y-1 text-sm">
                  {(pagos ?? []).map((p) => (
                    <li key={p.id} className="flex justify-between rounded bg-fondo px-3 py-1.5">
                      <span>{fecha(p.fecha)} · {p.medio ?? "—"} {p.referencia && `· ${p.referencia}`}</span>
                      <span className="tabular-nums">{$(p.importe)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {activa && (
                <details className="rounded-lg border border-borde p-4">
                  <summary className="cursor-pointer font-medium text-marca">+ Registrar pago</summary>
                  <ActionForm action={registrarPagoDirecto.bind(null, id)} submit="Registrar" className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-4">
                      <Field label="Fecha"><input type="date" name="fecha" defaultValue={hoy()} className={inputCls} /></Field>
                      <Field label="Importe *"><input name="importe" inputMode="decimal" required className={inputCls} /></Field>
                      <Field label="Medio"><input name="medio" placeholder="eCheq, transferencia…" className={inputCls} /></Field>
                      <Field label="Referencia"><input name="referencia" className={inputCls} /></Field>
                    </div>
                  </ActionForm>
                </details>
              )}
            </Card>
          )}

          {/* Historial */}
          {(historial ?? []).length > 0 && (
            <Card title="Historial de cambios">
              <ul className="space-y-2 text-sm">
                {(historial ?? []).map((h) => {
                  const antes = (h.valor_anterior ?? {}) as Record<string, unknown>;
                  const despues = (h.valor_nuevo ?? {}) as Record<string, unknown>;
                  const campos = h.accion === "UPDATE"
                    ? Object.keys(despues).filter((k) => !["updated_at"].includes(k) && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
                    : [];
                  return (
                    <li key={h.id} className="rounded bg-fondo px-3 py-2">
                      <span className="text-texto-2">{fechaHora(h.fecha)} · </span>
                      {h.accion === "INSERT" ? `Alta (${h.tabla})` : h.accion === "DELETE" ? `Baja (${h.tabla})` : `Cambio en ${h.tabla}: `}
                      {campos.map((k) => (
                        <span key={k} className="mr-2 inline-block">
                          <code className="text-xs">{k}</code> {String(antes[k] ?? "—")} → <strong>{String(despues[k] ?? "—")}</strong>
                        </span>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Comisión */}
          <Card title={esFacturado ? "Comisión" : "Utilidad"}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-texto-2">Precio compra</dt><dd className="tabular-nums">{$(o.precio_compra)}</dd></div>
              <div className="flex justify-between"><dt className="text-texto-2">Precio venta</dt><dd className="tabular-nums">{$(o.precio_venta)}</dd></div>
              {costos > 0 && <div className="flex justify-between"><dt className="text-texto-2">Costos por bolsa</dt><dd className="tabular-nums">− {$(costos)}</dd></div>}
              <div className="flex justify-between"><dt className="text-texto-2">Cálculo</dt><dd>{TIPO_COMISION[o.comision_tipo!]}{o.comision_valor ? ` (${Number(o.comision_valor)})` : ""}</dd></div>
              <div className="flex justify-between border-t border-borde pt-2"><dt>Bruta</dt><dd className="font-medium tabular-nums">{$(o.comision_bruta)}</dd></div>
              <div className="flex justify-between"><dt>Parte AGROVIA</dt><dd className="text-lg font-semibold tabular-nums text-marca">{$(o.comision_neta_agrovia)}</dd></div>
              <div className="flex justify-between"><dt className="text-texto-2">Cobrado</dt><dd className="tabular-nums">{$(o.importe_cobrado)}</dd></div>
              {o.fecha_exigible && <div className="flex justify-between"><dt className="text-texto-2">Exigible desde</dt><dd>{fecha(o.fecha_exigible)}</dd></div>}
              {o.fecha_cobro && <div className="flex justify-between"><dt className="text-texto-2">Cobrada el</dt><dd>{fecha(o.fecha_cobro)}</dd></div>}
              {esFacturado && <p className="pt-2 text-xs text-texto-2">Si se factura, se cobra comisión neta + IVA 21% ({$(Number(o.comision_bruta) * 1.21)}).</p>}
            </dl>
            {activa && (
              <details className="mt-4 rounded-lg border border-borde p-3">
                <summary className="cursor-pointer text-sm font-medium text-marca">Cambiar el cálculo</summary>
                <ActionForm action={cambiarComision.bind(null, id)} submit="Recalcular" resetOnSuccess={false} className="mt-3 space-y-3">
                  <select name="comision_tipo" defaultValue={o.comision_tipo!} className={inputCls}>
                    {Object.entries(TIPO_COMISION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input name="comision_valor" inputMode="decimal" placeholder="Valor (no hace falta en diferencia)" defaultValue={o.comision_valor ?? ""} className={inputCls} />
                </ActionForm>
              </details>
            )}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Reparto con comisionistas</p>
              {(participantes ?? []).length === 0 && <p className="text-sm text-texto-2">No se reparte: es toda de AGROVIA.</p>}
              <ul className="space-y-2">
                {(participantes ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded bg-fondo px-3 py-2 text-sm">
                    <span>{p.tercero?.razon_social} · {p.tipo === "porcentaje" ? `${Number(p.valor)}%` : $(p.valor)}</span>
                    {activa && <ActionForm action={quitarParticipante.bind(null, p.id, id)} submit="Quitar" variant="secondary" className="space-y-1 text-xs" />}
                  </li>
                ))}
              </ul>
              {activa && (
                <details className="mt-3 rounded-lg border border-borde p-3">
                  <summary className="cursor-pointer text-sm font-medium text-marca">+ Agregar reparto</summary>
                  <ActionForm action={agregarParticipante.bind(null, o.comision_id!, id)} submit="Agregar" className="mt-3 space-y-3">
                    <SelectTercero name="tercero_id" principales={c.comisionistas} todos={c.terceros} etiqueta="Comisionistas" requerido />
                    <div className="flex gap-2">
                      <select name="tipo" className={inputCls}><option value="porcentaje">%</option><option value="monto">Monto fijo</option></select>
                      <input name="valor" inputMode="decimal" required defaultValue="50" className={inputCls} />
                    </div>
                  </ActionForm>
                </details>
              )}
            </div>
          </Card>

          {/* Datos editables */}
          {activa && (
            <Card title="Editar datos">
              <ActionForm action={editarDatos.bind(null, id)} resetOnSuccess={false}>
                <Field label="Comprador">
                  <SelectTercero name="comprador_id" principales={c.compradores} todos={c.terceros} etiqueta="Clientes" defaultValue={o.comprador_id} requerido={esFacturado} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio compra"><input name="precio_compra" inputMode="decimal" defaultValue={o.precio_compra ?? ""} className={inputCls} /></Field>
                  <Field label="Precio venta"><input name="precio_venta" inputMode="decimal" defaultValue={o.precio_venta ?? ""} className={inputCls} /></Field>
                </div>
                <Field label="Condiciones de pago"><input name="condiciones_pago" defaultValue={o.condiciones_pago ?? ""} className={inputCls} /></Field>
                <Field label="Observaciones"><textarea name="observaciones" rows={2} defaultValue={o.observaciones ?? ""} className={inputCls} /></Field>
              </ActionForm>
            </Card>
          )}

          {activa && (o.bolsas_cargadas ?? 0) === 0 && (
            <Card title="Cancelar operación">
              <ActionForm action={cancelarOperacion.bind(null, id)} submit="Cancelar operación" variant="danger" confirm="¿Cancelar la operación? No se puede deshacer y el número no se reutiliza.">
                <Field label="Motivo *"><input name="motivo" required className={inputCls} /></Field>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
