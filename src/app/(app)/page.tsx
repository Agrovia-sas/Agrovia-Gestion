import Link from "next/link";
import { Badge, ButtonLink, Card, PageHeader, ProgressBar, Stat, Table, cx, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CAMPOS_PENDIENTES, ESTADOS_PENDIENTES, diasDesde, pendienteAgrovia } from "@/lib/comisiones";
import { $, bolsas, fecha, primerDiaDelMes, MODALIDADES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Panel() {
  const supabase = await createClient();
  const mes = primerDiaDelMes();

  const [{ data: pendientesRaw }, { data: abiertasRaw }, { data: percibidas }, { data: vencidas }] = await Promise.all([
    // Todas las comisiones que se deben, de cualquier mes
    supabase
      .from("v_operaciones")
      .select(CAMPOS_PENDIENTES)
      .eq("estado_comercial", "cerrada")
      .in("estado_comision", [...ESTADOS_PENDIENTES])
      .order("fecha_cierre", { ascending: true })
      .limit(2000),
    supabase
      .from("v_operaciones")
      .select("id, numero, modalidad, fecha_cierre, vendedor, comprador, bolsas_totales, bolsas_cargadas, bolsas_pendientes")
      .eq("estado_comercial", "cerrada")
      .gt("bolsas_pendientes", 0)
      .order("fecha_cierre", { ascending: true }),
    supabase.from("v_comisiones_percibidas").select("cobrado_neto_agrovia").gte("mes", mes),
    supabase
      .from("v_obligaciones")
      .select("id, concepto, pendiente, vencimiento, dias_atraso, operacion_id")
      .eq("tipo", "comision")
      .gt("dias_atraso", 0)
      .order("vencimiento"),
  ]);

  const pendientes = (pendientesRaw ?? [])
    .map((o) => ({ ...o, pendiente: pendienteAgrovia(o), dias: diasDesde(o.fecha_cierre) }))
    .filter((o) => o.pendiente > 0);
  const totalPorCobrar = pendientes.reduce((s, o) => s + o.pendiente, 0);
  const exigibles = pendientes.filter((o) => o.estado_comision === "pendiente_cobro");
  const totalExigible = exigibles.reduce((s, o) => s + o.pendiente, 0);
  const viejas = pendientes.filter((o) => o.dias > 30).length;
  const abiertas = abiertasRaw ?? [];
  const bolsasPend = abiertas.reduce((s, o) => s + (o.bolsas_pendientes ?? 0), 0);
  const cobradoMes = (percibidas ?? []).reduce((s, p) => s + Number(p.cobrado_neto_agrovia ?? 0), 0);

  return (
    <>
      <PageHeader title="Panel general" subtitle="Lo comercial al día. Los números de Galicia y Caja se suman en la etapa de finanzas." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Comisiones por cobrar (todas)"
          value={$(totalPorCobrar)}
          hint={`${pendientes.length} operaciones, de cualquier mes${viejas ? ` · ${viejas} con más de 30 días` : ""}`}
          tone="vencido"
          href="/comisiones/pendientes"
        />
        <Stat
          label="Ya exigibles (carga completa)"
          value={$(totalExigible)}
          hint={`${exigibles.length} operaciones para reclamar`}
          tone="pendiente"
          href="/comisiones/pendientes?estado=pendiente_cobro"
        />
        <Stat label="Comisiones cobradas este mes" value={$(cobradoMes)} hint="Percibido, neto de IVA y de reparto" tone="ok" href="/comisiones" />
        <Stat label="Bolsas pendientes de carga" value={bolsas(bolsasPend)} hint={`${abiertas.length} operaciones abiertas`} href="/cargas" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Comisiones pendientes de cobro"
          className="lg:col-span-2"
          actions={<ButtonLink href="/comisiones/pendientes" variant="secondary">Ver lista completa</ButtonLink>}
        >
          <Table
            head={
              <tr>
                <th className={th}>Op.</th>
                <th className={th}>Comprador</th>
                <th className={th + " num"}>Días</th>
                <th className={th}>Carga</th>
                <th className={th + " num"}>Falta cobrar</th>
              </tr>
            }
            empty={pendientes.length === 0 ? "No hay comisiones pendientes. 🎉" : undefined}
          >
            {pendientes.slice(0, 12).map((o) => (
              <tr key={o.id} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]} · {fecha(o.fecha_cierre)}</div>
                </td>
                <td className={td}>{o.comprador ?? "—"}</td>
                <td className={cx(td, "num", o.dias > 60 ? "font-semibold text-vencido" : o.dias > 30 ? "text-[#9a7210]" : "")}>{o.dias}</td>
                <td className={td}>
                  {o.estado_comision === "pendiente_cobro" ? <Badge tone="ok">Completa</Badge> : <Badge tone="proceso">{bolsas(o.bolsas_cargadas)} / {bolsas(o.bolsas_totales)}</Badge>}
                </td>
                <td className={td + " num font-semibold"}>{$(o.pendiente)}</td>
              </tr>
            ))}
          </Table>
          {pendientes.length > 12 && (
            <p className="mt-3 text-sm text-texto-2">
              Y {pendientes.length - 12} más. <Link href="/comisiones/pendientes" className="text-marca underline">Ver todas</Link>
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Alertas">
            {(vencidas ?? []).length === 0 && viejas === 0 ? (
              <p className="text-sm text-texto-2">Sin alertas. 👌</p>
            ) : (
              <ul className="space-y-3">
                {viejas > 0 && (
                  <li className="rounded-lg border border-pendiente/40 bg-pendiente/10 p-3 text-sm">
                    <Link href="/comisiones/pendientes" className="font-medium hover:underline">
                      {viejas} comisiones llevan más de 30 días sin cobrarse
                    </Link>
                  </li>
                )}
                {(vencidas ?? []).map((v) => (
                  <li key={v.id} className="rounded-lg border border-vencido/30 bg-vencido/5 p-3 text-sm">
                    <Link href={`/operaciones/${v.operacion_id}`} className="font-medium text-vencido hover:underline">{v.concepto}</Link>
                    <div className="text-texto-2">{$(v.pendiente)} · vencida hace {v.dias_atraso} días ({fecha(v.vencimiento)})</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Carga pendiente" actions={<ButtonLink href="/cargas" variant="secondary">Ver</ButtonLink>}>
            {abiertas.length === 0 ? (
              <p className="text-sm text-texto-2">No hay operaciones con bolsas pendientes.</p>
            ) : (
              <ul className="space-y-3">
                {abiertas.slice(0, 6).map((o) => (
                  <li key={o.id} className="text-sm">
                    <div className="flex justify-between">
                      <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                      <span className="tabular-nums text-texto-2">faltan {bolsas(o.bolsas_pendientes)}</span>
                    </div>
                    <div className="truncate text-xs text-texto-2">{o.vendedor} → {o.comprador ?? "—"}</div>
                    <div className="mt-1"><ProgressBar value={o.bolsas_cargadas ?? 0} max={o.bolsas_totales ?? 0} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
