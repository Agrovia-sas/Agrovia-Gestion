import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Badge, Card, cx, inputCls, PageHeader, Stat, Table, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { $, fecha, hoy } from "@/lib/format";
import { revertir } from "../actions";
import { Formularios } from "../formularios";

export const dynamic = "force-dynamic";

const CUENTAS: Record<string, { nombre: string; titulo: string; esCaja: boolean }> = {
  caja: { nombre: "Caja efectivo", titulo: "Caja y efectivo", esCaja: true },
  galicia: { nombre: "Banco Galicia", titulo: "Banco Galicia", esCaja: false },
};
const NOMBRE_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MEDIO: Record<string, string> = {
  efectivo: "Efectivo", transferencia: "Transferencia", echeq: "eCheq", cheque: "Cheque", debito_automatico: "Débito", tarjeta: "Tarjeta", otro: "Otro",
};

function mesSiguiente(m: string, delta: number) {
  const [a, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(a, mm - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function Tesoreria({ params, searchParams }: { params: Promise<{ cuenta: string }>; searchParams: Promise<{ mes?: string; accion?: string }> }) {
  const { cuenta: slug } = await params;
  const { mes: mesParam, accion } = await searchParams;
  const def = CUENTAS[slug];
  if (!def) notFound();
  const supabase = await createClient();

  const { data: cuentas } = await supabase.from("cuentas_tesoreria").select("id, nombre, saldo_inicial, fecha_saldo_inicial").eq("activa", true).order("nombre");
  const cuenta = (cuentas ?? []).find((c) => c.nombre === def.nombre);
  if (!cuenta) {
    return (
      <>
        <PageHeader title={def.titulo} />
        <Card><p className="text-sm text-texto-2">No tenés acceso a esta cuenta o no existe. Las cuentas de tesorería las ven los usuarios con rol administrador o finanzas.</p></Card>
      </>
    );
  }

  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : hoy().slice(0, 7);
  const desde = `${mes}-01`;
  const hasta = `${mesSiguiente(mes, 1)}-01`;

  const [{ data: saldo }, { data: anteriores }, { data: movs }, { data: terceros }, { data: categorias }, { data: arqueos }] = await Promise.all([
    supabase.from("v_saldos_cuentas").select("saldo").eq("cuenta_id", cuenta.id).maybeSingle(),
    supabase.from("movimientos").select("importe").eq("cuenta_id", cuenta.id).in("estado", ["confirmado", "revertido"]).lt("fecha", desde),
    supabase
      .from("movimientos")
      .select("id, fecha, importe, medio, concepto, estado, revierte_a, motivo_reversion, par_transferencia, cheque_id, created_at, tercero:terceros(id, razon_social)")
      .eq("cuenta_id", cuenta.id)
      .in("estado", ["confirmado", "revertido"])
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha")
      .order("created_at"),
    supabase.from("terceros").select("id, razon_social").eq("activo", true).order("razon_social"),
    supabase.from("categorias_gasto").select("id, nombre").eq("activo", true).order("nombre"),
    def.esCaja ? supabase.from("arqueos").select("fecha, contado, diferencia").eq("cuenta_id", cuenta.id).order("created_at", { ascending: false }).limit(1) : Promise.resolve({ data: [] }),
  ]);

  const saldoActual = Number(saldo?.saldo ?? 0);
  const saldoInicioMes = Number(cuenta.saldo_inicial) + (anteriores ?? []).reduce((s, m) => s + Number(m.importe), 0);
  let corrido = saldoInicioMes;
  const filas = (movs ?? []).map((m) => {
    corrido += Number(m.importe);
    return { ...m, saldo: corrido };
  });
  const ingresos = filas.filter((m) => Number(m.importe) > 0 && m.estado === "confirmado" && !m.revierte_a).reduce((s, m) => s + Number(m.importe), 0);
  const egresos = filas.filter((m) => Number(m.importe) < 0 && m.estado === "confirmado" && !m.revierte_a).reduce((s, m) => s - Number(m.importe), 0);
  const [a, mm] = mes.split("-");
  const ultimoArqueo = (arqueos ?? [])[0] as { fecha: string; contado: number; diferencia: number } | undefined;

  return (
    <>
      <PageHeader
        title={def.titulo}
        subtitle={cuenta.fecha_saldo_inicial ? `Saldo inicial ${$(cuenta.saldo_inicial)} al ${fecha(cuenta.fecha_saldo_inicial)}` : "Todavía no cargaste el saldo inicial (pestaña «Saldo inicial»)."}
        actions={<BotonImprimir />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Saldo actual" value={$(saldoActual)} tone="ok" />
        <Stat label={`Ingresos de ${NOMBRE_MES[Number(mm) - 1].toLowerCase()}`} value={$(ingresos)} tone="proceso" />
        <Stat label={`Egresos de ${NOMBRE_MES[Number(mm) - 1].toLowerCase()}`} value={$(egresos)} tone="pendiente" />
        {def.esCaja ? (
          <Stat
            label="Último arqueo"
            value={ultimoArqueo ? fecha(ultimoArqueo.fecha) : "—"}
            hint={ultimoArqueo ? (Math.abs(Number(ultimoArqueo.diferencia)) < 0.01 ? "Coincidió" : `Diferencia ${$(ultimoArqueo.diferencia)}`) : "Nunca se hizo"}
          />
        ) : (
          <Stat label="Conciliación" value="Próximamente" hint="Importación de extractos de Galicia" />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card
          title={`Movimientos de ${NOMBRE_MES[Number(mm) - 1]} ${a}`}
          className="xl:col-span-3"
          actions={
            <div className="flex gap-1 text-sm print:hidden">
              <Link href={`?mes=${mesSiguiente(mes, -1)}`} className="rounded-lg border border-borde px-2 py-1 hover:bg-fondo">← Anterior</Link>
              {mes !== hoy().slice(0, 7) && <Link href="?" className="rounded-lg border border-borde px-2 py-1 hover:bg-fondo">Hoy</Link>}
              <Link href={`?mes=${mesSiguiente(mes, 1)}`} className="rounded-lg border border-borde px-2 py-1 hover:bg-fondo">Siguiente →</Link>
            </div>
          }
        >
          <Table
            head={
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Concepto</th>
                <th className={th + " num"}>Ingreso</th>
                <th className={th + " num"}>Egreso</th>
                <th className={th + " num"}>Saldo</th>
                <th className={th + " print:hidden"}></th>
              </tr>
            }
          >
            <tr className="bg-fondo text-texto-2">
              <td className={td} colSpan={4}>Saldo al inicio del mes</td>
              <td className={td + " num font-medium"}>{$(saldoInicioMes)}</td>
              <td className={td + " print:hidden"}></td>
            </tr>
            {filas.map((m) => {
              const imp = Number(m.importe);
              const revertido = m.estado === "revertido";
              const tercero = m.tercero as { id: string; razon_social: string } | null;
              return (
                <tr key={m.id} className={cx("align-top", (revertido || m.revierte_a) && "text-texto-2")}>
                  <td className={td}>{fecha(m.fecha)}</td>
                  <td className={td}>
                    <div className={cx(revertido && "line-through")}>{m.concepto}</div>
                    <div className="text-xs text-texto-2">
                      {[tercero?.razon_social, MEDIO[m.medio] ?? m.medio].filter(Boolean).join(" · ")}
                      {m.par_transferencia && " · Transferencia entre cuentas"}
                    </div>
                    {revertido && <Badge>Revertido</Badge>}
                    {m.revierte_a && <div className="text-xs">Motivo: {m.motivo_reversion}</div>}
                  </td>
                  <td className={td + " num text-ok"}>{imp > 0 ? $(imp) : ""}</td>
                  <td className={td + " num text-vencido"}>{imp < 0 ? $(-imp) : ""}</td>
                  <td className={td + " num font-medium"}>{$(m.saldo)}</td>
                  <td className={td + " print:hidden"}>
                    {m.estado === "confirmado" && !m.revierte_a && !m.cheque_id && (
                      <details>
                        <summary className="cursor-pointer text-xs text-texto-2 hover:text-vencido">Revertir</summary>
                        <ActionForm action={revertir.bind(null, m.id)} submit="Revertir" variant="danger" className="mt-2 w-56 space-y-2 text-xs">
                          <input name="motivo" required placeholder="Motivo (obligatorio)" className={inputCls} />
                        </ActionForm>
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td className={td + " text-center text-texto-2"} colSpan={6}>Sin movimientos este mes.</td>
              </tr>
            )}
          </Table>
          <p className="mt-3 text-xs text-texto-2">
            Los movimientos no se borran ni se editan: si algo está mal, se revierte con un motivo (queda el original tachado y su contramovimiento) y se carga de nuevo.
          </p>
        </Card>

        <Card title="Registrar" className="xl:col-span-2 print:hidden">
          <Formularios
            key={`${saldoActual}-${filas.length}`}
            cuentaId={cuenta.id}
            esCaja={def.esCaja}
            hoy={hoy()}
            terceros={terceros ?? []}
            categorias={categorias ?? []}
            otrasCuentas={(cuentas ?? []).filter((c) => c.id !== cuenta.id).map((c) => ({ id: c.id, nombre: c.nombre }))}
            saldoActual={saldoActual}
            inicial={accion === "pago" ? "pago" : accion === "gasto" ? "gasto" : !cuenta.fecha_saldo_inicial ? "inicial" : "cobro"}
          />
        </Card>
      </div>
    </>
  );
}
