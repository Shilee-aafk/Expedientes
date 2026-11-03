"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { borrarArchivos } from "@/lib/archivos";
import * as repo from "@/lib/repo";
import { leerNumero } from "@/lib/numeros";
import { requireUser } from "@/lib/sesion";
import { ESTADOS, type EstadoExpediente } from "@/lib/types";

const texto = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

const numero = (f: FormData, k: string) => leerNumero(texto(f, k));
const entero = (f: FormData, k: string) => {
  const v = texto(f, k)?.replace(/^1\s*[:/]\s*/, "");
  const n = leerNumero(v ?? null);
  if (n !== null && (!Number.isInteger(n) || n <= 0)) throw new Error("La escala debe ser un número entero, por ejemplo 1000.");
  return n;
};

/** Una línea por dueño: "Nombre, RUT" (el RUT es opcional). */
function leerDuenos(raw: string | null) {
  return (raw ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [nombre, ...resto] = l.split(",");
      return { nombre: nombre.trim(), rut: resto.join(",").trim() || null };
    });
}

export async function crearExpediente(_: string | null, f: FormData) {
  await requireUser();
  const predio = texto(f, "predio");
  if (!predio) return "Falta el nombre del predio.";
  let id: number;
  try {
    // El código (EXP-001-2026) se asigna solo; el profesional es quien lo crea
    id = await repo.crearExpediente(
      { predio, rol_sii: texto(f, "rol_sii"), comuna: texto(f, "comuna"), notas: texto(f, "notas") },
      leerDuenos(texto(f, "duenos")),
    );
  } catch (e) {
    return (e as Error).message;
  }
  revalidatePath("/expedientes");
  redirect(`/expedientes/${id}`);
}

export type { CambioItem } from "@/lib/repo";

export async function actualizarItem(id: number, cambio: repo.CambioItem) {
  await requireUser();
  const { expedienteId, archivoAnterior } = await repo.actualizarItem(id, cambio);
  // Al reemplazar o quitar un adjunto se borra el anterior (los del perfil se conservan)
  if ("archivo_path" in cambio && archivoAnterior !== cambio.archivo_path && archivoAnterior?.startsWith(`expedientes/${expedienteId}/`)) {
    await borrarArchivos([archivoAnterior]);
  }
  revalidatePath(`/expedientes/${expedienteId}`);
}

/** Quita un requisito solo de este expediente (la plantilla no cambia). */
export async function eliminarItem(id: number) {
  await requireUser();
  const { expedienteId, archivo } = await repo.eliminarItem(id);
  if (archivo?.startsWith(`expedientes/${expedienteId}/`)) await borrarArchivos([archivo]);
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function cambiarEstado(id: number, estado: EstadoExpediente) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido");
  await requireUser();
  const error = await repo.cambiarEstado(id, estado);
  revalidatePath(`/expedientes/${id}`);
  return error;
}

export async function guardarDatos(id: number, _: string | null, f: FormData) {
  await requireUser();
  const predio = texto(f, "predio");
  if (!predio) return "Falta el nombre del predio.";
  try {
    await repo.guardarDatos(id, {
      predio,
      rol_sii: texto(f, "rol_sii"),
      comuna: texto(f, "comuna"),
      tercero_autorizado: texto(f, "tercero_autorizado"),
      fecha_envio: texto(f, "fecha_envio"),
      fecha_respuesta: texto(f, "fecha_respuesta"),
      observaciones: texto(f, "observaciones"),
      notas: texto(f, "notas"),
      sector: texto(f, "sector"),
      provincia: texto(f, "provincia"),
      region: texto(f, "region"),
      inscripcion_fojas: texto(f, "inscripcion_fojas"),
      inscripcion_numero: texto(f, "inscripcion_numero"),
      inscripcion_anio: texto(f, "inscripcion_anio"),
      conservador: texto(f, "conservador"),
      plano_base: texto(f, "plano_base"),
      lamina: texto(f, "lamina"),
      escala: entero(f, "escala"),
      acceso_norte: numero(f, "acceso_norte"),
      acceso_este: numero(f, "acceso_este"),
      huso: texto(f, "huso"),
    });
  } catch (e) {
    return (e as Error).message;
  }
  revalidatePath(`/expedientes/${id}`);
  return "Guardado";
}

export async function agregarDueno(expedienteId: number, f: FormData) {
  await requireUser();
  const nombre = texto(f, "nombre");
  if (!nombre) return;
  await repo.agregarDueno(expedienteId, datosDueno(f, nombre));
  revalidatePath(`/expedientes/${expedienteId}`);
}

const datosDueno = (f: FormData, nombre: string) => ({
  nombre,
  rut: texto(f, "rut"),
  apoderado_nombre: texto(f, "apoderado_nombre"),
  apoderado_rut: texto(f, "apoderado_rut"),
});

export async function actualizarDueno(expedienteId: number, duenoId: number, f: FormData) {
  await requireUser();
  const nombre = texto(f, "nombre");
  if (!nombre) return;
  await repo.actualizarDueno(duenoId, datosDueno(f, nombre));
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function quitarDueno(expedienteId: number, duenoId: number) {
  await requireUser();
  await repo.quitarDueno(duenoId);
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function eliminarExpediente(id: number) {
  await requireUser();
  await borrarArchivos(await repo.eliminarExpediente(id));
  revalidatePath("/expedientes");
  redirect("/expedientes");
}
