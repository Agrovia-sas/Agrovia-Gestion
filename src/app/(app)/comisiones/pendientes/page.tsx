import Link from "next/link";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Badge, Card, EstadoCarga, PageHeader, Table, btn, cx, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CAMPOS_PENDIENTES, ESTADOS_PENDIENTES, diasDesde, pendienteAgrovia } from "@/lib/comisiones";
import { $, fecha, MODALIDADES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ComisionesPendientes({
  searchParams,
}: {
  searchParams: Promise<{ comprador?: string; estado?: string; modalidad?: string }>;
}) {
  const f = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("v_operaciones")
    .select(CAMPOS_PENDIENTES)
    .eq("estado_comercial", "cerrada")
    .in("estado_comision", [...ESTADOS_PENDIENTES])
    .order("fecha_cierre", { ascending: true })
    .limit(2000);
  if (f.estado === "pendiente_cobro" || f.estado === "esperando_carga") q = q.eq("estado_comision", f.estado);
  if (f.modalidad === "facturado" || f.modalidad === "menudeo" || f.modalidad === "compraventa") q = q.eq("modalidad", f.modalidad);
  if (f.comprador) q = q.eq("comprador_id", f.comprador);
  const { data } = await q;

  const lista = (data ?? []).map((o) => ({ ...o, pendiente: pendienteAgrovia(o), dias: diasDesde(o.fecha_cierre) })).filter((o) => o.pendiente > 0);
  const total = lista.reduce((s, o) => s + o.pendiente, 0);
  const exigible = lista.filter((o) => o.estado_comision === "pendiente_cobro").reduce((s, o) => s + o.pendiente, 0);

  // Resumen por comprador, de mayor a menor
  const porComprador = new Map<string, { id: string | null; nombre: string; total: number; ops: number }>();
  lista.forEach((o) => {
    const k = o.comprador_id ?? "—";
    const x = porComprador.get(k) ?? { id: o.comprador_id, nombre: o.comprador ?? "Sin comprador", total: 0, ops: 0 };
    x.total += o.pendiente;
    x.ops += 1;
    porComprador.set(k, x);
  });
  const resumen = [...porComprador.values()].sort((a, b) => b.total - a.total);

  const filtroLink = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const todo = { ...f, ...cambios };
    Object.entries(todo).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/comisiones/pendientes${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Comisiones pendientes de cobro"
        subtitle={`${lista.length} operaciones · ${$(total)} por cobrar (parte de AGROVIA, sin IVA) · ${$(exigible)} ya exigibles. Ordenadas de la más vieja a la más nueva.`}
        actions={
          <>
            <Link href="/comisiones" className={btn("secondary")}>Ver tablero</Link>
            <BotonImprimir />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm print:hidden">
        {[["", "Todas"], ["pendiente_cobro", "Carga completa (exigibles)"], ["esperando_carga", "Esperando carga"]].map(([v, l]) => (
          <Link key={v} href={filtroLink({ estado: v || undefined })} className={cx("rounded-lg px-3 py-1.5", (f.estado ?? "") === v ? "bg-marca text-white" : "border border-borde bg-white")}>
            {l}
          </Link>
        ))}
        <span className="mx-1 self-center text-texto-2">·</span>
        {[["", "Todas las modalidades"], ["facturado", "Facturado"], ["menudeo", "Menudeo"], ["compraventa", "Compra-venta"]].map(([v, l]) => (
          <Link key={v} href={filtroLink({ modalidad: v || undefined })} className={cx("rounded-lg px-3 py-1.5", (f.modalidad ?? "") === v ? "bg-marca text-white" : "border border-borde bg-white")}>
            {l}
          </Link>
        ))}
        {f.comprador && (
          <Link href={filtroLink({ comprador: undefined })} className="rounded-lg border border-borde bg-white px-3 py-1.5">
            Quitar filtro de comprador ✕
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card title="Detalle" className="lg:col-span-3">
          <Table
            head={
              <tr>
                <th className={th}>Op.</th>
                <th className={th}>Cierre</th>
                <th className={th + " num"}>Días</th>
                <th className={th}>Comprador</th>
                <th className={th}>Carga</th>
                <th className={th + " num"}>Comisión</th>
                <th className={th + " num"}>Falta cobrar</th>
              </tr>
            }
            empty={lista.length === 0 ? "No hay comisiones pendientes. 🎉" : undefined}
          >
            {lista.map((o) => (
              <tr key={o.id} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]}</div>
                </td>
                <td className={td}>{fecha(o.fecha_cierre)}</td>
                <td className={cx(td, "num", o.dias > 60 ? "font-semibold text-vencido" : o.dias > 30 ? "text-[#9a7210]" : "")}>{o.dias}</td>
                <td className={td}>
                  {o.comprador_id ? (
                    <Link href={filtroLink({ comprador: o.comprador_id })} className="hover:underline">{o.comprador}</Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={td}>
                  <EstadoCarga cargadas={o.bolsas_cargadas} totales={o.bolsas_totales} />
                  {o.cobro_parcial && <div className="mt-1"><Badge tone="pendiente">Cobro parcial</Badge></div>}
                </td>
                <td className={td + " num text-texto-2"}>{$(o.comision_neta_agrovia)}</td>
                <td className={td + " num font-semibold"}>{$(o.pendiente)}</td>
              </tr>
            ))}
            {lista.length > 0 && (
              <tr className="border-t-2 border-texto/20">
                <td className={td + " font-semibold"} colSpan={6}>Total</td>
                <td className={td + " num font-semibold"}>{$(total)}</td>
              </tr>
            )}
          </Table>
        </Card>

        <Card title="Por comprador">
          <ul className="space-y-2 text-sm">
            {resumen.map((r) => (
              <li key={r.id ?? "sin"} className="flex items-baseline justify-between gap-2">
                {r.id ? (
                  <Link href={filtroLink({ comprador: r.id })} className="truncate hover:underline">{r.nombre}</Link>
                ) : (
                  <span className="truncate">{r.nombre}</span>
                )}
                <span className="whitespace-nowrap tabular-nums">
                  {$(r.total)} <span className="text-xs text-texto-2">({r.ops})</span>
                </span>
              </li>
            ))}
            {resumen.length === 0 && <li className="text-texto-2">—</li>}
          </ul>
        </Card>
      </div>
      <p className="mt-4 text-xs text-texto-2 print:hidden">
        Días en rojo: más de 60 desde el cierre. En ámbar: más de 30. «Carga completa» significa que ya se le puede reclamar al comprador.
      </p>
    </>
  );
}
