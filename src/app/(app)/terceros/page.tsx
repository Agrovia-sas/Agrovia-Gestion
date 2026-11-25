import Link from "next/link";
import { Badge, ButtonLink, Card, PageHeader, Table, td, th, inputCls, btn } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ROLES_TERCERO } from "@/lib/format";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";
type Rol = Database["public"]["Enums"]["tipo_rol_tercero"];

export default async function Terceros({ searchParams }: { searchParams: Promise<{ rol?: string; q?: string }> }) {
  const { rol, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("terceros")
    .select("id, razon_social, nombre_comercial, cuit, provincia, contacto, telefono, activo, tercero_roles!inner(rol)")
    .order("razon_social");
  if (rol === "productor") query = query.in("tercero_roles.rol", ["productor", "proveedor"]);
  else if (rol && rol in ROLES_TERCERO) query = query.eq("tercero_roles.rol", rol as Rol);
  if (q) {
    const texto = q.replace(/[%,()*]/g, "").trim();
    const digitos = q.replace(/\D/g, "");
    const filtros = [`razon_social.ilike.%${texto}%`, `nombre_comercial.ilike.%${texto}%`];
    if (digitos.length >= 3) filtros.push(`cuit.ilike.%${digitos}%`);
    query = query.or(filtros.join(","));
  }

  const { data } = await query;
  // El filtro !inner trae solo el rol filtrado: pedimos todos los roles aparte
  const ids = (data ?? []).map((t) => t.id);
  const { data: todosRoles } = ids.length
    ? await supabase.from("tercero_roles").select("tercero_id, rol").in("tercero_id", ids)
    : { data: [] };
  const rolesDe = new Map<string, string[]>();
  (todosRoles ?? []).forEach((r) => rolesDe.set(r.tercero_id, [...(rolesDe.get(r.tercero_id) ?? []), r.rol]));

  const titulo = rol === "comprador" ? "Clientes" : rol === "productor" ? "Productores y proveedores" : "Terceros";

  return (
    <>
      <PageHeader
        title={titulo}
        subtitle={`${data?.length ?? 0} registros`}
        actions={<ButtonLink href={`/terceros/nuevo${rol ? `?rol=${rol}` : ""}`}>+ Nuevo</ButtonLink>}
      />
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          {rol && <input type="hidden" name="rol" value={rol} />}
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o CUIT" className={inputCls + " max-w-sm"} />
          <button className={btn("secondary")}>Buscar</button>
          <div className="ml-auto flex flex-wrap gap-1 text-sm">
            {[["", "Todos"], ["comprador", "Clientes"], ["productor", "Productores"], ["transportista", "Transportistas"], ["comisionista", "Comisionistas"]].map(([v, l]) => (
              <Link key={v} href={v ? `/terceros?rol=${v}` : "/terceros"} className={"rounded-lg px-3 py-1.5 " + ((rol ?? "") === v ? "bg-marca text-white" : "hover:bg-fondo")}>
                {l}
              </Link>
            ))}
          </div>
        </form>
        <Table
          head={
            <tr>
              <th className={th}>Razón social</th>
              <th className={th}>CUIT</th>
              <th className={th}>Roles</th>
              <th className={th}>Contacto</th>
            </tr>
          }
          empty={!data?.length ? "Todavía no hay terceros cargados." : undefined}
        >
          {(data ?? []).map((t) => (
            <tr key={t.id} className="hover:bg-fondo">
              <td className={td}>
                <Link href={`/terceros/${t.id}`} className="font-medium text-marca hover:underline">{t.razon_social}</Link>
                {t.nombre_comercial && <div className="text-xs text-texto-2">{t.nombre_comercial}</div>}
              </td>
              <td className={td + " tabular-nums"}>{t.cuit ? `${t.cuit.slice(0, 2)}-${t.cuit.slice(2, 10)}-${t.cuit.slice(10)}` : "—"}</td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {(rolesDe.get(t.id) ?? []).map((r) => (
                    <Badge key={r}>{ROLES_TERCERO[r as Rol]}</Badge>
                  ))}
                </div>
              </td>
              <td className={td + " text-texto-2"}>{[t.contacto, t.telefono].filter(Boolean).join(" · ") || "—"}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
