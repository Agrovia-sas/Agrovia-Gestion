import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Badge, Card, PageHeader, Stat, Table, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { $, bolsas, fecha, hoy } from "@/lib/format";
import { TIPO_CUSTODIA, efectoCustodia } from "@/lib/custodia";
import { destinosCustodia } from "@/lib/custodia-destinos";
import { borrarMovimiento, registrarMovimiento } from "../actions";
import { CamposMovimiento } from "../form";

export const dynamic = "force-dynamic";

export default async function CustodiaDueno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: dueno }, { data: movs }, { data: fisicas }, c, { data: saldo }, destinos] = await Promise.all([
    supabase.from("terceros").select("id, razon_social").eq("id", id).maybeSingle(),
    supabase
      .from("custodia_movimientos")
      .select("*, marca:marcas(nombre), destinatario:terceros!custodia_movimientos_destinatario_id_fkey(razon_social), operacion:operaciones(id, numero, comprador:terceros!operaciones_comprador_id_fkey(razon_social))")
      .eq("dueno_id", id)
      .order("fecha")
      .order("created_at"),
    supabase.from("v_custodia_fisicas").select("*").eq("dueno_id", id),
    cargarCatalogos(supabase),
    supabase.from("v_custodia_saldos").select("*").eq("dueno_id", id).maybeSingle(),
    destinosCustodia(supabase, id),
  ]);
  if (!dueno) notFound();
  const pendientesDeCarga = destinos.filter((d) => !d.manual && d.bolsas - d.cargadas > 0);
  const lugarNombre = new Map(c.ubicaciones.map((u) => [u.value.split(":")[1], u.label]));
  const lugar = (ing: string | null, dep: string | null) => (ing ?? dep ? lugarNombre.get((ing ?? dep)!) ?? "—" : null);

  let fis = 0;
  let deuda = 0;
  const filas = (movs ?? []).map((m) => {
    const e = efectoCustodia(m.tipo, m.bolsas);
    fis += e.fisicas;
    deuda += e.deuda;
    return { ...m, fis, deuda };
  });

  return (
    <>
      <PageHeader
        title={`Bolsas de ${dueno.razon_social}`}
        subtitle={<Link href="/custodia" className="hover:underline">← Bolsas en custodia</Link>}
        actions={<BotonImprimir />}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="A reponer"
          value={bolsas(saldo?.a_reponer_total ?? deuda)}
          hint="Vendidas o entregadas (cargadas o no) que todavía no le repusiste ni pagaste"
          tone={(saldo?.a_reponer_total ?? deuda) > 0 ? "pendiente" : "ok"}
        />
        <Stat label="Libres para vender" value={bolsas(saldo?.libres ?? 0)} hint="Bolsas suyas que todavía no vendiste" tone="ok" />
        <Stat
          label="Dónde están sus bolsas hoy"
          value={(fisicas ?? []).filter((f) => (f.bolsas ?? 0) > 0).length === 0 ? "—" : ""}
          hint={
            <span className="block space-y-0.5 text-sm text-texto">
              {(fisicas ?? [])
                .filter((f) => (f.bolsas ?? 0) > 0)
                .map((f) => {
                  const pend = pendientesDeCarga.filter((d) => d.lugarId === f.lugar_id);
                  return (
                    <span key={f.lugar_id ?? "sin"} className="block">
                      {f.lugar_id ? lugarNombre.get(f.lugar_id) : "Sin lugar"}: <strong className="tabular-nums">{bolsas(f.bolsas)}</strong>
                      {pend.length > 0 && <span className="text-texto-2"> · vendidas a {pend.map((d) => `${d.a} (${d.numero})`).join(", ")}, sin cargar</span>}
                    </span>
                  );
                })}
            </span>
          }
        />
      </div>

      <div className="mt-6">
        <Card title="A quién se vendieron o entregaron sus bolsas">
          <Table
            head={
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>A quién</th>
                <th className={th}>Operación</th>
                <th className={th}>Desde</th>
                <th className={th + " num"}>Bolsas</th>
                <th className={th + " num"}>Cargadas</th>
                <th className={th + " num"}>Falta cargar</th>
              </tr>
            }
            empty={destinos.length === 0 ? "Todavía no vendiste ni entregaste bolsas de este dueño." : undefined}
          >
            {destinos.map((d) => (
              <tr key={d.key} className="hover:bg-fondo">
                <td className={td}>{fecha(d.fecha)}</td>
                <td className={td + " font-medium"}>{d.a}</td>
                <td className={td}>
                  {d.operacionId ? <Link href={`/operaciones/${d.operacionId}`} className="text-marca hover:underline">{d.numero}</Link> : <span className="text-texto-2">Entrega sin operación</span>}
                </td>
                <td className={td + " text-texto-2"}>{d.lugarId ? lugarNombre.get(d.lugarId) ?? "—" : "—"}</td>
                <td className={td + " num"}>{bolsas(d.bolsas)}</td>
                <td className={td + " num text-ok"}>{bolsas(d.cargadas)}</td>
                <td className={td + " num " + (d.bolsas - d.cargadas > 0 ? "font-semibold text-[#9a7210]" : "text-texto-2")}>{bolsas(d.bolsas - d.cargadas)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card title="Movimientos" className="lg:col-span-3">
          <Table
            head={
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Movimiento</th>
                <th className={th}>Detalle</th>
                <th className={th + " num"}>Bolsas</th>
                <th className={th + " print:hidden"}></th>
              </tr>
            }
            empty={filas.length === 0 ? "Sin movimientos todavía." : undefined}
          >
            {filas.map((m) => {
              const desde = lugar(m.desde_ingenio_id, m.desde_deposito_id);
              const hacia = lugar(m.hacia_ingenio_id, m.hacia_deposito_id);
              const op = m.operacion as { id: string; numero: string; comprador: { razon_social: string } | null } | null;
              return (
                <tr key={m.id} className="align-top">
                  <td className={td}>{fecha(m.fecha)}</td>
                  <td className={td}>
                    <Badge tone={m.tipo === "entrega" ? "pendiente" : m.tipo === "reposicion" || m.tipo === "pago_plata" ? "ok" : m.tipo === "retiro" ? "neutral" : "proceso"}>
                      {TIPO_CUSTODIA[m.tipo]}
                    </Badge>
                  </td>
                  <td className={td + " text-xs text-texto-2"}>
                    {desde && <div>Desde: {desde}</div>}
                    {hacia && <div>Hacia: {hacia}</div>}
                    {op && (
                      <div>
                        Op. <Link href={`/operaciones/${op.id}`} className="text-marca hover:underline">{op.numero}</Link>
                        {op.comprador && ` → ${op.comprador.razon_social}`}
                      </div>
                    )}
                    {m.destinatario && <div>A: {(m.destinatario as { razon_social: string }).razon_social}</div>}
                    {m.importe && <div>Pagado: {$(m.importe)}</div>}
                    {[m.marca && (m.marca as { nombre: string }).nombre, m.remito && `Remito ${m.remito}`, m.chofer, m.patente].filter(Boolean).join(" · ")}
                    {m.observaciones && !op && <div>{m.observaciones}</div>}
                  </td>
                  <td className={td + " num font-medium"}>{bolsas(m.bolsas)}</td>
                  <td className={td + " print:hidden"}>
                    {!m.carga_id && (
                      <ActionForm action={borrarMovimiento.bind(null, m.id, id)} submit="Borrar" variant="danger" confirm="¿Borrar este movimiento?" className="space-y-1 text-xs" />
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Card title="Registrar movimiento" className="lg:col-span-2 print:hidden">
          <ActionForm action={registrarMovimiento} submit="Registrar">
            <CamposMovimiento hoy={hoy()} duenoId={id} terceros={c.terceros} compradores={c.compradores} marcas={c.marcas} ubicaciones={c.ubicaciones} />
          </ActionForm>
          <p className="mt-4 text-xs text-texto-2">
            Para vender con sus bolsas: creá la operación normal (Menudeo o Compra-venta) con <strong>{dueno.razon_social}</strong> como vendedor y marcá
            “Las bolsas son del vendedor, en custodia”. Cada carga se descuenta sola de acá.
          </p>
        </Card>
      </div>
    </>
  );
}
