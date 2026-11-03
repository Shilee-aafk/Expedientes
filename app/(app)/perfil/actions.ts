"use server";

import { revalidatePath } from "next/cache";
import * as repo from "@/lib/repo";
import { requireUser } from "@/lib/sesion";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function guardarPerfil(_: string | null, f: FormData) {
  const { user } = await requireUser();
  const nombre = texto(f, "nombre");
  if (!nombre) return "Falta el nombre.";
  try {
    await repo.actualizarPerfil(user.id, { nombre, rut: texto(f, "rut") || null, profesion: texto(f, "profesion") || null });
  } catch (e) {
    return (e as Error).message;
  }
  revalidatePath("/", "layout");
  return "Guardado";
}

export async function guardarDocumentoPerfil(campo: "carnet_path" | "titulo_path", path: string | null) {
  const { user } = await requireUser();
  // Los expedientes que ya lo usan guardan la misma ruta: el archivo anterior no se borra
  await repo.guardarDocumentoPerfil(user.id, campo, path);
  revalidatePath("/perfil");
}

export async function cambiarClave(_: string | null, f: FormData) {
  const { user } = await requireUser();
  if (texto(f, "nueva") !== texto(f, "nueva2")) return "Las contraseñas nuevas no coinciden.";
  try {
    await repo.cambiarClave(user.usuario, String(f.get("actual") ?? ""), String(f.get("nueva") ?? ""));
  } catch (e) {
    return (e as Error).message;
  }
  return "Guardado";
}

export async function crearUsuario(_: string | null, f: FormData) {
  await requireUser();
  try {
    await repo.crearUsuario({ usuario: texto(f, "usuario"), nombre: texto(f, "nombre"), clave: String(f.get("clave") ?? "") });
  } catch (e) {
    return (e as Error).message;
  }
  revalidatePath("/perfil");
  return "Guardado";
}

/** Quitar del equipo = desactivar: no puede entrar, pero su nombre y documentos se conservan. */
export async function desactivarUsuario(id: string) {
  const { user } = await requireUser();
  if (id === user.id) throw new Error("No puedes desactivar tu propio usuario.");
  await repo.desactivarUsuario(id);
  revalidatePath("/perfil");
}

/** Contraseña temporal para alguien que olvidó la suya. Devuelve "Guardado" o el error. */
export async function restablecerClave(id: string, _: string | null, f: FormData) {
  const { user } = await requireUser();
  if (id === user.id) return "Tu contraseña se cambia arriba, en «Cambiar contraseña».";
  const clave = String(f.get("clave") ?? "");
  if (clave !== String(f.get("clave2") ?? "")) return "Las contraseñas no coinciden.";
  try {
    await repo.restablecerClave(id, clave);
  } catch (e) {
    const m = (e as Error).message;
    return /restablecer_clave/.test(m) ? "Falta actualizar la base: ejecuta de nuevo supabase/esquema.sql en Supabase." : m;
  }
  return "Guardado";
}

export async function reactivarUsuario(id: string) {
  await requireUser();
  await repo.reactivarUsuario(id);
  revalidatePath("/perfil");
}
