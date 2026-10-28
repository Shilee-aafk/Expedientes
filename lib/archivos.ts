import fs from "node:fs/promises";
import path from "node:path";
import { DIR_ARCHIVOS } from "./db";

/** Carpetas válidas para adjuntos: expedientes/<id>/<item> o perfiles/<usuario>. */
const CARPETA_VALIDA = /^(expedientes\/\d+\/\d+|perfiles\/\d+)$/;

export const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".kmz": "application/vnd.google-earth.kmz",
  ".kml": "application/vnd.google-earth.kml+xml",
  ".dwg": "application/acad",
  ".zip": "application/zip",
};

/** Ruta absoluta dentro de la carpeta de archivos, o null si intenta salirse de ella. */
export function rutaSegura(relativa: string): string | null {
  const abs = path.resolve(DIR_ARCHIVOS, relativa);
  return abs.startsWith(DIR_ARCHIVOS + path.sep) ? abs : null;
}

export async function guardarArchivo(carpeta: string, archivo: File): Promise<string> {
  if (!CARPETA_VALIDA.test(carpeta)) throw new Error("Carpeta inválida");
  const limpio = archivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-120) || "archivo";
  const relativa = `${carpeta}/${Date.now()}-${limpio}`;
  const abs = rutaSegura(relativa);
  if (!abs) throw new Error("Ruta inválida");
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from(await archivo.arrayBuffer()));
  return relativa;
}

export async function borrarArchivo(relativa: string | null | undefined) {
  const abs = relativa ? rutaSegura(relativa) : null;
  if (abs) await fs.rm(abs, { force: true });
}

export async function borrarCarpeta(relativa: string) {
  const abs = rutaSegura(relativa);
  if (abs) await fs.rm(abs, { recursive: true, force: true });
}
