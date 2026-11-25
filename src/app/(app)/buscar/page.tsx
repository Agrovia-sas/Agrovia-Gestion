import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { fecha } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Buscar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const t = q.replace(/[%,()*]/g, "").trim();
  const digitos = q.replace(/\D/g, "");
  const supabase = await createClient();

  if (!t) return <PageHeader title="Buscar" subtitle="Escribí un número de operación, un nombre, un CUIT o un remito." />;

  const [{ data: ops }, { data: terceros }, { data: cargas }] = await Promise.all([
    supabase.from("v_operaciones").select("id, numero, vendedor, comprador, fecha_cierre").or(`numero.ilike.%${t}%,vendedor.ilike.%${t}%,comprador.ilike.%${t}%`).limit(20),
    supabase
      .from("terceros")
      .select("id, razon_social, cuit")
      .or([`razon_social.ilike.%${t}%`, `nombre_comercial.ilike.%${t}%`, ...(digitos.length >= 3 ? [`cuit.ilike.%${digitos}%`] : [])].join(","))
      .limit(20),
    supabase.from("cargas").select("id, remito, fecha, operacion:operaciones(id, numero)").ilike("remito", `%${t}%`).limit(20),
  ]);

  const nada = !ops?.length && !terceros?.length && !cargas?.length;
  return (
    <>
      <PageHeader title={`Resultados para “${q}”`} />
      {nada && <p className="text-texto-2">No se encontró nada.</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        {!!ops?.length && (
          <Card title="Operaciones">
            <ul className="space-y-2 text-sm">
              {ops.map((o) => (
                <li key={o.id}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link> · {o.vendedor} → {o.comprador ?? "—"} <span className="text-texto-2">({fecha(o.fecha_cierre)})</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {!!terceros?.length && (
          <Card title="Terceros">
            <ul className="space-y-2 text-sm">
              {terceros.map((x) => (
                <li key={x.id}>
                  <Link href={`/terceros/${x.id}`} className="font-medium text-marca hover:underline">{x.razon_social}</Link> {x.cuit && <span className="text-texto-2">· {x.cuit}</span>}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {!!cargas?.length && (
          <Card title="Remitos">
            <ul className="space-y-2 text-sm">
              {cargas.map((cg) => (
                <li key={cg.id}>
                  Remito {cg.remito} · <Link href={`/operaciones/${cg.operacion?.id}`} className="text-marca hover:underline">{cg.operacion?.numero}</Link> <span className="text-texto-2">({fecha(cg.fecha)})</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
