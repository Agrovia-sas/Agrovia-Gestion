import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, PageHeader, Table, td, th, tonoComision, tonoLogistico } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { $, bolsas, fecha, ESTADO_COMISION, ESTADO_LOGISTICO, MODALIDADES } from "@/lib/format";
import { CamposTercero } from "../form";
import { editarTercero } from "../actions";

export const dynamic = "force-dynamic";

export default async function Tercero({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: t }, { data: roles }, { data: ops }] = await Promise.all([
    supabase.from("terceros").select("*").eq("id", id).maybeSingle(),
    supabase.from("tercero_roles").select("rol").eq("tercero_id", id),
    supabase
      .from("v_operaciones")
      .select("id, numero, modalidad, fecha_cierre, vendedor, comprador, vendedor_id, bolsas_totales, bolsas_cargadas, estado_logistico, estado_comision, comision_neta_agrovia")
      .or(`vendedor_id.eq.${id},comprador_id.eq.${id},comisionista_id.eq.${id}`)
      .order("fecha_cierre", { ascending: false }),
  ]);
  if (!t) notFound();

  const pendiente = (ops ?? [])
    .filter((o) => o.estado_comision === "pendiente_cobro" || o.estado_comision === "esperando_carga")
    .reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);

  return (
    <>
      <PageHeader
        title={t.razon_social}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {(roles ?? []).map((r) => <Badge key={r.rol}>{r.rol}</Badge>)}
            {t.cuit && <span className="tabular-nums">CUIT {t.cuit}</span>}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title={`Operaciones (${ops?.length ?? 0})`} className="lg:col-span-3" actions={<span className="text-sm text-texto-2">Comisiones abiertas: {$(pendiente)}</span>}>
          <Table
            head={
              <tr>
                <th className={th}>Op.</th>
                <th className={th}>Rol</th>
                <th className={th + " num"}>Bolsas</th>
                <th className={th}>Estados</th>
              </tr>
            }
            empty={!ops?.length ? "Sin operaciones todavía." : undefined}
          >
            {(ops ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]} · {fecha(o.fecha_cierre)}</div>
                </td>
                <td className={td + " text-texto-2"}>{o.vendedor_id === id ? `Vende a ${o.comprador ?? "—"}` : `Compra a ${o.vendedor}`}</td>
                <td className={td + " num"}>{bolsas(o.bolsas_cargadas)} / {bolsas(o.bolsas_totales)}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={tonoLogistico(o.estado_logistico!)}>{ESTADO_LOGISTICO[o.estado_logistico!]}</Badge>
                    <Badge tone={tonoComision(o.estado_comision!)}>{ESTADO_COMISION[o.estado_comision!]}</Badge>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <p className="mt-4 text-xs text-texto-2">La cuenta corriente con saldos llega con la etapa de finanzas.</p>
        </Card>
        <Card title="Datos" className="lg:col-span-2">
          <ActionForm action={editarTercero.bind(null, id)} resetOnSuccess={false}>
            <CamposTercero t={t} roles={(roles ?? []).map((r) => r.rol)} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
