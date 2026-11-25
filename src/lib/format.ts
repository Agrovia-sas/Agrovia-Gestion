// Formatos argentinos: $ 1.234.567,89 y DD/MM/AAAA, hora de Buenos Aires.

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const entero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function $(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return pesos.format(Number(n)).replace(/ /g, " ");
}

export function bolsas(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return entero.format(Number(n));
}

/** Fecha guardada como 'AAAA-MM-DD' → 'DD/MM/AAAA' (sin corrimiento de zona). */
export function fecha(d: string | null | undefined): string {
  if (!d) return "—";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}

export function fechaHora(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

/** Hoy en Buenos Aires como 'AAAA-MM-DD'. */
export function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

export function primerDiaDelMes(): string {
  return hoy().slice(0, 8) + "01";
}

/** Convierte "1.234,56" o "1234.56" en número. */
export function parseImporte(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export const MODALIDADES = {
  facturado: "Facturado",
  menudeo: "Menudeo",
  compraventa: "Compra-venta",
} as const;

export const ESTADO_LOGISTICO = {
  sin_cargar: "Sin cargar",
  carga_parcial: "Carga parcial",
  carga_completada: "Carga completada",
} as const;

export const ESTADO_COMISION = {
  esperando_carga: "Esperando completar carga",
  pendiente_cobro: "Pendiente de cobro",
  cobrada: "Cobrada",
  sin_comision: "Sin comisión",
  anulada: "Anulada",
} as const;

export const TIPO_COMISION = {
  diferencia: "Diferencia comercial (venta − compra)",
  por_bolsa: "Monto por bolsa",
  fija: "Monto fijo",
  porcentaje: "% del precio de venta",
} as const;

export const ROLES_TERCERO = {
  comprador: "Comprador",
  productor: "Productor",
  proveedor: "Proveedor",
  transportista: "Transportista",
  comisionista: "Comisionista",
  otro: "Otro",
} as const;
