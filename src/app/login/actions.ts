"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Resultado } from "@/lib/acciones";

export async function ingresar(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completá email y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect("/");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
