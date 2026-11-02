"use server";

import { redirect } from "next/navigation";
import * as repo from "@/lib/repo";
import { iniciarSesion } from "@/lib/sesion";

/** Si hay error se devuelven los datos escritos para no vaciar el formulario. */
export type EstadoLogin = { error: string; usuario: string; nombre: string } | null;

const leer = (f: FormData) => ({ usuario: String(f.get("usuario") ?? ""), nombre: String(f.get("nombre") ?? "") });

export async function ingresar(_: EstadoLogin, f: FormData): Promise<EstadoLogin> {
  const error = await iniciarSesion(String(f.get("usuario") ?? ""), String(f.get("clave") ?? ""));
  if (error) return { error, ...leer(f) };
  redirect("/expedientes");
}

/** Solo funciona cuando todavía no hay ningún usuario en Supabase (primer uso). */
export async function crearPrimerUsuario(_: EstadoLogin, f: FormData): Promise<EstadoLogin> {
  const clave = String(f.get("clave") ?? "");
  if (clave !== String(f.get("clave2") ?? "")) return { error: "Las contraseñas no coinciden.", ...leer(f) };
  try {
    await repo.crearPrimerUsuario({ ...leer(f), clave });
  } catch (e) {
    return { error: (e as Error).message, ...leer(f) };
  }
  const error = await iniciarSesion(leer(f).usuario, clave);
  if (error) return { error, ...leer(f) };
  redirect("/expedientes");
}
