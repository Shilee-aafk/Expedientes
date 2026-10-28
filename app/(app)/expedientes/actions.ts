"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoyChile, requiereChecklistCompleto, resumen } from "@/lib/checklist";
import { requireUser } from "@/lib/supabase/server";
import { ESTADOS, type EstadoExpediente, type EstadoItem, type Item } from "@/lib/types";

const texto = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
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
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("expedientes")
    .insert({
      codigo: texto(f, "codigo"),
      predio: texto(f, "predio"),
      rol_sii: texto(f, "rol_sii"),
      comuna: texto(f, "comuna"),
      profesional_id: texto(f, "profesional_id"),
      notas: texto(f, "notas"),
    })
    .select("id")
    .single();
  if (error) return error.code === "23505" ? "Ya existe un expediente con ese código." : error.message;

  const duenos = leerDuenos(texto(f, "duenos"));
  if (duenos.length) {
    await supabase.from("duenos").insert(duenos.map((d) => ({ ...d, expediente_id: data.id })));
  }
  redirect(`/expedientes/${data.id}`);
}

export type CambioItem = Partial<
  Pick<Item, "cantidad_entregada" | "fecha_emision" | "comentario" | "archivo_path">
> & { estado?: EstadoItem };

export async function actualizarItem(id: number, cambio: CambioItem) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("expediente_items")
    .update({ ...cambio, actualizado_por: user.id, actualizado_at: new Date().toISOString() })
    .eq("id", id)
    .select("expediente_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/expedientes/${data.expediente_id}`);
}

export async function cambiarEstado(id: number, estado: EstadoExpediente) {
  if (!ESTADOS.includes(estado)) throw new Error("Estado inválido");
  const { supabase } = await requireUser();

  if (requiereChecklistCompleto(estado)) {
    const [{ data: items }, { count }] = await Promise.all([
      supabase.from("expediente_items").select("*").eq("expediente_id", id),
      supabase.from("duenos").select("id", { count: "exact", head: true }).eq("expediente_id", id),
    ]);
    const r = resumen((items ?? []) as Item[], count ?? 0, hoyChile());
    if (!r.listoParaEnviar) {
      return "Faltan requisitos o hay certificados vencidos: " + [...r.pendientes, ...r.vencidos].map((i) => i.nombre).join(", ");
    }
  }

  const cambios: Record<string, unknown> = { estado };
  if (estado === "enviado") {
    const { data } = await supabase.from("expedientes").select("fecha_envio").eq("id", id).single();
    if (!data?.fecha_envio) cambios.fecha_envio = hoyChile();
  }
  const { error } = await supabase.from("expedientes").update(cambios).eq("id", id);
  if (error) return error.message;
  revalidatePath(`/expedientes/${id}`);
  return null;
}

export async function guardarDatos(id: number, _: string | null, f: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("expedientes")
    .update({
      codigo: texto(f, "codigo"),
      predio: texto(f, "predio"),
      rol_sii: texto(f, "rol_sii"),
      comuna: texto(f, "comuna"),
      profesional_id: texto(f, "profesional_id"),
      tercero_autorizado: texto(f, "tercero_autorizado"),
      fecha_envio: texto(f, "fecha_envio"),
      fecha_respuesta: texto(f, "fecha_respuesta"),
      observaciones: texto(f, "observaciones"),
      notas: texto(f, "notas"),
    })
    .eq("id", id);
  if (error) return error.code === "23505" ? "Ya existe un expediente con ese código." : error.message;
  revalidatePath(`/expedientes/${id}`);
  return "Guardado";
}

export async function agregarDueno(expedienteId: number, f: FormData) {
  const nombre = texto(f, "nombre");
  if (!nombre) return;
  const { supabase } = await requireUser();
  await supabase.from("duenos").insert({ expediente_id: expedienteId, nombre, rut: texto(f, "rut") });
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function quitarDueno(expedienteId: number, duenoId: number) {
  const { supabase } = await requireUser();
  await supabase.from("duenos").delete().eq("id", duenoId);
  revalidatePath(`/expedientes/${expedienteId}`);
}

export async function eliminarExpediente(id: number) {
  const { supabase } = await requireUser();
  const { data: items } = await supabase
    .from("expediente_items")
    .select("archivo_path")
    .eq("expediente_id", id)
    .like("archivo_path", `expedientes/${id}/%`);
  const paths = (items ?? []).map((i) => i.archivo_path as string);
  if (paths.length) await supabase.storage.from("documentos").remove(paths);
  await supabase.from("expedientes").delete().eq("id", id);
  redirect("/expedientes");
}
