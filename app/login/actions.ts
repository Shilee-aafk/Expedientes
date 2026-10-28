"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function ingresar(_: string | null, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return "Correo o contraseña incorrectos.";
  redirect("/expedientes");
}
