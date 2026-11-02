/**
 * Migración de la versión de escritorio 0.1.x (base SQLite local + archivos en disco) a
 * Supabase. Sube usuarios, plantilla, expedientes (mismos números y códigos), checklist,
 * dueños, historial y archivos. Los datos locales NO se borran: quedan como respaldo y se
 * deja una marca para no volver a ofrecer la migración.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { BUCKET } from "./archivos";
import { DIR_ARCHIVOS, DIR_DATOS } from "./local/db";
import { iniciarSesion } from "./sesion";
import { createClient } from "./supabase/server";

const ARCHIVO_DB = () => path.join(DIR_DATOS, "expedientes.db");
const MARCA = () => path.join(DIR_DATOS, "migrado-a-supabase.json");

type Fila = Record<string, unknown>;
export type ResumenLocal = { usuarios: number; expedientes: number; nombres: { usuario: string; nombre: string }[] };

function abrir(): DatabaseSync | null {
  if (!fs.existsSync(ARCHIVO_DB())) return null;
  return new DatabaseSync(ARCHIVO_DB());
}

/** Datos locales pendientes de migrar (null si no hay o ya se migraron). */
export function resumenLocal(): ResumenLocal | null {
  if (fs.existsSync(MARCA())) return null;
  let db: DatabaseSync | null = null;
  try {
    db = abrir();
    if (!db) return null;
    const contar = (t: string) => (db!.prepare(`select count(*) as n from ${t}`).get() as { n: number }).n;
    const usuarios = contar("usuarios");
    const expedientes = contar("expedientes");
    if (!usuarios && !expedientes) return null;
    // Objetos normales: las filas de node:sqlite no tienen prototipo y Next no las acepta en componentes de cliente
    const nombres = (db.prepare("select usuario, nombre from usuarios order by id").all() as { usuario: string; nombre: string }[]).map(
      (n) => ({ usuario: String(n.usuario), nombre: String(n.nombre) }),
    );
    return { usuarios, expedientes, nombres };
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

const bool = (v: unknown) => v === 1 || v === true;

/** Lee todo lo que hay en la base local. */
export function leerDatosLocales() {
  const db = abrir();
  if (!db) throw new Error("No hay datos locales en este equipo.");
  try {
    const todo = (sql: string) => db.prepare(sql).all() as Fila[];
    return {
      usuarios: todo("select id, usuario, nombre, rut, carnet_path, titulo_path, created_at from usuarios order by id"),
      requisitos: todo("select * from requisitos_plantilla order by id").map((r) => ({
        ...r,
        opcional: bool(r.opcional),
        por_dueno: bool(r.por_dueno),
        activo: bool(r.activo),
      }) as Fila),
      expedientes: todo("select * from expedientes order by id"),
      duenos: todo("select * from duenos order by id"),
      items: todo("select * from expediente_items order by id").map((r) => ({ ...r, opcional: bool(r.opcional), por_dueno: bool(r.por_dueno) }) as Fila),
      historial: todo("select * from historial order by id"),
      correlativos: todo("select * from correlativos"),
    };
  } finally {
    db.close();
  }
}

/** Archivos adjuntos locales (rutas relativas a la carpeta de archivos). */
export function archivosLocales(): string[] {
  if (!fs.existsSync(DIR_ARCHIVOS)) return [];
  return (fs.readdirSync(DIR_ARCHIVOS, { recursive: true }) as string[])
    .map((r) => r.split(path.sep).join("/"))
    .filter((r) => fs.statSync(path.join(DIR_ARCHIVOS, r)).isFile());
}

/**
 * Arma lo que se envía a importar_datos: cambia los ids numéricos de usuario por los uuid
 * de Supabase y las rutas perfiles/<id> por perfiles/<uuid>.
 */
export function prepararDatos(local: ReturnType<typeof leerDatosLocales>, uuidDe: Map<number, string>) {
  const u = (id: unknown) => (typeof id === "number" ? (uuidDe.get(id) ?? null) : null);
  const ruta = (p: unknown) => (typeof p === "string" ? rutaRemota(p, uuidDe) : null);
  return {
    requisitos: local.requisitos,
    expedientes: local.expedientes.map((e) => ({ ...e, profesional_id: u(e.profesional_id), created_by: u(e.created_by) }) as Fila),
    duenos: local.duenos,
    items: local.items.map((i) => ({ ...i, actualizado_por: u(i.actualizado_por), archivo_path: ruta(i.archivo_path) }) as Fila),
    historial: local.historial.map((h) => ({ ...h, usuario_id: u(h.usuario_id) }) as Fila),
    correlativos: local.correlativos,
    perfiles: local.usuarios
      .filter((x) => uuidDe.has(x.id as number))
      .map((x) => ({
        id: uuidDe.get(x.id as number),
        rut: x.rut,
        carnet_path: ruta(x.carnet_path),
        titulo_path: ruta(x.titulo_path),
        created_at: x.created_at,
      })),
  };
}

/** perfiles/<id local>/... → perfiles/<uuid>/... (las de expedientes conservan su ruta). */
export function rutaRemota(p: string, uuidDe: Map<number, string>): string {
  const m = /^perfiles\/(\d+)\/(.+)$/.exec(p);
  if (!m) return p;
  const uuid = uuidDe.get(Number(m[1]));
  return uuid ? `perfiles/${uuid}/${m[2]}` : p;
}

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".kmz": "application/vnd.google-earth.kmz",
  ".kml": "application/vnd.google-earth.kml+xml",
  ".zip": "application/zip",
};

export type ResultadoMigracion = { usuarios: number; expedientes: number; archivos: number; avisos: string[] };

/**
 * Ejecuta la migración. `admin` es el usuario local de quien migra; todos los usuarios
 * quedan con la contraseña temporal `clave` (cada uno la cambia después en Mi perfil).
 * Se puede reintentar: lo que ya se subió no se duplica.
 */
export async function migrar(admin: string, clave: string): Promise<ResultadoMigracion> {
  if (clave.length < 6) throw new Error("La contraseña temporal debe tener al menos 6 caracteres.");
  const local = leerDatosLocales();
  const adminLocal = local.usuarios.find((x) => String(x.usuario).toLowerCase() === admin.trim().toLowerCase());
  if (!adminLocal) throw new Error("Elige tu usuario de la lista.");
  const supabase = await createClient();
  const avisos: string[] = [];

  // 1. Usuarios
  const { data: estado, error: e1 } = await supabase.rpc("estado_base");
  if (e1) throw new Error(`No se pudo conectar con Supabase: ${e1.message}`);
  const { usuarios: usuariosRemotos, expedientes: expedientesRemotos } = estado as { usuarios: number; expedientes: number };
  if (usuariosRemotos === 0) {
    const { error } = await supabase.rpc("importar_usuarios", {
      p_usuarios: local.usuarios.map((x) => ({ usuario: x.usuario, nombre: x.nombre })),
      p_clave: clave,
    });
    if (error) throw new Error(`No se pudieron crear los usuarios: ${error.message}`);
  }
  const errorSesion = await iniciarSesion(String(adminLocal.usuario), clave);
  if (errorSesion) {
    throw new Error(
      usuariosRemotos > 0
        ? `Supabase ya tiene usuarios. Escribe la contraseña actual de «${adminLocal.usuario}» en Supabase.`
        : errorSesion,
    );
  }
  const { data: perfiles, error: e2 } = await supabase.from("profiles").select("id, usuario");
  if (e2) throw new Error(e2.message);
  const uuidPorUsuario = new Map((perfiles as { id: string; usuario: string }[]).map((p) => [p.usuario.toLowerCase(), p.id]));
  for (const x of local.usuarios) {
    if (uuidPorUsuario.has(String(x.usuario).toLowerCase())) continue;
    const { data: nuevo, error } = await supabase.rpc("crear_usuario", { p_usuario: x.usuario, p_nombre: x.nombre, p_clave: clave });
    if (error) avisos.push(`No se pudo crear el usuario «${x.usuario}»: ${error.message}`);
    else uuidPorUsuario.set(String(x.usuario).toLowerCase(), nuevo as string);
  }
  const uuidDe = new Map<number, string>();
  for (const x of local.usuarios) {
    const uuid = uuidPorUsuario.get(String(x.usuario).toLowerCase());
    if (uuid) uuidDe.set(x.id as number, uuid);
  }

  // 2. Archivos (con upsert: reintentar no duplica)
  let subidos = 0;
  for (const rel of archivosLocales()) {
    const destino = rutaRemota(rel, uuidDe);
    const contenido = fs.readFileSync(path.join(DIR_ARCHIVOS, rel));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(destino, contenido, { upsert: true, contentType: TIPOS[path.extname(rel).toLowerCase()] ?? "application/octet-stream" });
    if (error) avisos.push(`Archivo «${rel}»: ${error.message}`);
    else subidos++;
  }

  // 3. Datos (una sola transacción en la base)
  if (expedientesRemotos === 0) {
    const { error } = await supabase.rpc("importar_datos", { p: prepararDatos(local, uuidDe) });
    if (error) throw new Error(`No se pudieron importar los datos: ${error.message}`);
  } else if (expedientesRemotos !== local.expedientes.length) {
    throw new Error(
      `Supabase ya tiene ${expedientesRemotos} expediente(s) que no vienen de este equipo. ` +
        "Si son de prueba, bórralos con supabase/limpiar-datos-de-prueba.sql y vuelve a intentar.",
    );
  }

  // 4. Marca de migración (los datos locales se conservan como respaldo)
  const resultado = { usuarios: uuidDe.size, expedientes: local.expedientes.length, archivos: subidos, avisos };
  fs.writeFileSync(MARCA(), JSON.stringify({ fecha: new Date().toISOString(), ...resultado }, null, 2));
  return resultado;
}
