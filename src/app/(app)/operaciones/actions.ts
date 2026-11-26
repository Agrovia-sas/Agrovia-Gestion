"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorZod, mensajeError, type Resultado } from "@/lib/acciones";
import { hoy, parseImporte } from "@/lib/format";
import type { Database } from "@/lib/database.types";

// numero y numero_seq los asigna la base (trigger) al insertar
type NuevaOperacion = Omit<Database["public"]["Tables"]["operaciones"]["Insert"], "numero" | "numero_seq">;

// Texto opcional: vacío o ausente del formulario → null
const textoONull = z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().nullable());
const uuidONull = z.preprocess((v) => (v === "" || v === undefined || v === null ? null : v), z.string().uuid().nullable());
const importe = (msg: string) => z.preprocess((v) => parseImporte(v as FormDataEntryValue), z.number({ message: msg }).min(0, msg));
const importeOpcional = z.preprocess((v) => parseImporte(v as FormDataEntryValue), z.number().min(0).nullable());
const entero = (msg: string) => z.preprocess((v) => (v === "" ? undefined : Number(String(v).replace(/\./g, ""))), z.number({ message: msg }).int(msg));

const esquemaOperacion = z
  .object({
    modalidad: z.enum(["facturado", "menudeo", "compraventa"], { message: "Elegí la modalidad." }),
    fecha_cierre: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de cierre inválida."),
    vendedor_id: z.string().uuid("Elegí el vendedor."),
    comprador_id: uuidONull,
    comisionista_id: uuidONull,
    marca_id: uuidONull,
    producto_id: uuidONull,
    zafra: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(2000).max(2100).nullable()),
    ubicacion: z.string().optional(),
    bolsas_negociadas: entero("Las bolsas tienen que ser un número entero.").pipe(z.number().positive("Las bolsas tienen que ser más de 0.")),
    kg_por_bolsa: z.preprocess((v) => parseImporte(v as FormDataEntryValue) ?? 50, z.number().positive()),
    precio_compra: importe("Precio de compra inválido."),
    precio_venta: importeOpcional,
    precios_incluyen_iva: z.preprocess((v) => v === "on", z.boolean()),
    bolsas_en_custodia: z.preprocess((v) => v === "on", z.boolean()),
    costo_flete: importeOpcional,
    costo_iibb: importeOpcional,
    costo_dyc: importeOpcional,
    costo_otros: importeOpcional,
    comision_tipo: z.enum(["diferencia", "por_bolsa", "fija", "porcentaje"]),
    comision_valor: importeOpcional,
    condiciones_pago: textoONull,
    observaciones: textoONull,
  })
  .refine((d) => d.modalidad !== "facturado" || (d.comprador_id && d.precio_venta !== null), {
    message: "En Facturado hacen falta comprador y precio de venta.",
  })
  .refine((d) => d.comision_tipo === "diferencia" || d.comision_valor !== null, {
    message: "Indicá el valor de la comisión.",
  })
  .refine((d) => d.comprador_id !== d.vendedor_id, { message: "Vendedor y comprador tienen que ser distintos." })
  .refine((d) => !d.bolsas_en_custodia || d.modalidad !== "facturado", { message: "En Facturado no hay bolsas en custodia." });

function ubicacion(u: string | undefined) {
  // Valor del select: "ingenio:<id>" o "deposito:<id>"
  if (!u) return { ubicacion_tipo: null, ingenio_id: null, deposito_id: null };
  const [tipo, id] = u.split(":");
  if (tipo === "ingenio") return { ubicacion_tipo: "ingenio" as const, ingenio_id: id, deposito_id: null };
  if (tipo === "deposito") return { ubicacion_tipo: "deposito" as const, ingenio_id: null, deposito_id: id };
  return { ubicacion_tipo: null, ingenio_id: null, deposito_id: null };
}

export async function crearOperacion(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const p = esquemaOperacion.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: errorZod(p.error) };
  const { ubicacion: u, costo_flete, costo_iibb, costo_dyc, costo_otros, ...d } = p.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operaciones")
    .insert({
      ...d,
      ...ubicacion(u),
      costo_flete: costo_flete ?? 0,
      costo_iibb: costo_iibb ?? 0,
      costo_dyc: costo_dyc ?? 0,
      costo_otros: costo_otros ?? 0,
    } satisfies NuevaOperacion as Database["public"]["Tables"]["operaciones"]["Insert"])
    .select("id")
    .single();
  if (error) return { error: mensajeError(error) };
  revalidatePath("/operaciones");
  redirect(`/operaciones/${data.id}`);
}

