import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, PageHeader, Table, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { bolsas, fecha, hoy } from "@/lib/format";
import { registrarMovimiento } from "./actions";
import { CamposMovimiento } from "./form";

export const dynamic = "force-dynamic";

export default async function Custodia() {
  const supabase = await createClient();
  const [{ data: saldos }, { data: fisicas }, c] = await Promise.all([
    supabase.from("v_custodia_saldos").select("*").order("dueno"),
    supabase.from("v_custodia_fisicas").select("*"),
    cargarCatalogos(supabase),
  ]);
  const lugarNombre = new Map(c.ubicaciones.map((u) => [u.value.split(":")[1], u.label]));
  const lista = (saldos ?? []).filter((s) => (s.fisicas ?? 0) !== 0 || (s.a_reponer ?? 0) !== 0);
  const totFisicas = lista.reduce((s, x) => s + (x.fisicas ?? 0), 0);
  const totDeuda = lista.reduce((s, x) => s + (x.a_reponer ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Bolsas en custodia"
        subtitle={`Bolsas de clientes que guardás y movés. Hoy: ${bolsas(totFisicas)} físicas en tu poder · ${bolsas(totDeuda)} a reponer.`}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Por dueño" className="lg:col-span-3">
          <Table
            head={
              <tr>
                <th className={th}>Dueño</th>
                <th className={th}>Dónde están</th>
                <th className={th + " num"}>Físicas</th>
                <th className={th + " num"}>A reponer</th>
                <th className={th + " num"}>Total del dueño</th>
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
                <td className={td + " num"}>{bolsas(s.fisicas)}</td>
                <td className={td + " num font-semibold " + ((s.a_reponer ?? 0) > 0 ? "text-[#9a7210]" : "")}>{bolsas(s.a_reponer)}</td>
                <td className={td + " num"}>{bolsas((s.fisicas ?? 0) + (s.a_reponer ?? 0))}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-xs text-texto-2">
            Total del dueño = las que tenés físicamente + las que usaste y le tenés que reponer. Es lo que le vas a tener que devolver cuando venda.
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
