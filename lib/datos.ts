import { notFound } from "next/navigation";
import { requireUser } from "./supabase/server";
import type { Dueno, Expediente, Item, Profile } from "./types";

export type HistorialFila = { id: number; accion: string; created_at: string; usuario: { nombre: string } | null };

export async function cargarExpediente(id: number) {
  const { supabase } = await requireUser();
  const [exp, items, duenos, historial, perfiles] = await Promise.all([
    supabase.from("expedientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("expediente_items").select("*").eq("expediente_id", id).order("orden"),
    supabase.from("duenos").select("*").eq("expediente_id", id).order("id"),
    supabase
      .from("historial")
      .select("id, accion, created_at, usuario:profiles(nombre)")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("*").order("nombre"),
  ]);
  if (!exp.data) notFound();

  return {
    expediente: exp.data as Expediente,
    items: (items.data ?? []) as Item[],
    duenos: (duenos.data ?? []) as Dueno[],
    historial: (historial.data ?? []) as unknown as HistorialFila[],
    perfiles: (perfiles.data ?? []) as Profile[],
  };
}
