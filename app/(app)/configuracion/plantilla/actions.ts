"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

function leer(f: FormData) {
  const dias = Number(f.get("vence_en_dias"));
  const origen = String(f.get("origen_perfil") ?? "");
  return {
    orden: Number(f.get("orden")) || 0,
    nombre: String(f.get("nombre")).trim(),
    descripcion: String(f.get("descripcion") ?? "").trim() || null,
    cantidad: Math.max(1, Number(f.get("cantidad")) || 1),
    opcional: f.get("opcional") === "on",
    por_dueno: f.get("por_dueno") === "on",
    activo: f.get("activo") === "on",
    vence_en_dias: dias > 0 ? dias : null,
    origen_perfil: origen === "carnet" || origen === "titulo" ? origen : null,
  };
}

export async function guardarRequisito(id: number | null, f: FormData) {
  const { supabase } = await requireUser();
  const datos = leer(f);
  if (!datos.nombre) return;
  if (id) await supabase.from("requisitos_plantilla").update(datos).eq("id", id);
  else await supabase.from("requisitos_plantilla").insert(datos);
  revalidatePath("/configuracion/plantilla");
}
