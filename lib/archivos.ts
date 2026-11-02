import { createClient } from "./supabase/server";

/** Bucket privado de Supabase Storage con todos los adjuntos. */
export const BUCKET = "documentos";

/** Carpetas válidas para adjuntos: expedientes/<id>/<item> o perfiles/<usuario>. */
const CARPETA_VALIDA = /^(expedientes\/\d+\/\d+|perfiles\/[0-9a-f-]{36})$/;

export function nombreLimpio(nombre: string) {
  return nombre.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-120) || "archivo";
}

export async function guardarArchivo(carpeta: string, archivo: File): Promise<string> {
  if (!CARPETA_VALIDA.test(carpeta)) throw new Error("Carpeta inválida");
  const ruta = `${carpeta}/${Date.now()}-${nombreLimpio(archivo.name)}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type || undefined });
  if (error) throw new Error(error.message);
  return ruta;
}

/** Enlace temporal para ver un adjunto privado. */
export async function enlaceArchivo(ruta: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 120);
  return data?.signedUrl ?? null;
}

export async function borrarArchivos(rutas: (string | null | undefined)[]) {
  const validas = rutas.filter((r): r is string => !!r);
  if (!validas.length) return;
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove(validas);
}
