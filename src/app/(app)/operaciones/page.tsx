import Link from "next/link";
import { Badge, btn, ButtonLink, Card, EstadoCarga, inputCls, PageHeader, Table, td, th, tonoComision, tonoLogistico } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { $, bolsas, fecha, ESTADO_COMISION, ESTADO_LOGISTICO, MODALIDADES } from "@/lib/format";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";
type Enums = Database["public"]["Enums"];

export default async function Operaciones({
  searchParams,
}: {
  searchParams: Promise<{ modalidad?: string; logistico?: string; comision?: string; q?: string; desde?: string; hasta?: string; canceladas?: string }>;
}) {
  const f = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("v_operaciones")
    .select("id, numero, numero_seq, modalidad, fecha_cierre, estado_comercial, vendedor, comprador, bolsas_totales, bolsas_cargadas, bolsas_pendientes, estado_logistico, estado_comision, comision_bruta, comision_neta_agrovia, precio_compra, precio_venta")
    .order("fecha_cierre", { ascending: false })
    .order("numero_seq", { ascending: false })
    .limit(500);
  if (f.modalidad && f.modalidad in MODALIDADES) query = query.eq("modalidad", f.modalidad as Enums["modalidad_operacion"]);
  if (f.logistico && f.logistico in ESTADO_LOGISTICO) query = query.eq("estado_logistico", f.logistico as Enums["estado_logistico"]);
  if (f.comision && f.comision in ESTADO_COMISION) query = query.eq("estado_comision", f.comision as Enums["estado_comision"]);
  if (!f.canceladas) query = query.eq("estado_comercial", "cerrada");
  if (f.desde) query = query.gte("fecha_cierre", f.desde);
  if (f.hasta) query = query.lte("fecha_cierre", f.hasta);
  if (f.q) {
    const t = f.q.replace(/[%,()*]/g, "").trim();
    query = query.or(`numero.ilike.%${t}%,vendedor.ilike.%${t}%,comprador.ilike.%${t}%`);
  }
  const { data } = await query;
  const lista = data ?? [];
  const totalComision = lista.reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);
  const totalBolsas = lista.reduce((s, o) => s + (o.bolsas_totales ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Operaciones comerciales"
        subtitle={`${lista.length} operaciones · ${bolsas(totalBolsas)} bolsas · ${$(totalComision)} en comisiones/utilidad (parte AGROVIA)`}
        actions={<ButtonLink href="/operaciones/nueva">+ Nueva operación</ButtonLink>}
      />
      <Card>
        <form className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <input name="q" defaultValue={f.q} placeholder="Número o tercero" className={inputCls + " lg:col-span-2"} />
          <select name="modalidad" defaultValue={f.modalidad ?? ""} className={inputCls}>
            <option value="">Todas las modalidades</option>
            {Object.entries(MODALIDADES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select name="logistico" defaultValue={f.logistico ?? ""} className={inputCls}>
            <option value="">Cualquier carga</option>
            {Object.entries(ESTADO_LOGISTICO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select name="comision" defaultValue={f.comision ?? ""} className={inputCls}>
            <option value="">Cualquier comisión</option>
            {Object.entries(ESTADO_COMISION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" name="desde" defaultValue={f.desde} className={inputCls} title="Desde" />
          <div className="flex gap-2">
            <input type="date" name="hasta" defaultValue={f.hasta} className={inputCls} title="Hasta" />
            <button className={btn("secondary")}>Filtrar</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-texto-2 lg:col-span-7">
            <input type="checkbox" name="canceladas" value="1" defaultChecked={!!f.canceladas} /> Incluir canceladas
          </label>
        </form>
        <Table
          head={
            <tr>
              <th className={th}>Op.</th>
              <th className={th}>Vendedor → Comprador</th>
              <th className={th + " num"}>Compra / Venta</th>
              <th className={th + " w-40"}>Carga</th>
              <th className={th + " num"}>Comisión</th>
              <th className={th}>Estado</th>
            </tr>
          }
          empty={lista.length === 0 ? "No hay operaciones con estos filtros." : undefined}
        >
          {lista.map((o) => (
            <tr key={o.id} className={"hover:bg-fondo " + (o.estado_comercial === "cancelada" ? "opacity-50" : "")}>
              <td className={td}>
                <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]} · {fecha(o.fecha_cierre)}</div>
              </td>
              <td className={td}>
                <div>{o.vendedor}</div>
                <div className="text-xs text-texto-2">→ {o.comprador ?? "sin comprador"}</div>
              </td>
              <td className={td + " num text-texto-2"}>{$(o.precio_compra)}<br />{$(o.precio_venta)}</td>
              <td className={td}>
                <EstadoCarga cargadas={o.bolsas_cargadas} totales={o.bolsas_totales} />
              </td>
              <td className={td + " num"}>{$(o.comision_neta_agrovia)}</td>
              <td className={td}>
                <div className="flex flex-col items-start gap-1">
                  {o.estado_comercial === "cancelada" ? (
                    <Badge>Cancelada</Badge>
                  ) : (
                    <>
                      <Badge tone={tonoLogistico(o.estado_logistico!)}>{ESTADO_LOGISTICO[o.estado_logistico!]}</Badge>
                      <Badge tone={tonoComision(o.estado_comision!)}>{ESTADO_COMISION[o.estado_comision!]}</Badge>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
