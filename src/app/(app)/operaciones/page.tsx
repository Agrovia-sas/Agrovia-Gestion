import Link from "next/link";
import { Badge, btn, ButtonLink, Card, cx, EstadoCarga, inputCls, PageHeader, Table, td, th, tonoComision } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { $, bolsas, fecha, ESTADO_COMISION, ESTADO_LOGISTICO, MODALIDADES } from "@/lib/format";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";
type Enums = Database["public"]["Enums"];
type Modalidad = Enums["modalidad_operacion"];

const PESTANAS: { v: "" | Modalidad; titulo: string; detalle: string }[] = [
  { v: "", titulo: "Todas", detalle: "" },
  { v: "facturado", titulo: "Facturado", detalle: "1-xx · intermediación" },
  { v: "menudeo", titulo: "Menudeo", detalle: "2-xx · efectivo sin factura" },
  { v: "compraventa", titulo: "Compra-venta", detalle: "A-x · con factura" },
];

export default async function Operaciones({
  searchParams,
}: {
  searchParams: Promise<{ modalidad?: string; logistico?: string; comision?: string; q?: string; desde?: string; hasta?: string; canceladas?: string }>;
}) {
  const f = await searchParams;
  const modalidad = (f.modalidad && f.modalidad in MODALIDADES ? f.modalidad : "") as "" | Modalidad;
  const supabase = await createClient();

  let query = supabase
    .from("v_operaciones")
    .select("id, numero, numero_seq, modalidad, fecha_cierre, estado_comercial, vendedor, comprador, bolsas_totales, bolsas_cargadas, bolsas_pendientes, estado_logistico, estado_comision, comision_bruta, comision_neta_agrovia, precio_compra, precio_venta, costo_flete, costo_iibb, costo_dyc, costo_otros, costo_ganancias")
    .order("fecha_cierre", { ascending: false })
    .order("numero_seq", { ascending: false })
    .limit(1000);
  if (modalidad) query = query.eq("modalidad", modalidad);
  if (f.logistico && f.logistico in ESTADO_LOGISTICO) query = query.eq("estado_logistico", f.logistico as Enums["estado_logistico"]);
  if (f.comision && f.comision in ESTADO_COMISION) query = query.eq("estado_comision", f.comision as Enums["estado_comision"]);
  if (!f.canceladas) query = query.eq("estado_comercial", "cerrada");
  if (f.desde) query = query.gte("fecha_cierre", f.desde);
  if (f.hasta) query = query.lte("fecha_cierre", f.hasta);
  if (f.q) {
    const t = f.q.replace(/[%,()*]/g, "").trim();
    query = query.or(`numero.ilike.%${t}%,vendedor.ilike.%${t}%,comprador.ilike.%${t}%`);
  }

  // Cantidad por modalidad para las pestañas
  const contar = (m: Modalidad) =>
    supabase.from("operaciones").select("id", { count: "exact", head: true }).eq("modalidad", m).eq("estado_comercial", "cerrada");
  const [{ data }, cF, cM, cC, { data: custodia }] = await Promise.all([
    query,
    contar("facturado"),
    contar("menudeo"),
    contar("compraventa"),
    supabase.from("operaciones").select("id").eq("bolsas_en_custodia", true),
  ]);
  const cuentas: Record<string, number> = { facturado: cF.count ?? 0, menudeo: cM.count ?? 0, compraventa: cC.count ?? 0 };
  cuentas[""] = cuentas.facturado + cuentas.menudeo + cuentas.compraventa;
  const enCustodia = new Set((custodia ?? []).map((x) => x.id));

  const lista = data ?? [];
  const ids = lista.map((o) => o.id!).filter(Boolean);

  // Facturado: cuánto le pagó el comprador al productor (seguimiento)
  const pagado = new Map<string, number>();
  if (modalidad === "facturado" && ids.length) {
    const { data: pagos } = await supabase.from("seguimiento_pagos_directos").select("operacion_id, importe").in("operacion_id", ids);
    (pagos ?? []).forEach((p) => pagado.set(p.operacion_id, (pagado.get(p.operacion_id) ?? 0) + Number(p.importe)));
  }

  const totalComision = lista.reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);
  const totalBolsas = lista.reduce((s, o) => s + (o.bolsas_totales ?? 0), 0);
  const totalPendCarga = lista.reduce((s, o) => s + Math.max(0, o.bolsas_pendientes ?? 0), 0);

  const link = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ ...f, ...cambios }).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/operaciones${s ? `?${s}` : ""}`;
  };
  const etiquetaComision = modalidad === "facturado" ? "Comisión" : modalidad === "" ? "Comisión / utilidad" : "Utilidad";

  return (
    <>
      <PageHeader
        title="Operaciones comerciales"
        subtitle={`${lista.length} operaciones · ${bolsas(totalBolsas)} bolsas · ${bolsas(totalPendCarga)} pendientes de carga · ${$(totalComision)} de ${etiquetaComision.toLowerCase()} (parte AGROVIA)`}
        actions={<ButtonLink href={`/operaciones/nueva${modalidad ? `?modalidad=${modalidad}` : ""}`}>+ Nueva {modalidad ? MODALIDADES[modalidad].toLowerCase() : "operación"}</ButtonLink>}
      />

      {/* Pestañas por modalidad, como en la planilla */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-borde">
        {PESTANAS.map((p) => (
          <Link
            key={p.v}
            href={link({ modalidad: p.v || undefined })}
            className={cx(
              "-mb-px rounded-t-lg border px-4 py-2 text-sm transition",
              modalidad === p.v ? "border-borde border-b-white bg-white font-semibold text-marca" : "border-transparent text-texto-2 hover:text-texto",
            )}
          >
            {p.titulo} <span className="tabular-nums text-texto-2">({cuentas[p.v]})</span>
            {p.detalle && <span className="ml-1 hidden text-xs font-normal text-texto-2 lg:inline">· {p.detalle}</span>}
          </Link>
        ))}
      </div>

      <Card>
        <form className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {modalidad && <input type="hidden" name="modalidad" value={modalidad} />}
          <input name="q" defaultValue={f.q} placeholder="Número, productor o comprador" className={inputCls + " lg:col-span-2"} />
          <select name="logistico" defaultValue={f.logistico ?? ""} className={inputCls}>
            <option value="">Cualquier carga</option>
            {Object.entries(ESTADO_LOGISTICO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select name="comision" defaultValue={f.comision ?? ""} className={inputCls}>
            <option value="">Cualquier {etiquetaComision.toLowerCase()}</option>
            {Object.entries(ESTADO_COMISION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" name="desde" defaultValue={f.desde} className={inputCls} title="Desde" />
          <div className="flex gap-2">
            <input type="date" name="hasta" defaultValue={f.hasta} className={inputCls} title="Hasta" />
            <button className={btn("secondary")}>Filtrar</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-texto-2 lg:col-span-6">
            <input type="checkbox" name="canceladas" value="1" defaultChecked={!!f.canceladas} /> Incluir canceladas
          </label>
        </form>

        <Table
          head={
            <tr>
              <th className={th}>Op.</th>
              <th className={th}>Productor → Comprador</th>
              <th className={th + " num"}>Bolsas</th>
              <th className={th + " num"}>Compra / Venta</th>
              {modalidad === "compraventa" && <th className={th + " num"}>Costos x bolsa</th>}
              <th className={th}>Carga</th>
              {modalidad === "facturado" && <th className={th}>Pago al productor</th>}
              <th className={th + " num"}>{etiquetaComision}</th>
              <th className={th}>Estado</th>
            </tr>
          }
          empty={lista.length === 0 ? "No hay operaciones con estos filtros." : undefined}
        >
          {lista.map((o) => {
            const costos = Number(o.costo_flete) + Number(o.costo_iibb) + Number(o.costo_dyc) + Number(o.costo_otros) + Number(o.costo_ganancias);
            const totalProductor = Number(o.precio_compra ?? 0) * (o.bolsas_totales ?? 0);
            const pag = pagado.get(o.id!) ?? 0;
            return (
              <tr key={o.id} className={"hover:bg-fondo " + (o.estado_comercial === "cancelada" ? "opacity-50" : "")}>
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{modalidad ? "" : `${MODALIDADES[o.modalidad!]} · `}{fecha(o.fecha_cierre)}</div>
                  {enCustodia.has(o.id!) && <Badge tone="proceso">Custodia</Badge>}
                </td>
                <td className={td}>
                  <div className="font-medium">{o.vendedor}</div>
                  <div className="text-xs text-texto-2">→ {o.comprador ?? "sin comprador"}</div>
                </td>
                <td className={td + " num"}>{bolsas(o.bolsas_totales)}</td>
                <td className={td + " num text-texto-2"}>{$(o.precio_compra)}<br />{$(o.precio_venta)}</td>
                {modalidad === "compraventa" && <td className={td + " num text-texto-2"}>{costos > 0 ? $(costos) : "—"}</td>}
                <td className={td}>
                  <EstadoCarga cargadas={o.bolsas_cargadas} totales={o.bolsas_totales} />
                </td>
                {modalidad === "facturado" && (
                  <td className={td + " text-xs"}>
                    {pag <= 0 ? (
                      <span className="text-texto-2">Sin registrar</span>
                    ) : pag >= totalProductor ? (
                      <span className="text-ok">✓ Completo</span>
                    ) : (
                      <span className="text-proceso">Parcial {Math.round((100 * pag) / totalProductor)}%</span>
                    )}
                  </td>
                )}
                <td className={td + " num font-medium"}>{$(o.comision_neta_agrovia)}</td>
                <td className={td}>
                  {o.estado_comercial === "cancelada" ? (
                    <Badge>Cancelada</Badge>
                  ) : (
                    <Badge tone={tonoComision(o.estado_comision!)}>{ESTADO_COMISION[o.estado_comision!]}</Badge>
                  )}
                </td>
              </tr>
            );
          })}
          {lista.length > 0 && (
            <tr className="border-t-2 border-texto/20 font-semibold">
              <td className={td} colSpan={2}>Total ({lista.length})</td>
              <td className={td + " num"}>{bolsas(totalBolsas)}</td>
              <td className={td} colSpan={modalidad === "compraventa" ? 3 : modalidad === "facturado" ? 3 : 2}></td>
              <td className={td + " num"}>{$(totalComision)}</td>
              <td className={td}></td>
            </tr>
          )}
        </Table>
      </Card>
    </>
  );
}
