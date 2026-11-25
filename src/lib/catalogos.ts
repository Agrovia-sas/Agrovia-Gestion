import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Listas para los formularios: terceros con sus roles, marcas y ubicaciones. */
export async function cargarCatalogos(supabase: Supa) {
  const [{ data: terceros }, { data: roles }, { data: marcas }, { data: ingenios }, { data: depositos }, { data: productos }] =
    await Promise.all([
      supabase.from("terceros").select("id, razon_social").eq("activo", true).order("razon_social"),
      supabase.from("tercero_roles").select("tercero_id, rol"),
      supabase.from("marcas").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("ingenios").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("depositos").select("id, nombre, terceros(razon_social)").eq("activo", true).order("nombre"),
      supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
    ]);
  const rolesDe = new Map<string, Set<string>>();
  (roles ?? []).forEach((r) => {
    if (!rolesDe.has(r.tercero_id)) rolesDe.set(r.tercero_id, new Set());
    rolesDe.get(r.tercero_id)!.add(r.rol);
  });
  const conRol = (...rs: string[]) => (terceros ?? []).filter((t) => rs.some((r) => rolesDe.get(t.id)?.has(r)));
  return {
    terceros: terceros ?? [],
    productores: conRol("productor", "proveedor"),
    compradores: conRol("comprador"),
    transportistas: conRol("transportista"),
    comisionistas: conRol("comisionista"),
    marcas: marcas ?? [],
    productos: productos ?? [],
    ubicaciones: [
      ...(ingenios ?? []).map((i) => ({ value: `ingenio:${i.id}`, label: `Ingenio ${i.nombre}` })),
      ...(depositos ?? []).map((d) => ({
        value: `deposito:${d.id}`,
        label: `Depósito ${d.nombre}${d.terceros ? ` (${(d.terceros as { razon_social: string }).razon_social})` : ""}`,
      })),
    ],
  };
}

