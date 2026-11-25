import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Cliente de Supabase para el servidor, con la sesión del usuario.
 * Todas las lecturas y escrituras pasan por acá, así se aplican las reglas
 * de seguridad por rol (RLS) de la base.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el middleware refresca la sesión.
          }
        },
      },
    },
  );
}

export type Perfil = Database["public"]["Tables"]["perfiles"]["Row"];

/** Usuario logueado y su perfil (rol). */
export async function getSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, perfil: null };
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, perfil };
}
