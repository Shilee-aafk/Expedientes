"use server";

import { revalidatePath } from "next/cache";
import { borrarArchivo } from "@/lib/archivos";
import * as repo from "@/lib/repo";
import { requireUser } from "@/lib/sesion";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function guardarPerfil(_: string | null, f: FormData) {
  const { user } = await requireUser();
  const nombre = texto(f, "nombre");
  if (!nombre) return "Falta el nombre.";
  repo.actualizarPerfil(user.id, { nombre, rut: texto(f, "rut") || null });
  revalidatePath("/", "layout");
  return "Guardado";
}

export async function guardarDocumentoPerfil(campo: "carnet_path" | "titulo_path", path: string | null) {
  const { user } = await requireUser();
  // Los expedientes que ya lo usan guardan la misma ruta: el archivo anterior no se borra
  repo.guardarDocumentoPerfil(user.id, campo, path);
  revalidatePath("/perfil");
}

export async function cambiarClave(_: string | null, f: FormData) {
  const { user } = await requireUser();
  if (texto(f, "nueva") !== texto(f, "nueva2")) return "Las contraseñas nuevas no coinciden.";
  try {
    repo.cambiarClave(user.id, String(f.get("actual") ?? ""), String(f.get("nueva") ?? ""));
  } catch (e) {
    return (e as Error).message;
  }
  return "Guardado";
}

export async function crearUsuario(_: string | null, f: FormData) {
  await requireUser();
  try {
    repo.crearUsuario({ usuario: texto(f, "usuario"), nombre: texto(f, "nombre"), clave: String(f.get("clave") ?? "") });
  } catch (e) {
    return (e as Error).message;
  }
  revalidatePath("/perfil");
  return "Guardado";
}

export async function eliminarUsuario(id: number) {
  const { user } = await requireUser();
  if (id === user.id) throw new Error("No puedes eliminar tu propio usuario.");
  const u = repo.obtenerUsuario(id);
  repo.eliminarUsuario(id);
  // Sus documentos de perfil solo se borran si ningún expediente los usa
  for (const p of [u?.carnet_path, u?.titulo_path]) if (p && !repo.archivoEnUso(p)) await borrarArchivo(p);
  revalidatePath("/perfil");
}
