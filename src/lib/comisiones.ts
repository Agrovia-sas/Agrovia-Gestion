import { hoy } from "@/lib/format";

type Op = {
  comision_bruta: number | string | null;
  comision_neta_agrovia: number | string | null;
  importe_cobrado: number | string | null;
  fecha_cierre: string | null;
};

/** Lo que falta cobrar de la parte de AGROVIA (neto del reparto con comisionistas). */
export function pendienteAgrovia(o: Op): number {
  const bruta = Number(o.comision_bruta) || 0;
  const neta = Number(o.comision_neta_agrovia) || 0;
  if (bruta <= 0) return 0;
  const falta = Math.max(0, bruta - (Number(o.importe_cobrado) || 0));
  return Math.round(((falta * neta) / bruta) * 100) / 100;
}

/** Días desde el cierre de la operación. */
export function diasDesde(fecha: string | null): number {
  if (!fecha) return 0;
  const a = new Date(fecha.slice(0, 10) + "T00:00:00Z").getTime();
  const b = new Date(hoy() + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Estados en los que la comisión todavía se debe. */
export const ESTADOS_PENDIENTES = ["pendiente_cobro", "esperando_carga"] as const;

export const CAMPOS_PENDIENTES =
  "id, numero, modalidad, fecha_cierre, comprador, comprador_id, vendedor, bolsas_totales, bolsas_cargadas, estado_comision, comision_bruta, comision_neta_agrovia, importe_cobrado, fecha_exigible, cobro_parcial";
