"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function guardarPerfil(_: string | null, f: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ nombre: String(f.get("nombre")).trim(), rut: String(f.get("rut") ?? "").trim() || null })
    .eq("id", user.id);
  revalidatePath("/", "layout");
  return error ? error.message : "Guardado";
}

export async function guardarDocumentoPerfil(campo: "carnet_path" | "titulo_path", path: string | null) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ [campo]: path }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/perfil");
}
