import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { SelectTercero } from "@/components/select-tercero";
import { Card, Field, PageHeader, ProgressBar, Table, inputCls, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { bolsas, fecha, hoy, MODALIDADES } from "@/lib/format";
import { registrarCarga } from "../operaciones/actions";

export const dynamic = "force-dynamic";

export default async function Cargas() {
  const supabase = await createClient();
  const [{ data: abiertas }, { data: recientes }, { data: stock }, c] = await Promise.all([
    supabase
      .from("v_operaciones")
      .select("id, numero, modalidad, vendedor, comprador, bolsas_totales, bolsas_cargadas, bolsas_pendientes")
      .eq("estado_comercial", "cerrada")
      .gt("bolsas_pendientes", 0)
      .order("fecha_cierre"),
    supabase
      .from("cargas")
      .select("id, fecha, bolsas, remito, patente, chofer, operacion:operaciones(id, numero), ingenio:ingenios(nombre), deposito:depositos(nombre)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("v_stock").select("*"),
    cargarCatalogos(supabase),
  ]);

  const nombreUbic = new Map(c.ubicaciones.map((u) => [u.value.split(":")[1], u.label]));
  const marcas = new Map(c.marcas.map((m) => [m.id, m.nombre]));
  const stockConDatos = (stock ?? []).filter((s) => (s.stock ?? 0) !== 0);

  return (
    <>
      <PageHeader title="Stock y cargas" subtitle="Cada carga es un equipo (camión). El sistema no deja cargar más de lo pendiente." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Registrar carga" className="lg:col-span-2">
          {(abiertas ?? []).length === 0 ? (
            <p className="text-sm text-texto-2">No hay operaciones con bolsas pendientes.</p>
          ) : (
            <ActionForm action={registrarCarga} submit="Registrar carga">
              <Field label="Operación *">
                <select name="operacion_id" required defaultValue="" className={inputCls}>
                  <option value="" disabled>Elegí la operación</option>
                  {(abiertas ?? []).map((o) => (
                    <option key={o.id} value={o.id ?? ""}>
                      {o.numero} · {o.vendedor} → {o.comprador ?? "—"} · faltan {bolsas(o.bolsas_pendientes)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha"><input type="date" name="fecha" defaultValue={hoy()} className={inputCls} /></Field>
                <Field label="Bolsas *"><input name="bolsas" inputMode="numeric" required className={inputCls} /></Field>
                <Field label="Chofer (nombre y apellido)"><input name="chofer" className={inputCls} /></Field>
                <Field label="Patente"><input name="patente" className={inputCls} /></Field>
                <Field label="Remito"><input name="remito" className={inputCls} /></Field>
                <Field label="Orden de retiro"><input name="orden_retiro" className={inputCls} /></Field>
                <Field label="Transportista">
                  <SelectTercero name="transportista_id" principales={c.transportistas} todos={c.terceros} etiqueta="Transportistas" />
                </Field>
              </div>
              <p className="text-xs text-texto-2">Sale desde la ubicación de la operación. Para elegir otra, cargala desde la ficha de la operación.</p>
            </ActionForm>
          )}
        </Card>

        <Card title={`Operaciones con bolsas pendientes (${abiertas?.length ?? 0})`} className="lg:col-span-3">
          <Table
            head={
              <tr>
                <th className={th}>Op.</th>
                <th className={th}>Partes</th>
                <th className={th + " w-44"}>Avance</th>
                <th className={th + " num"}>Pendientes</th>
              </tr>
            }
          >
            {(abiertas ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]}</div>
                </td>
                <td className={td}>{o.vendedor}<div className="text-xs text-texto-2">→ {o.comprador ?? "—"}</div></td>
                <td className={td}>
                  <ProgressBar value={o.bolsas_cargadas ?? 0} max={o.bolsas_totales ?? 0} />
                  <div className="mt-1 text-xs tabular-nums text-texto-2">{bolsas(o.bolsas_cargadas)} / {bolsas(o.bolsas_totales)}</div>
                </td>
                <td className={td + " num font-medium"}>{bolsas(o.bolsas_pendientes)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Stock propio (Menudeo y Compra-venta)">
          <Table
            head={
              <tr>
                <th className={th}>Ubicación</th>
                <th className={th}>Marca</th>
                <th className={th + " num"}>Stock</th>
                <th className={th + " num"}>Disponible para vender</th>
              </tr>
            }
            empty={stockConDatos.length === 0 ? "Sin stock propio. En Facturado no hay stock de AGROVIA." : undefined}
          >
            {stockConDatos.map((s, i) => (
              <tr key={i}>
                <td className={td}>{nombreUbic.get((s.ingenio_id ?? s.deposito_id) as string) ?? "Sin ubicación"}</td>
                <td className={td}>{(s.marca_id && marcas.get(s.marca_id)) || "—"}</td>
                <td className={td + " num"}>{bolsas(s.stock)}</td>
                <td className={td + " num font-medium"}>{bolsas(s.disponible_para_vender)}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Últimas cargas">
          <Table
            head={
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Op.</th>
                <th className={th + " num"}>Bolsas</th>
                <th className={th}>Remito / Camión / Chofer</th>
              </tr>
            }
            empty={!recientes?.length ? "Todavía no hay cargas." : undefined}
          >
            {(recientes ?? []).map((cg) => (
              <tr key={cg.id}>
                <td className={td}>{fecha(cg.fecha)}</td>
                <td className={td}>
                  <Link href={`/operaciones/${cg.operacion?.id}`} className="text-marca hover:underline">{cg.operacion?.numero}</Link>
                </td>
                <td className={td + " num"}>{bolsas(cg.bolsas)}</td>
                <td className={td + " text-texto-2"}>{[cg.remito, cg.patente, cg.chofer].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
