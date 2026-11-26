import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, PageHeader, Table, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { bolsas, fecha, hoy } from "@/lib/format";
import { destinosCustodia } from "@/lib/custodia-destinos";
import { registrarMovimiento } from "./actions";
import { CamposMovimiento } from "./form";

export const dynamic = "force-dynamic";

export default async function Custodia() {
  const supabase = await createClient();
  const [{ data: saldos }, { data: fisicas }, c, destinos] = await Promise.all([
    supabase.from("v_custodia_saldos").select("*").order("dueno"),
    supabase.from("v_custodia_fisicas").select("*"),
    cargarCatalogos(supabase),
    destinosCustodia(supabase),
  ]);
  const lugarNombre = new Map(c.ubicaciones.map((u) => [u.value.split(":")[1], u.label]));
  const lista = (saldos ?? []).filter((s) => (s.fisicas ?? 0) !== 0 || (s.a_reponer_total ?? 0) !== 0);
  const totDeuda = lista.reduce((s, x) => s + (x.a_reponer_total ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Bolsas en custodia"
        subtitle={`Bolsas de clientes que guardás y movés. Hoy tenés ${bolsas(totDeuda)} bolsas a reponer.`}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Por dueño" className="lg:col-span-3">
          <Table
            head={
              <tr>
                <th className={th}>Dueño</th>
                <th className={th}>Dónde están</th>
                <th className={th}>Vendidas / entregadas a</th>
                <th className={th + " num"}>Libres</th>
                <th className={th + " num"}>A reponer</th>
              </tr>
            }
            empty={lista.length === 0 ? "Todavía no hay bolsas en custodia. Registrá el primer ingreso con el formulario." : undefined}
          >
            {lista.map((s) => (
              <tr key={s.dueno_id} className="align-top hover:bg-fondo">
                <td className={td}>
                  <Link href={`/custodia/${s.dueno_id}`} className="font-medium text-marca hover:underline">{s.dueno}</Link>
                  <div className="text-xs text-texto-2">Último movimiento {fecha(s.ultimo_movimiento)}</div>
                </td>
                <td className={td + " text-xs"}>
                  {(fisicas ?? [])
                    .filter((f) => f.dueno_id === s.dueno_id && (f.bolsas ?? 0) > 0)
                    .map((f) => (
                      <div key={f.lugar_id ?? "sin"}>
                        {f.lugar_id ? lugarNombre.get(f.lugar_id) ?? "—" : "Sin lugar"}: <span className="font-medium tabular-nums">{bolsas(f.bolsas)}</span>
                      </div>
                    ))}
                </td>
                <td className={td + " text-xs"}>
                  {destinos
                    .filter((d) => d.duenoId === s.dueno_id && (d.bolsas - d.cargadas > 0 || d.manual))
                    .map((d) => (
                      <div key={d.key} className="leading-5">
                        <span className="font-medium">{d.a}</span>
                        {d.operacionId ? (
                          <> · <Link href={`/operaciones/${d.operacionId}`} className="text-marca hover:underline">{d.numero}</Link></>
                        ) : (
                          " · entrega"
                        )}
                        {" · "}
                        <span className="tabular-nums">{bolsas(d.bolsas)}</span>
                        {!d.manual && (
                          <span className={d.cargadas === 0 ? "text-[#9a7210]" : "text-proceso"}>
                            {" "}({d.cargadas === 0 ? "sin cargar" : `cargó ${bolsas(d.cargadas)}, faltan ${bolsas(d.bolsas - d.cargadas)}`})
                          </span>
                        )}
                      </div>
                    ))}
                  {destinos.filter((d) => d.duenoId === s.dueno_id && (d.bolsas - d.cargadas > 0 || d.manual)).length === 0 && <span className="text-texto-2">—</span>}
                </td>
                <td className={td + " num"}>{bolsas(s.libres)}</td>
                <td className={td + " num font-semibold " + ((s.a_reponer_total ?? 0) > 0 ? "text-[#9a7210]" : "")}>{bolsas(s.a_reponer_total)}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-xs text-texto-2">
            Dónde están: dónde quedan bolsas del dueño hoy (incluye las vendidas que todavía no se cargaron). Vendidas / entregadas a: a quién y en qué operación.
            Libres: las que todavía podés vender. A reponer: las que ya vendiste o entregaste y todavía no le repusiste ni pagaste.
          </p>
        </Card>

        <Card title="Registrar movimiento" className="lg:col-span-2">
          <ActionForm action={registrarMovimiento} submit="Registrar">
            <CamposMovimiento hoy={hoy()} terceros={c.terceros} compradores={c.compradores} marcas={c.marcas} ubicaciones={c.ubicaciones} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
