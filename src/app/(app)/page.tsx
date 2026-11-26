import Link from "next/link";
import { ButtonLink, Card, EstadoCarga, PageHeader, Stat, Table, cx, td, th } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CAMPOS_PENDIENTES, ESTADOS_PENDIENTES, diasDesde, pendienteAgrovia } from "@/lib/comisiones";
import { $, bolsas, fecha, hoy, primerDiaDelMes, MODALIDADES } from "@/lib/format";

export const dynamic = "force-dynamic";

const NOMBRE_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function Panel() {
  const supabase = await createClient();
  const mes = primerDiaDelMes();

  const anio = hoy().slice(0, 4);
  const [{ data: pendientesRaw }, { data: abiertasRaw }, { data: delAnio }, { data: vencidas }] = await Promise.all([
    // Todas las comisiones que se deben, de cualquier mes
    supabase
      .from("v_operaciones")
      .select(CAMPOS_PENDIENTES)
      .eq("estado_comercial", "cerrada")
      .in("estado_comision", [...ESTADOS_PENDIENTES])
      .order("fecha_cierre", { ascending: true })
      .limit(2000),
    supabase
      .from("v_operaciones")
      .select("id, numero, modalidad, fecha_cierre, vendedor, comprador, bolsas_totales, bolsas_cargadas, bolsas_pendientes")
      .eq("estado_comercial", "cerrada")
      .gt("bolsas_pendientes", 0)
      .order("fecha_cierre", { ascending: true }),
    // Operaciones cerradas en el año, para ganancias
    supabase
      .from("v_operaciones")
      .select("fecha_cierre, modalidad, bolsas_totales, comision_bruta, comision_neta_agrovia, importe_cobrado, estado_comision, fecha_cobro")
      .eq("estado_comercial", "cerrada")
      .gte("fecha_cierre", `${anio}-01-01`)
      .lte("fecha_cierre", `${anio}-12-31`)
      .limit(5000),
    supabase
      .from("v_obligaciones")
      .select("id, concepto, pendiente, vencimiento, dias_atraso, operacion_id")
      .eq("tipo", "comision")
      .gt("dias_atraso", 0)
      .order("vencimiento"),
  ]);

  const pendientes = (pendientesRaw ?? [])
    .map((o) => ({ ...o, pendiente: pendienteAgrovia(o), dias: diasDesde(o.fecha_cierre) }))
    .filter((o) => o.pendiente > 0);
  const totalPorCobrar = pendientes.reduce((s, o) => s + o.pendiente, 0);
  const exigibles = pendientes.filter((o) => o.estado_comision === "pendiente_cobro");
  const totalExigible = exigibles.reduce((s, o) => s + o.pendiente, 0);
  const viejas = pendientes.filter((o) => o.dias > 30).length;
  const abiertas = abiertasRaw ?? [];
  const bolsasPend = abiertas.reduce((s, o) => s + (o.bolsas_pendientes ?? 0), 0);
  // Ganancias del año (parte de AGROVIA, sin IVA). Cobrado = proporción cobrada de cada comisión.
  const opsAnio = delAnio ?? [];
  const cobradoDe = (o: (typeof opsAnio)[number]) => {
    const bruta = Number(o.comision_bruta) || 0;
    const neta = Number(o.comision_neta_agrovia) || 0;
    return bruta > 0 ? (Math.min(Number(o.importe_cobrado) || 0, bruta) * neta) / bruta : 0;
  };
  const gananciaAnio = opsAnio.reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);
  const cobradoAnio = opsAnio.reduce((s, o) => s + cobradoDe(o), 0);
  const cobradoMes = opsAnio
    .filter((o) => o.estado_comision === "cobrada" && (o.fecha_cobro ?? "") >= mes)
    .reduce((s, o) => s + Number(o.comision_neta_agrovia ?? 0), 0);
  const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, ops: 0, bolsas: 0, ganancia: 0, cobrado: 0 }));
  opsAnio.forEach((o) => {
    const m = porMes[Number(o.fecha_cierre!.slice(5, 7)) - 1];
    m.ops += 1;
    m.bolsas += o.bolsas_totales ?? 0;
    m.ganancia += Number(o.comision_neta_agrovia ?? 0);
    m.cobrado += cobradoDe(o);
  });
  const mesesConDatos = porMes.filter((m) => m.ops > 0);
  const totalBolsasAnio = opsAnio.reduce((s, o) => s + (o.bolsas_totales ?? 0), 0);

  return (
    <>
      <PageHeader title="Panel general" subtitle="Lo comercial al día. Los números de Galicia y Caja se suman en la etapa de finanzas." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={`Ganancia ${anio}`}
          value={$(gananciaAnio)}
          hint={`Cobrado ${$(cobradoAnio)} · ${opsAnio.length} operaciones`}
          tone="ok"
          href="#ganancias"
        />
        <Stat
          label="Comisiones por cobrar (todas)"
          value={$(totalPorCobrar)}
          hint={`${pendientes.length} operaciones, de cualquier mes${viejas ? ` · ${viejas} con más de 30 días` : ""}`}
          tone="vencido"
          href="/comisiones/pendientes"
        />
        <Stat
          label="Ya exigibles (carga completa)"
          value={$(totalExigible)}
          hint={`${exigibles.length} operaciones para reclamar`}
          tone="pendiente"
          href="/comisiones/pendientes?estado=pendiente_cobro"
        />
        <Stat label="Cobrado este mes" value={$(cobradoMes)} hint="Comisiones y utilidades cobradas" tone="proceso" href="/comisiones" />
        <Stat label="Bolsas pendientes de carga" value={bolsas(bolsasPend)} hint={`${abiertas.length} operaciones abiertas`} href="/cargas" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Comisiones pendientes de cobro"
          className="lg:col-span-2"
          actions={<ButtonLink href="/comisiones/pendientes" variant="secondary">Ver lista completa</ButtonLink>}
        >
          <Table
            head={
              <tr>
                <th className={th}>Op.</th>
                <th className={th}>Productor → Comprador</th>
                <th className={th + " num"}>Días</th>
                <th className={th}>Carga</th>
                <th className={th + " num"}>Falta cobrar</th>
              </tr>
            }
            empty={pendientes.length === 0 ? "No hay comisiones pendientes. 🎉" : undefined}
          >
            {pendientes.slice(0, 12).map((o) => (
              <tr key={o.id} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                  <div className="text-xs text-texto-2">{MODALIDADES[o.modalidad!]} · {fecha(o.fecha_cierre)}</div>
                </td>
                <td className={td}>
                  <div className="font-medium">{o.vendedor}</div>
                  <div className="text-xs text-texto-2">→ {o.comprador ?? "sin comprador"}</div>
                </td>
                <td className={cx(td, "num", o.dias > 60 ? "font-semibold text-vencido" : o.dias > 30 ? "text-[#9a7210]" : "")}>{o.dias}</td>
                <td className={td}>
                  <EstadoCarga cargadas={o.bolsas_cargadas} totales={o.bolsas_totales} />
                </td>
                <td className={td + " num font-semibold"}>{$(o.pendiente)}</td>
              </tr>
            ))}
          </Table>
          {pendientes.length > 12 && (
            <p className="mt-3 text-sm text-texto-2">
              Y {pendientes.length - 12} más. <Link href="/comisiones/pendientes" className="text-marca underline">Ver todas</Link>
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Alertas">
            {(vencidas ?? []).length === 0 && viejas === 0 ? (
              <p className="text-sm text-texto-2">Sin alertas. 👌</p>
            ) : (
              <ul className="space-y-3">
                {viejas > 0 && (
                  <li className="rounded-lg border border-pendiente/40 bg-pendiente/10 p-3 text-sm">
                    <Link href="/comisiones/pendientes" className="font-medium hover:underline">
                      {viejas} comisiones llevan más de 30 días sin cobrarse
                    </Link>
                  </li>
                )}
                {(vencidas ?? []).map((v) => (
                  <li key={v.id} className="rounded-lg border border-vencido/30 bg-vencido/5 p-3 text-sm">
                    <Link href={`/operaciones/${v.operacion_id}`} className="font-medium text-vencido hover:underline">{v.concepto}</Link>
                    <div className="text-texto-2">{$(v.pendiente)} · vencida hace {v.dias_atraso} días ({fecha(v.vencimiento)})</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Carga pendiente" actions={<ButtonLink href="/cargas" variant="secondary">Ver</ButtonLink>}>
            {abiertas.length === 0 ? (
              <p className="text-sm text-texto-2">No hay operaciones con bolsas pendientes.</p>
            ) : (
              <ul className="space-y-3">
                {abiertas.slice(0, 6).map((o) => (
                  <li key={o.id} className="text-sm">
                    <div className="flex justify-between">
                      <Link href={`/operaciones/${o.id}`} className="font-medium text-marca hover:underline">{o.numero}</Link>
                      <span className="text-xs text-texto-2">{fecha(o.fecha_cierre)}</span>
                    </div>
                    <div className="truncate text-sm">Productor: <span className="font-medium">{o.vendedor}</span></div>
                    <div className="truncate text-xs text-texto-2">Comprador: {o.comprador ?? "—"}</div>
                    <div className="mt-1"><EstadoCarga cargadas={o.bolsas_cargadas} totales={o.bolsas_totales} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div id="ganancias" className="mt-6">
        <Card title={`Ganancias ${anio} mes por mes`}>
          <Table
            head={
              <tr>
                <th className={th}>Mes</th>
                <th className={th + " num"}>Operaciones</th>
                <th className={th + " num"}>Bolsas</th>
                <th className={th + " num"}>Ganancia</th>
                <th className={th + " num"}>Cobrado</th>
                <th className={th + " num"}>Por cobrar</th>
              </tr>
            }
            empty={mesesConDatos.length === 0 ? "Todavía no hay operaciones este año." : undefined}
          >
            {mesesConDatos.map((m) => (
              <tr key={m.mes} className="hover:bg-fondo">
                <td className={td}>
                  <Link href={`/operaciones?desde=${anio}-${String(m.mes).padStart(2, "0")}-01&hasta=${anio}-${String(m.mes).padStart(2, "0")}-${new Date(Number(anio), m.mes, 0).getDate()}`} className="hover:underline">
                    {NOMBRE_MES[m.mes - 1]}
                  </Link>
                </td>
                <td className={td + " num"}>{m.ops}</td>
                <td className={td + " num"}>{bolsas(m.bolsas)}</td>
                <td className={td + " num font-semibold"}>{$(m.ganancia)}</td>
                <td className={td + " num text-ok"}>{$(m.cobrado)}</td>
                <td className={cx(td, "num", m.ganancia - m.cobrado > 0.5 ? "text-[#9a7210]" : "text-texto-2")}>{$(Math.max(0, m.ganancia - m.cobrado))}</td>
              </tr>
            ))}
            {mesesConDatos.length > 0 && (
              <tr className="border-t-2 border-texto/20 font-semibold">
                <td className={td}>Total {anio}</td>
                <td className={td + " num"}>{opsAnio.length}</td>
                <td className={td + " num"}>{bolsas(totalBolsasAnio)}</td>
                <td className={td + " num"}>{$(gananciaAnio)}</td>
                <td className={td + " num text-ok"}>{$(cobradoAnio)}</td>
                <td className={td + " num"}>{$(Math.max(0, gananciaAnio - cobradoAnio))}</td>
              </tr>
            )}
          </Table>
          <p className="mt-3 text-xs text-texto-2">
            Ganancia = comisión (Facturado) y utilidad (Menudeo y Compra-venta) de la parte de AGROVIA, sin IVA, según el mes de cierre.
            Todavía no descuenta gastos: el resultado neto llega con la etapa de finanzas.
          </p>
        </Card>
      </div>
    </>
  );
}
