"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mensajeError, type Resultado } from "@/lib/acciones";
import { hoy, parseImporte } from "@/lib/format";
import type { Database } from "@/lib/database.types";

type Medio = Database["public"]["Enums"]["medio_pago"];
const MEDIOS: Medio[] = ["transferencia", "efectivo", "cheque", "echeq", "debito_automatico", "tarjeta", "otro"];

const texto = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};
const fechaDe = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : hoy();
};
const medioDe = (v: FormDataEntryValue | null, porDefecto: Medio): Medio => {
  const s = String(v ?? "") as Medio;
  return MEDIOS.includes(s) ? s : porDefecto;
};

function refrescar() {
  revalidatePath("/tesoreria/caja");
  revalidatePath("/tesoreria/galicia");
  revalidatePath("/");
  revalidatePath("/comisiones");
  revalidatePath("/comisiones/pendientes");
}

export type Pendiente = {
  id: string;
  concepto: string;
  tipo: string;
  numero: string | null;
  pendiente: number;
  exigible: boolean;
  vencimiento: string | null;
};

/** Lo que un tercero debe (cobrar) o lo que se le debe (pagar), con saldo pendiente. */
export async function pendientesDe(terceroId: string, sentido: "cobrar" | "pagar"): Promise<Pendiente[]> {
  if (!terceroId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_obligaciones")
    .select("id, concepto, tipo, pendiente, exigible, vencimiento, operacion_id, fecha")
    .eq("tercero_id", terceroId)
    .eq("sentido", sentido)
    .gt("pendiente", 0)
    .order("fecha");
  const ids = [...new Set((data ?? []).map((o) => o.operacion_id).filter(Boolean))] as string[];
  const { data: ops } = ids.length ? await supabase.from("operaciones").select("id, numero").in("id", ids) : { data: [] };
  const num = new Map((ops ?? []).map((o) => [o.id, o.numero]));
  return (data ?? []).map((o) => ({
    id: o.id!,
    concepto: o.concepto ?? "",
    tipo: o.tipo ?? "",
    numero: o.operacion_id ? num.get(o.operacion_id) ?? null : null,
    pendiente: Number(o.pendiente),
    exigible: !!o.exigible,
    vencimiento: o.vencimiento,
  }));
}

/** Cobro o pago aplicado a lo que se debe, o un ingreso/egreso suelto. */
export async function registrarCobroPago(cuentaId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const sentido = String(formData.get("sentido")) === "pagar" ? "pagar" : "cobrar";
  const tercero_id = texto(formData.get("tercero_id"));
  let aplicaciones: { obligacion_id: string; importe: number; iva_facturado: number; factura_numero?: string | null }[] = [];
  try {
    aplicaciones = JSON.parse(String(formData.get("aplicaciones") ?? "[]"));
  } catch {
    return { error: "No se pudo leer lo que se aplica." };
  }
  aplicaciones = aplicaciones.filter((a) => a.importe > 0);
  const total = aplicaciones.reduce((s, a) => s + a.importe + (a.iva_facturado || 0), 0);
  const extra = parseImporte(formData.get("extra")) ?? 0;
  const importe = Math.round((total + extra) * 100) / 100;
  if (!tercero_id) return { error: sentido === "cobrar" ? "Elegí quién te pagó." : "Elegí a quién le pagaste." };
  if (importe <= 0) return { error: "Marcá qué se cancela o indicá un importe." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimiento", {
    p: {
      cuenta_id: cuentaId,
      fecha: fechaDe(formData.get("fecha")),
      importe: sentido === "cobrar" ? importe : -importe,
      medio: medioDe(formData.get("medio"), "efectivo"),
      concepto: texto(formData.get("concepto")) ?? (sentido === "cobrar" ? "Cobro" : "Pago"),
      tercero_id,
      aplicaciones,
    },
  });
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: `${sentido === "cobrar" ? "Cobro" : "Pago"} registrado.` };
}

