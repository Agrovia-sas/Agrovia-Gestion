import Link from "next/link";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { InicioEnPanel } from "@/components/inicio-en-panel";
import { btn } from "@/components/ui";
import { getSesion } from "@/lib/supabase/server";
import { salir } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, perfil } = await getSesion();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <InicioEnPanel />
      <Sidebar />
      <div className="md:pl-64 print:pl-0">
        <header className="print:hidden sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-borde bg-white/95 px-4 py-3 pl-16 backdrop-blur md:pl-6">
          <form action="/buscar" className="min-w-40 flex-1">
            <input
              name="q"
              placeholder="Buscar operación, tercero, CUIT o remito…"
              className="w-full max-w-md rounded-lg border border-borde bg-fondo px-3 py-2 text-sm outline-none focus:border-marca-medio"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            <Link href="/operaciones/nueva" className={btn("primary")}>+ Operación</Link>
            <Link href="/cargas" className={btn("secondary")}>+ Carga</Link>
            <Link href="/tesoreria/caja" className={btn("secondary")}>+ Cobro/Pago</Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-texto-2 sm:inline">{perfil?.nombre ?? user.email}</span>
            <form action={salir}>
              <button className="text-texto-2 underline-offset-2 hover:underline">Salir</button>
            </form>
          </div>
        </header>
        {!perfil && (
          <div className="m-6 rounded-lg border border-pendiente/40 bg-pendiente/10 p-4 text-sm">
            Tu usuario todavía no tiene un rol asignado. Pedile al administrador que te habilite.
          </div>
        )}
        <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
