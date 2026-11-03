/**
 * Acceso a datos en Supabase (base compartida). Las reglas de acceso (solo miembros
 * activos) las aplica la base con RLS; el código, el checklist y el historial los
 * generan triggers (ver supabase/esquema.sql).
 */
import { hoyChile, requiereChecklistCompleto, resumen } from "./checklist";
import { createClient } from "./supabase/server";
import type { Dueno, EstadoExpediente, EstadoItem, Expediente, Item, Profile, Requisito } from "./types";
import { correoDe } from "./usuarios";

const COLUMNAS_PERFIL = "id, usuario, nombre, rut, profesion, carnet_path, titulo_path, activo";

/** Lanza el error de Supabase con un mensaje legible. */
function revisar<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

async function idUsuario(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

/* ─── Usuarios ────────────────────────────────────────────────────── */

export async function hayUsuarios(): Promise<boolean> {
  const supabase = await createClient();
  return Boolean(revisar(await supabase.rpc("hay_usuarios")));
}

export async function estadoBase(): Promise<{ usuarios: number; expedientes: number }> {
  const supabase = await createClient();
  return revisar(await supabase.rpc("estado_base")) as { usuarios: number; expedientes: number };
}

export async function listarUsuarios(): Promise<Profile[]> {
  const supabase = await createClient();
  return revisar(await supabase.from("profiles").select(COLUMNAS_PERFIL).order("nombre")) as Profile[];
}

export async function crearPrimerUsuario(d: { usuario: string; nombre: string; clave: string }) {
  const supabase = await createClient();
  revisar(await supabase.rpc("crear_primer_usuario", { p_usuario: d.usuario, p_nombre: d.nombre, p_clave: d.clave }));
}

export async function crearUsuario(d: { usuario: string; nombre: string; clave: string }) {
  const supabase = await createClient();
  revisar(await supabase.rpc("crear_usuario", { p_usuario: d.usuario, p_nombre: d.nombre, p_clave: d.clave }));
}

/** Quitar del equipo = desactivar: no puede entrar, pero su nombre sigue en el historial. */
export async function desactivarUsuario(id: string) {
  const supabase = await createClient();
  revisar(await supabase.rpc("desactivar_usuario", { p_id: id }));
}

/** Contraseña temporal para otra persona del equipo (cierra sus sesiones abiertas). */
export async function restablecerClave(id: string, clave: string) {
  const supabase = await createClient();
  revisar(await supabase.rpc("restablecer_clave", { p_id: id, p_clave: clave }));
}

export async function reactivarUsuario(id: string) {
  const supabase = await createClient();
  revisar(await supabase.rpc("reactivar_usuario", { p_id: id }));
}

export async function actualizarPerfil(id: string, d: { nombre: string; rut: string | null; profesion: string | null }) {
  const supabase = await createClient();
  revisar(await supabase.from("profiles").update(d).eq("id", id));
}

export async function guardarDocumentoPerfil(id: string, campo: "carnet_path" | "titulo_path", path: string | null) {
  const supabase = await createClient();
  revisar(await supabase.from("profiles").update({ [campo]: path }).eq("id", id));
}

/** Verifica la contraseña actual y la cambia. */
export async function cambiarClave(usuario: string, actual: string, nueva: string) {
  if (nueva.length < 6) throw new Error("La contraseña nueva debe tener al menos 6 caracteres.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: correoDe(usuario), password: actual });
  if (error) throw new Error("La contraseña actual no es correcta.");
  const r = await supabase.auth.updateUser({ password: nueva });
  if (r.error) throw new Error(r.error.message);
}

/** ¿Algún expediente usa este archivo? (los documentos de perfil se comparten) */
export async function archivoEnUso(path: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase.from("expediente_items").select("id", { count: "exact", head: true }).eq("archivo_path", path);
  return (count ?? 0) > 0;
}

/* ─── Plantilla ───────────────────────────────────────────────────── */

export type DatosRequisito = Omit<Requisito, "id">;

export async function listarRequisitos(): Promise<Requisito[]> {
  const supabase = await createClient();
  return revisar(await supabase.from("requisitos_plantilla").select("*").order("orden").order("id")) as Requisito[];
}

export async function guardarRequisito(id: number | null, d: DatosRequisito) {
  const supabase = await createClient();
  if (id) revisar(await supabase.from("requisitos_plantilla").update(d).eq("id", id));
  else revisar(await supabase.from("requisitos_plantilla").insert(d));
}

export async function cambiarActivoRequisito(id: number, activo: boolean) {
  const supabase = await createClient();
  revisar(await supabase.from("requisitos_plantilla").update({ activo }).eq("id", id));
}

/** Los expedientes ya creados conservan su copia del requisito. */
export async function eliminarRequisito(id: number) {
  const supabase = await createClient();
  revisar(await supabase.from("requisitos_plantilla").delete().eq("id", id));
}

/* ─── Expedientes ─────────────────────────────────────────────────── */

/** KMZ/KML adjunto de cada expediente (uno por expediente, el primero del checklist). */
export type KmzExpediente = { expedienteId: number; codigo: string; predio: string; estado: EstadoExpediente; ruta: string };

export async function listarKmz(): Promise<KmzExpediente[]> {
  const supabase = await createClient();
  const filas = revisar(
    await supabase
      .from("expediente_items")
      .select("expediente_id, archivo_path, orden, expediente:expedientes(codigo, predio, estado)")
      .or("archivo_path.ilike.%.kmz,archivo_path.ilike.%.kml")
      .order("orden"),
  ) as unknown as { expediente_id: number; archivo_path: string; expediente: { codigo: string; predio: string; estado: EstadoExpediente } | null }[];
  const vistos = new Set<number>();
  const lista: KmzExpediente[] = [];
  for (const f of filas) {
    if (vistos.has(f.expediente_id) || !f.expediente) continue;
    vistos.add(f.expediente_id);
    lista.push({ expedienteId: f.expediente_id, codigo: f.expediente.codigo, predio: f.expediente.predio, estado: f.expediente.estado, ruta: f.archivo_path });
  }
  return lista;
}

export type FilaListado = Expediente & { items: Item[]; duenos: { nombre: string }[]; profesional: { nombre: string } | null };

export async function listarExpedientes(): Promise<FilaListado[]> {
  const supabase = await createClient();
  return revisar(
    await supabase
      .from("expedientes")
      .select("*, items:expediente_items(*), duenos(nombre), profesional:profiles!expedientes_profesional_id_fkey(nombre)")
      .order("updated_at", { ascending: false }),
  ) as unknown as FilaListado[];
}

export type HistorialFila = { id: number; accion: string; created_at: string; usuario: { nombre: string } | null };

export async function cargarExpediente(id: number) {
  const supabase = await createClient();
  const [exp, items, duenos, historial, perfiles] = await Promise.all([
    supabase.from("expedientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("expediente_items").select("*").eq("expediente_id", id).order("orden").order("id"),
    supabase.from("duenos").select("*").eq("expediente_id", id).order("id"),
    supabase
      .from("historial")
      .select("id, accion, created_at, usuario:profiles(nombre)")
      .eq("expediente_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50),
    supabase.from("profiles").select(COLUMNAS_PERFIL).order("nombre"),
  ]);
  const expediente = revisar(exp);
  if (!expediente) return null;
  return {
    expediente: expediente as Expediente,
    items: revisar(items) as Item[],
    duenos: revisar(duenos) as Dueno[],
    historial: revisar(historial) as unknown as HistorialFila[],
    perfiles: revisar(perfiles) as Profile[],
  };
}

export type DatosNuevoExpediente = { predio: string; rol_sii: string | null; comuna: string | null; notas: string | null };

/** El código, el profesional (quien lo crea) y el checklist los asigna la base. */
export async function crearExpediente(d: DatosNuevoExpediente, duenos: { nombre: string; rut: string | null }[]): Promise<number> {
  const supabase = await createClient();
  const { id } = revisar(await supabase.from("expedientes").insert(d).select("id").single()) as { id: number };
  if (duenos.length) revisar(await supabase.from("duenos").insert(duenos.map((du) => ({ ...du, expediente_id: id }))));
  return id;
}

export type CambioItem = Partial<Pick<Item, "cantidad_entregada" | "fecha_emision" | "comentario" | "archivo_path">> & {
  estado?: EstadoItem;
};

/** Actualiza un requisito del checklist (el historial lo anota la base). */
export async function actualizarItem(id: number, cambio: CambioItem): Promise<{ expedienteId: number; archivoAnterior: string | null }> {
  const supabase = await createClient();
  const antes = revisar(await supabase.from("expediente_items").select("expediente_id, archivo_path").eq("id", id).maybeSingle());
  if (!antes) throw new Error("El requisito ya no existe.");
  revisar(
    await supabase
      .from("expediente_items")
      .update({ ...cambio, actualizado_por: await idUsuario(supabase), actualizado_at: new Date().toISOString() })
      .eq("id", id),
  );
  revisar(await supabase.from("expedientes").update({ updated_at: new Date().toISOString() }).eq("id", antes.expediente_id));
  return { expedienteId: antes.expediente_id, archivoAnterior: antes.archivo_path };
}

/** Quita un requisito solo de este expediente. Devuelve el archivo que tenía (para borrarlo). */
export async function eliminarItem(id: number) {
  const supabase = await createClient();
  const r = revisar(await supabase.from("expediente_items").delete().eq("id", id).select("expediente_id, archivo_path").maybeSingle());
  if (!r) throw new Error("El requisito ya no existe.");
  return { expedienteId: r.expediente_id as number, archivo: (r.archivo_path as string | null) ?? null };
}

/** Cambia el estado. Devuelve un mensaje de error si faltan requisitos, o null. */
export async function cambiarEstado(id: number, estado: EstadoExpediente): Promise<string | null> {
  const datos = await cargarExpediente(id);
  if (!datos) return "El expediente ya no existe.";
  if (requiereChecklistCompleto(estado)) {
    const r = resumen(datos.items, datos.duenos.length, hoyChile());
    if (!r.listoParaEnviar) {
      return "Faltan requisitos o hay certificados vencidos: " + [...r.pendientes, ...r.vencidos].map((i) => i.nombre).join(", ");
    }
  }
  if (datos.expediente.estado === estado) return null;
  const supabase = await createClient();
  const fechaEnvio = estado === "enviado" && !datos.expediente.fecha_envio ? hoyChile() : datos.expediente.fecha_envio;
  const { error } = await supabase.from("expedientes").update({ estado, fecha_envio: fechaEnvio }).eq("id", id);
  return error ? error.message : null;
}

export type DatosExpediente = Pick<
  Expediente,
  "predio" | "rol_sii" | "comuna" | "tercero_autorizado" | "fecha_envio" | "fecha_respuesta" | "observaciones" | "notas" | CampoVineta
>;

/** Campos que usa la viñeta del plano (plugin de AutoCAD / Civil 3D) */
export const CAMPOS_VINETA = [
  "sector", "provincia", "region", "inscripcion_fojas", "inscripcion_numero", "inscripcion_anio",
  "conservador", "plano_base", "lamina", "escala", "acceso_norte", "acceso_este", "huso",
] as const;
export type CampoVineta = (typeof CAMPOS_VINETA)[number];

export async function guardarDatos(id: number, d: DatosExpediente) {
  const supabase = await createClient();
  revisar(await supabase.from("expedientes").update(d).eq("id", id));
}

export type DatosDueno = Pick<Dueno, "nombre" | "rut" | "apoderado_nombre" | "apoderado_rut">;

export async function agregarDueno(expedienteId: number, d: DatosDueno) {
  const supabase = await createClient();
  revisar(await supabase.from("duenos").insert({ ...d, expediente_id: expedienteId }));
}

export async function actualizarDueno(duenoId: number, d: DatosDueno) {
  const supabase = await createClient();
  revisar(await supabase.from("duenos").update(d).eq("id", duenoId));
}

export async function quitarDueno(duenoId: number) {
  const supabase = await createClient();
  revisar(await supabase.from("duenos").delete().eq("id", duenoId));
}

/** Elimina el expediente con todo lo suyo. Devuelve sus archivos propios (para borrarlos). */
export async function eliminarExpediente(id: number): Promise<string[]> {
  const supabase = await createClient();
  const items = revisar(await supabase.from("expediente_items").select("archivo_path").eq("expediente_id", id)) as { archivo_path: string | null }[];
  revisar(await supabase.from("expedientes").delete().eq("id", id));
  return items.map((i) => i.archivo_path).filter((p): p is string => !!p && p.startsWith(`expedientes/${id}/`));
}
