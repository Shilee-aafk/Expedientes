import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el middleware renueva la sesión.
          }
        },
      },
    },
  );
}

/**
 * Cliente + usuario con sesión. `cache` hace que layout y página compartan una sola
 * verificación por petición. `getClaims` valida la firma del token localmente cuando el
 * proyecto usa claves de firma asimétricas (si no, consulta a Supabase Auth como getUser).
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) throw new Error("Sesión expirada. Vuelve a ingresar.");
  return { supabase, user: { id: claims.sub, email: claims.email as string | undefined } };
});
