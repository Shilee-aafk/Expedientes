"use server";

import { revalidatePath } from "next/cache";
import * as repo from "@/lib/repo";
import { requireUser } from "@/lib/sesion";

function leer(f: FormData): repo.DatosRequisito {
  const dias = Number(f.get("vence_en_dias"));
  const origen = String(f.get("origen_perfil") ?? "");
  return {
    orden: Number(f.get("orden")) || 0,
    nombre: String(f.get("nombre") ?? "").trim(),
    descripcion: String(f.get("descripcion") ?? "").trim() || null,
    cantidad: Math.max(1, Number(f.get("cantidad")) || 1),
    opcional: f.get("opcional") === "on",
    por_dueno: f.get("por_dueno") === "on",
    activo: f.get("activo") === "on",
    vence_en_dias: dias > 0 ? dias : null,
    origen_perfil: origen === "carnet" || origen === "titulo" ? origen : null,
  };
}

/** Devuelve un mensaje de error, o null si se guardó. */
export async function guardarRequisito(id: number | null, f: FormData): Promise<string | null> {
  await requireUser();
  const datos = leer(f);
  if (!datos.nombre) return "Falta el nombre del requisito.";
  await repo.guardarRequisito(id, datos);
  revalidatePath("/configuracion/plantilla");
  return null;
}

export async function cambiarActivo(id: number, activo: boolean) {
  await requireUser();
  await repo.cambiarActivoRequisito(id, activo);
  revalidatePath("/configuracion/plantilla");
}

/** Los expedientes ya creados conservan su copia del requisito. */
export async function eliminarRequisito(id: number) {
  await requireUser();
  await repo.eliminarRequisito(id);
  revalidatePath("/configuracion/plantilla");
}
