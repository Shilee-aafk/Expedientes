"use server";

import { redirect } from "next/navigation";
import { contarUsuarios, crearUsuario, verificarCredenciales } from "@/lib/repo";
import { iniciarSesion } from "@/lib/sesion";

/** Si hay error se devuelven los datos escritos para no vaciar el formulario. */
export type EstadoLogin = { error: string; usuario: string; nombre: string } | null;

const leer = (f: FormData) => ({ usuario: String(f.get("usuario") ?? ""), nombre: String(f.get("nombre") ?? "") });

export async function ingresar(_: EstadoLogin, f: FormData): Promise<EstadoLogin> {
  const id = verificarCredenciales(String(f.get("usuario") ?? ""), String(f.get("clave") ?? ""));
  if (!id) return { error: "Usuario o contraseña incorrectos.", ...leer(f) };
  await iniciarSesion(id);
  redirect("/expedientes");
}

/** Solo funciona cuando todavía no hay ningún usuario (primer uso). */
export async function crearPrimerUsuario(_: EstadoLogin, f: FormData): Promise<EstadoLogin> {
  if (contarUsuarios() > 0) return { error: "Ya existe un usuario. Recarga la página e ingresa con tu cuenta.", ...leer(f) };
  const clave = String(f.get("clave") ?? "");
  if (clave !== String(f.get("clave2") ?? "")) return { error: "Las contraseñas no coinciden.", ...leer(f) };
  try {
    const id = crearUsuario({ ...leer(f), clave });
    await iniciarSesion(id);
  } catch (e) {
    return { error: (e as Error).message, ...leer(f) };
  }
  redirect("/expedientes");
}
