import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function configSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) {
    throw new Error("Falta configurar Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).");
  }
  return { url, clave };
}

/** Cliente de Supabase con la sesión del usuario (cookies). */
export async function createClient() {
  const almacen = await cookies();
  const { url, clave } = configSupabase();
  return createServerClient(url, clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll(aGuardar) {
        try {
          aGuardar.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el middleware renueva la sesión
        }
      },
    },
  });
}
