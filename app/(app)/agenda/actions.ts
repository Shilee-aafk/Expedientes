"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { choques, ESTADOS_SALIDA, inicioSemana, TIPOS_EQUIPO, type EstadoSalida } from "@/lib/agenda";
import { borrarArchivos } from "@/lib/archivos";
import * as repo from "@/lib/repo";
import { requireUser } from "@/lib/sesion";

const texto = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const hora = (f: FormData, k: string) => {
  const v = texto(f, k);
  return v && /^\d{2}:\d{2}$/.test(v) ? v : null;
};

export type EstadoFormSalida = { error?: string; avisos?: string[] } | null;

/** Crea o actualiza una salida. Si hay choques de personas o equipos, avisa y pide confirmar. */
export async function guardarSalida(id: number | null, volver: string | null, _: EstadoFormSalida, f: FormData): Promise<EstadoFormSalida> {
  await requireUser();
  const fecha = texto(f, "fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elige la fecha de la salida." };
  const expedienteId = Number(texto(f, "expediente_id")) || null;
  const titulo = texto(f, "titulo");
  if (!expedienteId && !titulo) return { error: "Elige el expediente o escribe de qué es la salida." };
  const d = { expediente_id: expedienteId, titulo: expedienteId ? null : titulo, fecha, hora_inicio: hora(f, "hora_inicio"), hora_fin: hora(f, "hora_fin"), notas: texto(f, "notas") };
  if (d.hora_inicio && d.hora_fin && d.hora_fin <= d.hora_inicio) return { error: "La hora de término debe ser después de la de inicio." };
  const personas = f.getAll("personas").map(String).filter(Boolean);
  const equipos = f.getAll("equipos").map(Number).filter((n) => n > 0);

  if (!f.get("confirmado")) {
    const mismoDia = await repo.listarSalidas({ desde: fecha, hasta: fecha });
    const avisos = choques({ id: id ?? undefined, ...d, personas, equipos }, mismoDia);
    if (avisos.length) return { avisos };
  }
  let sid: number;
  try {
    sid = await repo.guardarSalida(id, d, personas, equipos);
  } catch (e) {
    const m = (e as Error).message;
    return { error: /salidas|relation/.test(m) && /does not exist|schema cache/.test(m) ? "Falta actualizar la base: ejecuta de nuevo supabase/esquema.sql en Supabase." : m };
  }
  revalidatePath("/agenda");
  if (expedienteId) revalidatePath(`/expedientes/${expedienteId}`);
  redirect(volver && volver.startsWith("/") ? volver : `/agenda/${sid}`);
}

export async function cambiarEstadoSalida(id: number, estado: EstadoSalida, f?: FormData) {
  await requireUser();
  if (!ESTADOS_SALIDA.includes(estado)) throw new Error("Estado inválido");
  await repo.cambiarEstadoSalida(id, estado, f ? texto(f, "resultado") : undefined);
  revalidatePath("/agenda", "layout");
  revalidatePath("/expedientes", "layout");
}

export async function eliminarSalida(id: number, fecha: string) {
  await requireUser();
  await borrarArchivos(await repo.eliminarSalida(id));
  revalidatePath("/agenda", "layout");
  revalidatePath("/expedientes", "layout");
  redirect(`/agenda?semana=${inicioSemana(fecha)}`);
}

export async function agregarArchivoSalida(salidaId: number, ruta: string, nombre: string) {
  await requireUser();
  if (!ruta.startsWith(`salidas/${salidaId}/`)) throw new Error("Ruta inválida");
  await repo.agregarArchivoSalida(salidaId, ruta, nombre);
  revalidatePath(`/agenda/${salidaId}`);
}

export async function quitarArchivoSalida(salidaId: number, archivoId: number) {
  await requireUser();
  const ruta = await repo.quitarArchivoSalida(archivoId);
  if (ruta) await borrarArchivos([ruta]);
  revalidatePath(`/agenda/${salidaId}`);
}

export async function crearEquipo(_: string | null, f: FormData) {
  await requireUser();
  const nombre = texto(f, "nombre");
  const tipo = texto(f, "tipo") ?? "otro";
  if (!nombre) return "Escribe el nombre del equipo.";
  if (!(TIPOS_EQUIPO as readonly string[]).includes(tipo)) return "Tipo de equipo inválido.";
  try {
    await repo.guardarEquipo({ nombre, tipo });
  } catch (e) {
    return (e as Error).message;
  }
  revalidatePath("/agenda", "layout");
  return "Guardado";
}

export async function cambiarActivoEquipo(id: number, activo: boolean) {
  await requireUser();
  await repo.cambiarActivoEquipo(id, activo);
  revalidatePath("/agenda", "layout");
}
