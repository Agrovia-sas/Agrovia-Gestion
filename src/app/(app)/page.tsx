import Link from "next/link";
import { Badge, Card, PageHeader, ProgressBar, Stat, Table, ButtonLink, td, th, tonoComision } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { $, bolsas, fecha, primerDiaDelMes, ESTADO_COMISION, MODALIDADES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Panel() {
  const supabase = await createClient();
  const mes = primerDiaDelMes();

  const [{ data: ops }, { data: percibidas }, { data: vencidas }] = await Promise.all([
    supabase
      .from("v_operaciones")
      .select("id, numero, modalidad, fecha_cierre, vendedor, comprador, bolsas_totales, bolsas_cargadas, bolsas_pendientes, estado_comision, comision_neta_agrovia, importe_cobrado, comision_bruta")
      .eq("estado_comercial", "cerrada")
      .order("fecha_cierre", { ascending: false })
      .limit(1000),
    supabase.from("v_comisiones_percibidas").select("cobrado_neto_agrovia").gte("mes", mes),
    supabase
      .from("v_obligaciones")
      .select("id, concepto, pendiente, vencimiento, dias_atraso, operacion_id")
      .eq("tipo", "comision")
      .gt("dias_atraso", 0)
      .order("vencimiento"),
  ]);

  const lista = ops ?? [];
  const abiertas = lista.filter((o) => (o.bolsas_pendientes ?? 0) > 0);
  const bolsasPend = abiertas.reduce((s, o) => s + (o.bolsas_pendientes ?? 0), 0);
  const pendCobro = lista.filter((o) => o.estado_comision === "pendiente_cobro");
  // Lo que falta cobrar, en la parte de AGROVIA (neto del reparto con comisionistas)
  const montoPendCobro = pendCobro.reduce((s, o) => {
    const bruta = Number(o.comision_bruta) || 0;
    const neta = Number(o.comision_neta_agrovia) || 0;
    const faltaBruto = bruta - Number(o.importe_cobrado ?? 0);
    return s + (bruta > 0 ? (faltaBruto * neta) / bruta : 0);
  }, 0);
  const esperando = lista.filter((o) => o.estado_comision === "esperando_carga");
  const montoEsperando = esperando.reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);
  const cobradoMes = (percibidas ?? []).reduce((s, p) => s + Number(p.cobrado_neto_agrovia ?? 0), 0);

  return (
    <>
      <PageHeader title="Panel general" subtitle="Lo comercial al día. Los números financieros se suman en la etapa de finanzas." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Comisiones cobradas este mes" value={$(cobradoMes)} hint="Percibido, neto de IVA y de reparto" tone="ok" href="/comisiones?estado=cobrada" />
        <Stat label="Comisiones pendientes de cobro" value={$(montoPendCobro)} hint={`${pendCobro.length} operaciones con la carga completa`} tone="pendiente" href="/comisiones?estado=pendiente_cobro" />
        <Stat label="Esperando completar carga" value={$(montoEsperando)} hint={`${esperando.length} operaciones`} tone="proceso" href="/comisiones?estado=esperando_carga" />
        <Stat label="Bolsas pendientes de carga" value={bolsas(bolsasPend)} hint={`${abiertas.length} operaciones abiertas`} href="/cargas" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Operaciones con carga pendiente" className="lg:col-span-2" actions={<ButtonLink href="/operaciones" variant="secondary">Ver todas</ButtonLink>}>
          <Table
            head={
              <tr>
                <th className={th}>Op.</th>
                <th className={th}>Partes</th>
                <th className={th + " w-48"}>Carga</th>
                <th className={th}>Comisión</th>
              </tr>
            }
            empty={abiertas.length === 0 ? "No hay operaciones con bolsas pendientes." : undefined}
          >
            {abiertas.slice(0, 10).map((o) => (
              <tr key={o.id} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]} · {fecha(o.fecha_cierre)}</div>
                </td>
                <td className={td}>
                  <div>{o.vendedor}</div>
                  <div className="text-xs text-texto-2">→ {o.comprador ?? "sin comprador"}</div>
                </td>
                <td className={td}>
                  <ProgressBar value={o.bolsas_cargadas ?? 0} max={o.bolsas_totales ?? 0} />
                  <div className="mt-1 text-xs tabular-nums text-texto-2">{bolsas(o.bolsas_cargadas)} / {bolsas(o.bolsas_totales)} bolsas</div>
                </td>
                <td className={td}>
                  <Badge tone={tonoComision(o.estado_comision!)}>{ESTADO_COMISION[o.estado_comision!]}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Alertas">
          {(vencidas ?? []).length === 0 ? (
            <p className="text-sm text-texto-2">Sin comisiones vencidas. 👌</p>
          ) : (
            <ul className="space-y-3">
              {(vencidas ?? []).map((v) => (
                <li key={v.id} className="rounded-lg border border-vencido/30 bg-vencido/5 p-3 text-sm">
                  <Link href={`/operaciones/${v.operacion_id}`} className="font-medium text-vencido hover:underline">{v.concepto}</Link>
                  <div className="text-texto-2">{$(v.pendiente)} · vencida hace {v.dias_atraso} días ({fecha(v.vencimiento)})</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
