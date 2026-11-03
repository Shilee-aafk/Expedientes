import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";
import { correoDe } from "./usuarios";

const COLUMNAS_PERFIL = "id, usuario, nombre, rut, profesion, carnet_path, titulo_path, activo";

/** Perfil del usuario con sesión (o null). Una sola consulta por petición. */
export const usuarioActual = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: perfil } = await supabase.from("profiles").select(COLUMNAS_PERFIL).eq("id", id).maybeSingle();
  return perfil && perfil.activo ? (perfil as Profile) : null;
});

/** Usuario con sesión válida y activo, o redirige al login. */
export async function requireUser() {
  const user = await usuarioActual();
  if (!user) redirect("/login");
  return { user };
}

/** Inicia sesión con usuario y contraseña. Devuelve un mensaje de error, o null. */
export async function iniciarSesion(usuario: string, clave: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: correoDe(usuario), password: clave });
  if (error || !data.user) {
    return /banned|baneado/i.test(error?.message ?? "") ? "Este usuario fue desactivado." : "Usuario o contraseña incorrectos.";
  }
  const { data: perfil } = await supabase.from("profiles").select("activo").eq("id", data.user.id).maybeSingle();
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return "Este usuario fue desactivado.";
  }
  return null;
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
