import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

export type Resultado = { ok?: string; error?: string };

/** Convierte un error de la base en un mensaje entendible. */
export function mensajeError(e: PostgrestError | null | undefined): string {
  if (!e) return "Ocurrió un error inesperado.";
  const m = e.message ?? "";
  if (e.code === "23505") {
    if (m.includes("cuit")) return "Ya existe un tercero con ese CUIT.";
    if (m.includes("razon_social")) return "Ya existe un tercero con ese nombre.";
    if (m.includes("remito")) return "Ese número de remito ya está cargado para ese ingenio o depósito.";
    return "Ese dato ya existe y no se puede repetir.";
  }
  if (e.code === "42501" || m.includes("row-level security")) return "No tenés permiso para esta acción.";
  if (e.code === "23514") return "Algún dato no es válido. Revisá los campos.";
  // Las reglas del negocio ya devuelven mensajes en castellano
  return m;
}

export function errorZod(e: ZodError): string {
  return e.issues.map((i) => i.message).join(" · ");
}
