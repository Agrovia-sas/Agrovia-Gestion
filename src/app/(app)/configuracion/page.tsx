import { ActionForm } from "@/components/action-form";
import { SelectTercero } from "@/components/select-tercero";
import { Badge, Card, PageHeader, inputCls } from "@/components/ui";
import { createClient, getSesion } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { agregarItem, cambiarActivo } from "./actions";

export const dynamic = "force-dynamic";

type Item = { id: string; nombre: string; activo: boolean; extra?: string };

function Lista({ tabla, titulo, items, ayuda, children }: { tabla: "marcas" | "ingenios" | "depositos" | "productos" | "categorias_gasto"; titulo: string; items: Item[]; ayuda?: string; children?: React.ReactNode }) {
  return (
    <Card title={titulo}>
      {ayuda && <p className="mb-3 text-sm text-texto-2">{ayuda}</p>}
      <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
        {items.length === 0 && <li className="text-sm text-texto-2">Vacío.</li>}
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-fondo">
            <span className={i.activo ? "" : "text-texto-2 line-through"}>
              {i.nombre}
              {i.extra && <span className="text-texto-2"> · {i.extra}</span>}
            </span>
            <ActionForm action={cambiarActivo.bind(null, tabla, i.id, !i.activo)} submit={i.activo ? "Desactivar" : "Reactivar"} variant="secondary" className="space-y-1 text-xs" />
          </li>
        ))}
      </ul>
      <ActionForm action={agregarItem.bind(null, tabla)} submit="Agregar" className="space-y-2">
        <input name="nombre" required placeholder="Nombre" className={inputCls} />
        {children}
      </ActionForm>
    </Card>
  );
}

export default async function Configuracion() {
  const supabase = await createClient();
  const { perfil } = await getSesion();
  const [{ data: marcas }, { data: ingenios }, { data: depositos }, { data: productos }, { data: categorias }, { data: perfiles }, c] = await Promise.all([
    supabase.from("marcas").select("id, nombre, activo").order("nombre"),
    supabase.from("ingenios").select("id, nombre, activo").order("nombre"),
    supabase.from("depositos").select("id, nombre, activo, terceros(razon_social)").order("nombre"),
    supabase.from("productos").select("id, nombre, activo").order("nombre"),
    supabase.from("categorias_gasto").select("id, nombre, activo").order("nombre"),
    supabase.from("perfiles").select("id, nombre, email, rol, activo").order("nombre"),
    cargarCatalogos(supabase),
  ]);

  return (
    <>
      <PageHeader title="Configuración" subtitle="Listas fijas para que los nombres no se escriban distinto cada vez (“Santa rosa”, “Santa Rosa”…)." />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Lista tabla="marcas" titulo="Marcas" ayuda="Ingenio de origen del azúcar: Florida, Leach, Santa Rosa…" items={marcas ?? []} />
        <Lista tabla="ingenios" titulo="Ingenios (lugar de carga)" items={ingenios ?? []} />
        <Lista
          tabla="depositos"
          titulo="Depósitos de cañeros"
          items={(depositos ?? []).map((d) => ({ ...d, extra: (d.terceros as { razon_social: string } | null)?.razon_social }))}
        >
          <SelectTercero name="canero_id" principales={c.productores} todos={c.terceros} etiqueta="Productores" vacio="Cañero dueño (opcional)" />
        </Lista>
        <Lista tabla="productos" titulo="Productos" items={productos ?? []} />
        {perfil?.rol === "admin" && <Lista tabla="categorias_gasto" titulo="Categorías de gasto" items={categorias ?? []} />}
        <Card title="Usuarios">
          <ul className="space-y-2 text-sm">
            {(perfiles ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>{p.nombre} <span className="text-texto-2">· {p.email}</span></span>
                <Badge tone={p.activo ? "ok" : "neutral"}>{p.rol}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-texto-2">Para sumar usuarios: se invitan desde Supabase y se les asigna un rol (admin, operador, finanzas o lectura).</p>
        </Card>
      </div>
    </>
  );
}
