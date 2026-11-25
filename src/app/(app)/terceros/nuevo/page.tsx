import { ActionForm } from "@/components/action-form";
import { Card, PageHeader } from "@/components/ui";
import { CamposTercero } from "../form";
import { crearTercero } from "../actions";

export default async function NuevoTercero({ searchParams }: { searchParams: Promise<{ rol?: string; volver?: string }> }) {
  const { rol, volver } = await searchParams;
  return (
    <>
      <PageHeader title="Nuevo tercero" subtitle="Cliente, productor, proveedor, transportista o comisionista. Un mismo tercero puede tener varios roles." />
      <Card className="max-w-3xl">
        <ActionForm action={crearTercero} submit="Crear tercero" resetOnSuccess={false}>
          {volver && <input type="hidden" name="volver" value={volver} />}
          <CamposTercero roles={rol ? [rol] : []} />
        </ActionForm>
      </Card>
    </>
  );
}