// En una carga solo son obligatorias la operación y las bolsas: el resto es opcional.
const esquemaCarga = z.object({
  operacion_id: z.string().uuid("Elegí la operación."),
  fecha: z.preprocess((v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : hoy()), z.string()),
  bolsas: entero("Las bolsas tienen que ser un número entero.").pipe(z.number().positive("Las bolsas tienen que ser más de 0.")),
  transportista_id: uuidONull,
  chofer: textoONull,
  patente: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.toUpperCase().replace(/\s/g, "") : null), z.string().nullable()),
  remito: textoONull,
  orden_retiro: textoONull,
  es_apertura: z.preprocess((v) => v === "on", z.boolean()),
  observaciones: textoONull,
  ubicacion: z.string().optional(),
});

export async function registrarCarga(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const p = esquemaCarga.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: errorZod(p.error) };
  const { ubicacion: u, ...d } = p.data;
  const ub = u ? ubicacion(u) : {};

  const supabase = await createClient();
  const { error } = await supabase.from("cargas").insert({ ...d, ...ub });
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${d.operacion_id}`);
  revalidatePath("/cargas");
  revalidatePath("/");
  return { ok: `Carga de ${d.bolsas} bolsas registrada.` };
}

export async function borrarCarga(operacionId: string, cargaId: string, _prev: Resultado): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("cargas").delete().eq("id", cargaId);
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Carga eliminada. Quedó registrado en el historial." };
}

export async function registrarAjuste(operacionId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const delta = Number(String(formData.get("delta_bolsas") ?? "").replace(/\./g, ""));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!Number.isInteger(delta) || delta === 0) return { error: "Indicá cuántas bolsas se amplían (+) o se reducen (−)." };
  if (!motivo) return { error: "El ajuste necesita un motivo." };
  const supabase = await createClient();
  const { error } = await supabase.from("operacion_ajustes").insert({ operacion_id: operacionId, delta_bolsas: delta, motivo });
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Ajuste registrado." };
}

export async function cambiarComision(operacionId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const tipo = String(formData.get("comision_tipo")) as "diferencia" | "por_bolsa" | "fija" | "porcentaje";
  const valor = parseImporte(formData.get("comision_valor"));
  if (tipo !== "diferencia" && valor === null) return { error: "Indicá el valor de la comisión." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("operaciones")
    .update({ comision_tipo: tipo, comision_valor: tipo === "diferencia" ? null : valor })
    .eq("id", operacionId);
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Comisión recalculada." };
}

export async function agregarParticipante(comisionId: string, operacionId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const tercero_id = String(formData.get("tercero_id") ?? "");
  const tipo = String(formData.get("tipo")) === "monto" ? "monto" : "porcentaje";
  const valor = parseImporte(formData.get("valor"));
  if (!tercero_id) return { error: "Elegí con quién se reparte." };
  if (!valor || valor <= 0) return { error: "Indicá el porcentaje o el monto." };
  const supabase = await createClient();
  const { error } = await supabase.from("comision_participantes").insert({ comision_id: comisionId, tercero_id, tipo, valor });
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Reparto agregado." };
}

export async function quitarParticipante(participanteId: string, operacionId: string, _prev: Resultado): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.from("comision_participantes").delete().eq("id", participanteId);
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Reparto quitado." };
}

export async function registrarPagoDirecto(operacionId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const importe = parseImporte(formData.get("importe"));
  const fecha = String(formData.get("fecha") ?? "");
  if (!importe || importe <= 0) return { error: "Importe inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("seguimiento_pagos_directos").insert({
    operacion_id: operacionId,
    fecha,
    importe,
    medio: String(formData.get("medio") ?? "") || null,
    referencia: String(formData.get("referencia") ?? "") || null,
  });
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Pago registrado (solo seguimiento, no toca tu tesorería)." };
}

export async function cancelarOperacion(operacionId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) return { error: "Para cancelar hace falta un motivo." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("operaciones")
    .update({ estado_comercial: "cancelada", motivo_cancelacion: motivo })
    .eq("id", operacionId);
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Operación cancelada. El número no se reutiliza." };
}

export async function editarDatos(operacionId: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const precio_compra = parseImporte(formData.get("precio_compra"));
  const precio_venta = parseImporte(formData.get("precio_venta"));
  if (precio_compra === null) return { error: "Precio de compra inválido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("operaciones")
    .update({
      precio_compra,
      precio_venta,
      comprador_id: String(formData.get("comprador_id") ?? "") || null,
      condiciones_pago: String(formData.get("condiciones_pago") ?? "") || null,
      observaciones: String(formData.get("observaciones") ?? "") || null,
    })
    .eq("id", operacionId);
  if (error) return { error: mensajeError(error) };
  revalidatePath(`/operaciones/${operacionId}`);
  return { ok: "Datos guardados. La comisión se recalculó." };
}
