"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorZod, mensajeError, type Resultado } from "@/lib/acciones";

const ROLES = ["comprador", "productor", "proveedor", "transportista", "comisionista", "otro"] as const;

const vacioANull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v);

const esquema = z.object({
  razon_social: z.string().trim().min(2, "La razón social es obligatoria."),
  nombre_comercial: z.preprocess(vacioANull, z.string().nullable()),
  cuit: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\D/g, "") || null : v),
    z.string().regex(/^\d{11}$/, "El CUIT tiene que tener 11 números.").nullable(),
  ),
  domicilio: z.preprocess(vacioANull, z.string().nullable()),
  provincia: z.preprocess(vacioANull, z.string().nullable()),
  contacto: z.preprocess(vacioANull, z.string().nullable()),
  telefono: z.preprocess(vacioANull, z.string().nullable()),
  email: z.preprocess(vacioANull, z.string().email("El email no es válido.").nullable()),
  condicion_fiscal: z.preprocess(vacioANull, z.string().nullable()),
  observaciones: z.preprocess(vacioANull, z.string().nullable()),
});

function leer(formData: FormData) {
  const datos = esquema.safeParse(Object.fromEntries(formData));
  const roles = formData.getAll("roles").map(String).filter((r): r is (typeof ROLES)[number] => (ROLES as readonly string[]).includes(r));
  return { datos, roles };
}

export async function crearTercero(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const { datos, roles } = leer(formData);
  if (!datos.success) return { error: errorZod(datos.error) };
  if (roles.length === 0) return { error: "Elegí al menos un rol (comprador, productor…)." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("terceros").insert(datos.data).select("id").single();
  if (error) return { error: mensajeError(error) };
  const { error: e2 } = await supabase.from("tercero_roles").insert(roles.map((rol) => ({ tercero_id: data.id, rol })));
  if (e2) return { error: mensajeError(e2) };

  revalidatePath("/terceros");
  const volver = String(formData.get("volver") ?? "");
  redirect(volver.startsWith("/") ? volver : `/terceros/${data.id}`);
}

export async function editarTercero(id: string, _prev: Resultado, formData: FormData): Promise<Resultado> {
  const { datos, roles } = leer(formData);
  if (!datos.success) return { error: errorZod(datos.error) };
  if (roles.length === 0) return { error: "Elegí al menos un rol." };

  const supabase = await createClient();
  const { error } = await supabase.from("terceros").update(datos.data).eq("id", id);
  if (error) return { error: mensajeError(error) };

  const { data: actuales } = await supabase.from("tercero_roles").select("rol").eq("tercero_id", id);
  const tiene = new Set((actuales ?? []).map((r) => r.rol));
  const quitar = [...tiene].filter((r) => !roles.includes(r));
  const agregar = roles.filter((r) => !tiene.has(r));
  if (quitar.length) await supabase.from("tercero_roles").delete().eq("tercero_id", id).in("rol", quitar);
  if (agregar.length) await supabase.from("tercero_roles").insert(agregar.map((rol) => ({ tercero_id: id, rol })));

  revalidatePath(`/terceros/${id}`);
  return { ok: "Datos guardados." };
}
