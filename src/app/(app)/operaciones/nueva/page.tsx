import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { cargarCatalogos } from "@/lib/catalogos";
import { hoy } from "@/lib/format";
import { crearOperacion } from "../actions";
import { CamposOperacion } from "./form";

export const dynamic = "force-dynamic";

export default async function NuevaOperacion({ searchParams }: { searchParams: Promise<{ modalidad?: string }> }) {
  const { modalidad } = await searchParams;
  const inicial = modalidad === "menudeo" || modalidad === "compraventa" ? modalidad : "facturado";
  const supabase = await createClient();
  const c = await cargarCatalogos(supabase);
  return (
    <>
      <PageHeader
        title="Nueva operación"
        subtitle={
          <>
            El número (1-xx, 2-xx o A-x) se asigna solo. ¿Falta un tercero?{" "}
            <Link href="/terceros/nuevo?volver=/operaciones/nueva" className="text-marca underline">Crealo acá</Link>. ¿Falta una marca o ingenio?{" "}
            <Link href="/configuracion" className="text-marca underline">Configuración</Link>.
          </>
        }
      />
      <Card className="max-w-5xl">
        <ActionForm action={crearOperacion} submit="Cerrar operación" resetOnSuccess={false}>
          <CamposOperacion hoy={hoy()} c={c} modalidadInicial={inicial} />
        </ActionForm>
      </Card>
    </>
  );
}
