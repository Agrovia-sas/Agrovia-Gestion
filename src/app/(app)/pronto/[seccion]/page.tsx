import Link from "next/link";
import { Card, PageHeader, btn } from "@/components/ui";

const NOMBRES: Record<string, { titulo: string; cuando: string }> = {
  reposiciones: { titulo: "Reposiciones", cuando: "semana del 16/12" },
  rentabilidad: { titulo: "Rentabilidad", cuando: "enero 2027" },
  "cuentas-corrientes": { titulo: "Cuentas corrientes", cuando: "semana del 16/12" },
  galicia: { titulo: "Banco Galicia", cuando: "semana del 16/12" },
  caja: { titulo: "Caja y efectivo", cuando: "semana del 16/12" },
  echeqs: { titulo: "Gestión de eCheqs", cuando: "semana del 16/12" },
  calendario: { titulo: "Calendario de vencimientos", cuando: "enero 2027" },
};

export default async function Pronto({ params }: { params: Promise<{ seccion: string }> }) {
  const { seccion } = await params;
  const s = NOMBRES[seccion] ?? { titulo: "Sección", cuando: "próximas etapas" };
  return (
    <>
      <PageHeader title={s.titulo} />
      <Card>
        <p className="text-texto-2">
          Esta pantalla llega en la {s.cuando}, según el plan de etapas. Las reglas ya están en la base de datos;
          falta la pantalla.
        </p>
        <Link href="/" className={btn("secondary") + " mt-4"}>Volver al panel</Link>
      </Card>
    </>
  );
}
