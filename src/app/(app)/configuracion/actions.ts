"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mensajeError, type Resultado } from "@/lib/acciones";

type Catalogo = "marcas" | "ingenios" | "depositos" | "productos" | "categorias_gasto";
const PERMITIDOS: Catalogo[] = ["marcas", "ingenios", "depositos", "productos", "categorias_gasto"];

export async function agregarItem(tabla: Catalogo, _prev: Resultado, formData: FormData): Promise<Resultado> {
  if (!PERMITIDOS.includes(tabla)) return { error: "Catálogo inválido." };
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { error: "Escribí un nombre." };
  const supabase = await createClient();
  const { error } =
    tabla === "depositos"
      ? await supabase.from("depositos").insert({ nombre, canero_id: String(formData.get("canero_id") ?? "") || null })
      : await supabase.from(tabla).insert({ nombre });
  if (error) return { error: error.code === "23505" ? `"${nombre}" ya existe.` : mensajeError(error) };
  revalidatePath("/configuracion");
  return { ok: `"${nombre}" agregado.` };
}

export async function cambiarActivo(tabla: Catalogo, id: string, activo: boolean, _prev: Resultado): Promise<Resultado> {
  if (!PERMITIDOS.includes(tabla)) return { error: "Catálogo inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from(tabla).update({ activo }).eq("id", id);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/configuracion");
  return { ok: activo ? "Reactivado." : "Desactivado." };
}
