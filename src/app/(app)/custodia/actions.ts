"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mensajeError, type Resultado } from "@/lib/acciones";
import { hoy, parseImporte } from "@/lib/format";
import type { Database } from "@/lib/database.types";

type Tipo = Database["public"]["Enums"]["tipo_mov_custodia"];
const TIPOS: Tipo[] = ["ingreso", "traslado", "entrega", "reposicion", "pago_plata", "retiro"];

/** "ingenio:<id>" | "deposito:<id>" → columnas */
function lugar(v: FormDataEntryValue | null, pref: "desde" | "hacia") {
  const s = String(v ?? "");
  const [tipo, id] = s.split(":");
  return {
    [`${pref}_ingenio_id`]: tipo === "ingenio" ? id : null,
    [`${pref}_deposito_id`]: tipo === "deposito" ? id : null,
  } as Record<string, string | null>;
}

const texto = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

export async function registrarMovimiento(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const tipo = String(formData.get("tipo")) as Tipo;
  if (!TIPOS.includes(tipo)) return { error: "Elegí el tipo de movimiento." };
  const dueno_id = String(formData.get("dueno_id") ?? "");
  if (!dueno_id) return { error: "Elegí el dueño de las bolsas." };
  const bolsas = Number(String(formData.get("bolsas") ?? "").replace(/\./g, ""));
  if (!Number.isInteger(bolsas) || bolsas <= 0) return { error: "Las bolsas tienen que ser un número entero mayor a 0." };

  const desde = lugar(formData.get("desde"), "desde");
  const hacia = lugar(formData.get("hacia"), "hacia");
  const tieneDesde = !!(desde.desde_ingenio_id || desde.desde_deposito_id);
  const tieneHacia = !!(hacia.hacia_ingenio_id || hacia.hacia_deposito_id);
  if (["ingreso", "reposicion"].includes(tipo) && !tieneHacia) return { error: "Indicá en qué depósito o ingenio quedan las bolsas." };
  if (["traslado", "entrega", "retiro"].includes(tipo) && !tieneDesde) return { error: "Indicá desde qué depósito o ingenio salen." };
  if (tipo === "traslado" && !tieneHacia) return { error: "Indicá a qué depósito o ingenio van." };
  const importe = parseImporte(formData.get("importe"));
  if (tipo === "pago_plata" && (!importe || importe <= 0)) return { error: "Indicá cuánto se pagó." };

  const fila = {
    tipo,
    dueno_id,
    bolsas,
    fecha: texto(formData.get("fecha")) ?? hoy(),
    marca_id: texto(formData.get("marca_id")),
    ...(["traslado", "entrega", "retiro"].includes(tipo) ? desde : {}),
    ...(["ingreso", "traslado", "reposicion"].includes(tipo) ? hacia : {}),
    destinatario_id: tipo === "entrega" ? texto(formData.get("destinatario_id")) : null,
    importe: tipo === "pago_plata" ? importe : null,
    remito: texto(formData.get("remito")),
    chofer: texto(formData.get("chofer")),
    patente: texto(formData.get("patente"))?.toUpperCase().replace(/\s/g, "") ?? null,
    observaciones: texto(formData.get("observaciones")),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("custodia_movimientos").insert(fila);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/custodia");
  revalidatePath(`/custodia/${dueno_id}`);
  revalidatePath("/");
  return { ok: "Movimiento registrado." };
}

export async function borrarMovimiento(id: string, duenoId: string, _prev: Resultado): Promise<Resultado> {
  const supabase = await createClient();
  const { data: m } = await supabase.from("custodia_movimientos").select("carga_id").eq("id", id).maybeSingle();
  if (m?.carga_id) return { error: "Esta entrega viene de una carga: borrá la carga desde la operación." };
  const { error } = await supabase.from("custodia_movimientos").delete().eq("id", id);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/custodia");
  revalidatePath(`/custodia/${duenoId}`);
  return { ok: "Movimiento borrado. Queda en el historial de cambios." };
}
