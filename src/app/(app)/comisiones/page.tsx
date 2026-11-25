import Link from "next/link";
import { Badge, PageHeader, ProgressBar, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { $, bolsas, fecha, MODALIDADES } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNAS = [
  { estado: "esperando_carga", titulo: "Esperando completar carga", tono: "border-t-proceso" },
  { estado: "pendiente_cobro", titulo: "Pendiente de cobro", tono: "border-t-pendiente" },
  { estado: "cobrada", titulo: "Cobrada", tono: "border-t-ok" },
] as const;

export default async function Comisiones({ searchParams }: { searchParams: Promise<{ modalidad?: string; comprador?: string }> }) {
  const f = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("v_operaciones")
    .select("id, numero, modalidad, fecha_cierre, comprador, comprador_id, vendedor, bolsas_totales, bolsas_cargadas, estado_comision, comision_bruta, comision_neta_agrovia, importe_cobrado, fecha_exigible, fecha_cobro, cobro_anticipado, cobro_parcial")
    .eq("estado_comercial", "cerrada")
    .order("fecha_cierre", { ascending: false })
    .limit(1000);
  if (f.modalidad === "facturado" || f.modalidad === "menudeo" || f.modalidad === "compraventa") q = q.eq("modalidad", f.modalidad);
  if (f.comprador) q = q.eq("comprador_id", f.comprador);
  const { data } = await q;
  const lista = data ?? [];

  return (
    <>
      <PageHeader
        title="Comisiones"
        subtitle="En Facturado es la comisión que se le cobra al comprador. En Menudeo y Compra-venta es la utilidad. Importes en la parte de AGROVIA, sin IVA."
        actions={
          <div className="flex gap-1 text-sm">
            {[["", "Todas"], ["facturado", "Facturado"], ["menudeo", "Menudeo"], ["compraventa", "Compra-venta"]].map(([v, l]) => (
              <Link key={v} href={v ? `/comisiones?modalidad=${v}` : "/comisiones"} className={cx("rounded-lg px-3 py-1.5", (f.modalidad ?? "") === v ? "bg-marca text-white" : "border border-borde bg-white")}>
                {l}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNAS.map((col) => {
          const items = lista.filter((o) => o.estado_comision === col.estado);
          const total = items.reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);
          return (
            <section key={col.estado} className={cx("rounded-xl border border-t-4 border-borde bg-white", col.tono)}>
              <header className="flex items-baseline justify-between border-b border-borde px-4 py-3">
                <h2 className="font-semibold">{col.titulo} <span className="text-texto-2">({items.length})</span></h2>
                <span className="font-semibold tabular-nums">{$(total)}</span>
              </header>
              <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
                {items.length === 0 && <li className="py-6 text-center text-sm text-texto-2">Nada por acá.</li>}
                {items.map((o) => (
                  <li key={o.id}>
                    <Link href={`/operaciones/${o.id}`} className="block rounded-lg border border-borde p-3 transition hover:border-marca-medio">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-marca">{o.numero}</span>
                        <span className="font-semibold tabular-nums">{$(o.comision_neta_agrovia)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm">{o.comprador ?? "sin comprador"}</p>
                      <p className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]} · cierre {fecha(o.fecha_cierre)}</p>
                      {col.estado === "esperando_carga" && (
                        <div className="mt-2">
                          <ProgressBar value={o.bolsas_cargadas ?? 0} max={o.bolsas_totales ?? 0} />
                          <p className="mt-1 text-xs tabular-nums text-texto-2">{bolsas(o.bolsas_cargadas)} / {bolsas(o.bolsas_totales)} bolsas</p>
                        </div>
                      )}
                      {col.estado === "pendiente_cobro" && o.fecha_exigible && <p className="mt-1 text-xs text-texto-2">Exigible desde {fecha(o.fecha_exigible)}</p>}
                      {col.estado === "cobrada" && o.fecha_cobro && <p className="mt-1 text-xs text-texto-2">Cobrada el {fecha(o.fecha_cobro)}</p>}
                      <div className="mt-1 flex gap-1">
                        {o.cobro_anticipado && <Badge tone="pendiente">Anticipada</Badge>}
                        {o.cobro_parcial && <Badge tone="pendiente">Parcial: {$(o.importe_cobrado)}</Badge>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-texto-2">El botón para registrar cobros llega con la etapa de finanzas (Galicia, Caja y eCheqs).</p>
    </>
  );
}