export async function registrarGasto(cuentaId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const categoria_id = texto(formData.get("categoria_id"));
  const neto = parseImporte(formData.get("importe_neto")) ?? 0;
  const iva = parseImporte(formData.get("iva")) ?? 0;
  const otros = parseImporte(formData.get("otros_impuestos")) ?? 0;
  const total = Math.round((neto + iva + otros) * 100) / 100;
  const descripcion = texto(formData.get("descripcion"));
  if (!categoria_id) return { error: "Elegí la categoría del gasto." };
  if (!descripcion) return { error: "Escribí qué se pagó." };
  if (total <= 0) return { error: "Indicá el importe." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimiento", {
    p: {
      cuenta_id: cuentaId,
      fecha: fechaDe(formData.get("fecha")),
      importe: -total,
      medio: medioDe(formData.get("medio"), "efectivo"),
      concepto: descripcion,
      tercero_id: texto(formData.get("proveedor_id")),
      gasto: {
        categoria_id,
        descripcion,
        importe_neto: neto,
        iva,
        otros_impuestos: otros,
        proveedor_id: texto(formData.get("proveedor_id")),
        numero_factura: texto(formData.get("numero_factura")),
      },
    },
  });
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: "Gasto registrado." };
}

export async function registrarOtro(cuentaId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const signo = String(formData.get("signo")) === "egreso" ? -1 : 1;
  const importe = parseImporte(formData.get("importe"));
  const concepto = texto(formData.get("concepto"));
  if (!importe || importe <= 0) return { error: "Indicá el importe." };
  if (!concepto) return { error: "Escribí el concepto." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_movimiento", {
    p: {
      cuenta_id: cuentaId,
      fecha: fechaDe(formData.get("fecha")),
      importe: signo * importe,
      medio: medioDe(formData.get("medio"), "efectivo"),
      concepto,
      tercero_id: texto(formData.get("tercero_id")),
    },
  });
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: signo > 0 ? "Ingreso registrado." : "Egreso registrado." };
}

export async function transferir(cuentaId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const destino = texto(formData.get("destino"));
  const importe = parseImporte(formData.get("importe"));
  const sentido = String(formData.get("sentido")) === "entra" ? "entra" : "sale";
  if (!destino) return { error: "Elegí la otra cuenta." };
  if (!importe || importe <= 0) return { error: "Indicá el importe." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("transferir_entre_cuentas", {
    p_origen: sentido === "sale" ? cuentaId : destino,
    p_destino: sentido === "sale" ? destino : cuentaId,
    p_importe: importe,
    p_fecha: fechaDe(formData.get("fecha")),
    p_concepto: texto(formData.get("concepto")) ?? "Transferencia entre cuentas propias",
  });
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: "Transferencia registrada en las dos cuentas." };
}

export async function arqueo(cuentaId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const contado = parseImporte(formData.get("contado"));
  if (contado === null || contado < 0) return { error: "Indicá cuánto contaste." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_arqueo", {
    p_cuenta: cuentaId,
    p_contado: contado,
    p_ajustar: formData.get("ajustar") === "on",
    p_observaciones: texto(formData.get("observaciones")) ?? undefined,
    p_fecha: fechaDe(formData.get("fecha")),
  });
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: "Arqueo registrado." };
}

export async function saldoInicial(cuentaId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const importe = parseImporte(formData.get("importe"));
  if (importe === null) return { error: "Indicá el saldo." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("cuentas_tesoreria")
    .update({ saldo_inicial: importe, fecha_saldo_inicial: fechaDe(formData.get("fecha")) })
    .eq("id", cuentaId);
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: "Saldo inicial guardado." };
}

export async function revertir(movimientoId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const motivo = texto(formData.get("motivo"));
  if (!motivo) return { error: "Escribí el motivo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("revertir_movimiento", { p_movimiento_id: movimientoId, p_motivo: motivo });
  if (error) return { error: mensajeError(error) };
  refrescar();
  return { ok: "Movimiento revertido. Lo que había cancelado vuelve a estar pendiente." };
}
