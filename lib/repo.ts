/**
 * Acceso a datos. Funciones puras sobre SQLite (sin Next.js), así se pueden probar directamente.
 * Quien llama ya verificó la sesión y pasa el id del usuario cuando hace falta.
 */
import { hashClave, nuevoToken, verificarClave } from "./clave";
import { hoyChile, requiereChecklistCompleto, resumen } from "./checklist";
import { db, transaccion } from "./db";
import type { Dueno, EstadoExpediente, EstadoItem, Expediente, Item, Profile, Requisito } from "./types";

type Fila = Record<string, unknown>;
const bool = (v: unknown) => v === 1 || v === true;
const num = (v: boolean | undefined) => (v ? 1 : 0);

const aItem = (r: Fila) => ({ ...r, opcional: bool(r.opcional), por_dueno: bool(r.por_dueno) }) as unknown as Item;
const aRequisito = (r: Fila) =>
  ({ ...r, opcional: bool(r.opcional), por_dueno: bool(r.por_dueno), activo: bool(r.activo) }) as unknown as Requisito;
const aExpediente = (r: Fila) => ({ ...r }) as unknown as Expediente;
const aUsuario = (r: Fila) => ({ ...r }) as unknown as Profile;

const COLUMNAS_USUARIO = "id, usuario, nombre, rut, carnet_path, titulo_path";

function registrar(expedienteId: number, usuarioId: number | null, accion: string) {
  db().prepare("insert into historial (expediente_id, usuario_id, accion) values (?, ?, ?)").run(expedienteId, usuarioId, accion);
}

/* ─── Usuarios y sesiones ─────────────────────────────────────────── */

export const DURACION_SESION_DIAS = 30;

export function contarUsuarios(): number {
  return (db().prepare("select count(*) as n from usuarios").get() as { n: number }).n;
}

export function listarUsuarios(): Profile[] {
  return db().prepare(`select ${COLUMNAS_USUARIO} from usuarios order by nombre collate nocase`).all().map(aUsuario);
}

export function obtenerUsuario(id: number): Profile | null {
  const r = db().prepare(`select ${COLUMNAS_USUARIO} from usuarios where id = ?`).get(id);
  return r ? aUsuario(r) : null;
}

export function crearUsuario(datos: { usuario: string; nombre: string; clave: string }): number {
  const usuario = datos.usuario.trim();
  if (!usuario || !datos.nombre.trim()) throw new Error("Falta el usuario o el nombre.");
  if (datos.clave.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  try {
    const r = db()
      .prepare("insert into usuarios (usuario, nombre, hash) values (?, ?, ?)")
      .run(usuario, datos.nombre.trim(), hashClave(datos.clave));
    return Number(r.lastInsertRowid);
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new Error("Ya existe un usuario con ese nombre de usuario.");
    throw e;
  }
}

/** ¿Algún expediente usa este archivo? (los documentos de perfil se comparten) */
export function archivoEnUso(path: string): boolean {
  return !!db().prepare("select 1 from expediente_items where archivo_path = ? limit 1").get(path);
}

export function eliminarUsuario(id: number) {
  db().prepare("delete from usuarios where id = ?").run(id);
}

export function actualizarPerfil(id: number, datos: { nombre: string; rut: string | null }) {
  db().prepare("update usuarios set nombre = ?, rut = ? where id = ?").run(datos.nombre, datos.rut, id);
}

export function guardarDocumentoPerfil(id: number, campo: "carnet_path" | "titulo_path", path: string | null) {
  db().prepare(`update usuarios set ${campo === "carnet_path" ? "carnet_path" : "titulo_path"} = ? where id = ?`).run(path, id);
}

export function cambiarClave(id: number, actual: string, nueva: string) {
  const r = db().prepare("select hash from usuarios where id = ?").get(id) as { hash: string } | undefined;
  if (!r || !verificarClave(actual, r.hash)) throw new Error("La contraseña actual no es correcta.");
  if (nueva.length < 6) throw new Error("La contraseña nueva debe tener al menos 6 caracteres.");
  db().prepare("update usuarios set hash = ? where id = ?").run(hashClave(nueva), id);
}

/** Devuelve el id del usuario si las credenciales son correctas. */
export function verificarCredenciales(usuario: string, clave: string): number | null {
  const r = db().prepare("select id, hash from usuarios where usuario = ?").get(usuario.trim()) as
    | { id: number; hash: string }
    | undefined;
  return r && verificarClave(clave, r.hash) ? r.id : null;
}

export function crearSesion(usuarioId: number): string {
  const token = nuevoToken();
  const expira = new Date(Date.now() + DURACION_SESION_DIAS * 86_400_000).toISOString();
  db().prepare("delete from sesiones where expira < ?").run(new Date().toISOString());
  db().prepare("insert into sesiones (token, usuario_id, expira) values (?, ?, ?)").run(token, usuarioId, expira);
  return token;
}

export function usuarioDeSesion(token: string): Profile | null {
  const r = db()
    .prepare(
      `select u.id, u.usuario, u.nombre, u.rut, u.carnet_path, u.titulo_path
       from sesiones s join usuarios u on u.id = s.usuario_id
       where s.token = ? and s.expira > ?`,
    )
    .get(token, new Date().toISOString());
  return r ? aUsuario(r) : null;
}

export function borrarSesion(token: string) {
  db().prepare("delete from sesiones where token = ?").run(token);
}

/* ─── Plantilla ───────────────────────────────────────────────────── */

export type DatosRequisito = Omit<Requisito, "id">;

export function listarRequisitos(): Requisito[] {
  return db().prepare("select * from requisitos_plantilla order by orden, id").all().map(aRequisito);
}

export function guardarRequisito(id: number | null, d: DatosRequisito) {
  const valores = [d.orden, d.nombre, d.descripcion, num(d.opcional), d.cantidad, num(d.por_dueno), d.vence_en_dias, d.origen_perfil, num(d.activo)];
  if (id) {
    db()
      .prepare(
        `update requisitos_plantilla set orden = ?, nombre = ?, descripcion = ?, opcional = ?, cantidad = ?,
         por_dueno = ?, vence_en_dias = ?, origen_perfil = ?, activo = ? where id = ?`,
      )
      .run(...valores, id);
  } else {
    db()
      .prepare(
        `insert into requisitos_plantilla (orden, nombre, descripcion, opcional, cantidad, por_dueno, vence_en_dias, origen_perfil, activo)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(...valores);
  }
}

/** Los expedientes ya creados conservan su copia del requisito. */
export function eliminarRequisito(id: number) {
  db().prepare("delete from requisitos_plantilla where id = ?").run(id);
}

/* ─── Expedientes ─────────────────────────────────────────────────── */

export type FilaListado = Expediente & { items: Item[]; duenos: { nombre: string }[]; profesional: { nombre: string } | null };

export function listarExpedientes(): FilaListado[] {
  const expedientes = db()
    .prepare("select e.*, u.nombre as profesional_nombre from expedientes e left join usuarios u on u.id = e.profesional_id order by e.updated_at desc")
    .all();
  const items = db().prepare("select * from expediente_items order by orden").all().map(aItem);
  const duenos = db().prepare("select expediente_id, nombre from duenos order by id").all() as { expediente_id: number; nombre: string }[];
  return expedientes.map((r) => {
    const { profesional_nombre, ...e } = r;
    return {
      ...aExpediente(e),
      items: items.filter((i) => i.expediente_id === e.id),
      duenos: duenos.filter((d) => d.expediente_id === e.id),
      profesional: profesional_nombre ? { nombre: String(profesional_nombre) } : null,
    };
  });
}

export type HistorialFila = { id: number; accion: string; created_at: string; usuario: { nombre: string } | null };

export function cargarExpediente(id: number) {
  const e = db().prepare("select * from expedientes where id = ?").get(id);
  if (!e) return null;
  const historial = db()
    .prepare(
      `select h.id, h.accion, h.created_at, u.nombre as usuario_nombre
       from historial h left join usuarios u on u.id = h.usuario_id
       where h.expediente_id = ? order by h.created_at desc, h.id desc limit 50`,
    )
    .all(id)
    .map((h) => ({
      id: Number(h.id),
      accion: String(h.accion),
      created_at: String(h.created_at),
      usuario: h.usuario_nombre ? { nombre: String(h.usuario_nombre) } : null,
    }));
  return {
    expediente: aExpediente(e),
    items: db().prepare("select * from expediente_items where expediente_id = ? order by orden, id").all(id).map(aItem),
    duenos: db().prepare("select * from duenos where expediente_id = ? order by id").all(id) as unknown as Dueno[],
    historial: historial as HistorialFila[],
    perfiles: listarUsuarios(),
  };
}

/** Código correlativo por año: EXP-001-2026, EXP-002-2026, … */
export function siguienteCodigo(anio: number): string {
  const { ultimo } = db()
    .prepare("insert into correlativos (anio, ultimo) values (?, 1) on conflict (anio) do update set ultimo = ultimo + 1 returning ultimo")
    .get(anio) as { ultimo: number };
  return `EXP-${String(ultimo).padStart(3, "0")}-${anio}`;
}

export type DatosNuevoExpediente = { predio: string; rol_sii: string | null; comuna: string | null; notas: string | null };

/** Crea el expediente con su código, copia la plantilla al checklist y adjunta los documentos del creador. */
export function crearExpediente(usuarioId: number, d: DatosNuevoExpediente, duenos: { nombre: string; rut: string | null }[]): number {
  return transaccion(() => {
    const codigo = siguienteCodigo(Number(hoyChile().slice(0, 4)));
    const id = Number(
      db()
        .prepare("insert into expedientes (codigo, predio, rol_sii, comuna, notas, profesional_id, created_by) values (?, ?, ?, ?, ?, ?, ?)")
        .run(codigo, d.predio, d.rol_sii, d.comuna, d.notas, usuarioId, usuarioId).lastInsertRowid,
    );

    const perfil = obtenerUsuario(usuarioId);
    const insItem = db().prepare(
      `insert into expediente_items (expediente_id, requisito_id, orden, nombre, descripcion, opcional, cantidad_requerida,
       por_dueno, vence_en_dias, estado, cantidad_entregada, archivo_path) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of listarRequisitos().filter((r) => r.activo)) {
      const doc = r.origen_perfil === "carnet" ? perfil?.carnet_path : r.origen_perfil === "titulo" ? perfil?.titulo_path : null;
      insItem.run(id, r.id, r.orden, r.nombre, r.descripcion, num(r.opcional), r.cantidad, num(r.por_dueno), r.vence_en_dias,
        doc ? "listo" : "pendiente", doc ? r.cantidad : 0, doc ?? null);
    }

    const insDueno = db().prepare("insert into duenos (expediente_id, nombre, rut) values (?, ?, ?)");
    for (const du of duenos) insDueno.run(id, du.nombre, du.rut);

    registrar(id, usuarioId, "Expediente creado");
    return id;
  });
}

export type CambioItem = Partial<Pick<Item, "cantidad_entregada" | "fecha_emision" | "comentario" | "archivo_path">> & {
  estado?: EstadoItem;
};

const CAMPOS_ITEM = ["estado", "cantidad_entregada", "fecha_emision", "comentario", "archivo_path"] as const;

/** Actualiza un requisito del checklist y deja constancia en el historial. */
export function actualizarItem(usuarioId: number, id: number, cambio: CambioItem): { expedienteId: number; archivoAnterior: string | null } {
  return transaccion(() => {
    const antes = db().prepare("select * from expediente_items where id = ?").get(id);
    if (!antes) throw new Error("El requisito ya no existe.");
    const campos = CAMPOS_ITEM.filter((c) => c in cambio);
    const sets = [...campos.map((c) => `${c} = ?`), "actualizado_por = ?", "actualizado_at = ?"].join(", ");
    db()
      .prepare(`update expediente_items set ${sets} where id = ?`)
      .run(...campos.map((c) => cambio[c] ?? null), usuarioId, new Date().toISOString(), id);

    const despues = { ...antes, ...cambio } as Fila;
    const cambios: string[] = [];
    if (despues.estado !== antes.estado) cambios.push(`estado: ${antes.estado} → ${despues.estado}`);
    if (despues.cantidad_entregada !== antes.cantidad_entregada) cambios.push(`cantidad: ${despues.cantidad_entregada}/${antes.cantidad_requerida}`);
    if ((despues.fecha_emision ?? null) !== antes.fecha_emision) cambios.push(`emisión: ${despues.fecha_emision ?? "—"}`);
    if ((despues.archivo_path ?? null) !== antes.archivo_path) cambios.push(despues.archivo_path ? "archivo adjuntado" : "archivo quitado");
    if ((despues.comentario ?? null) !== antes.comentario) cambios.push("comentario editado");
    const expedienteId = Number(antes.expediente_id);
    if (cambios.length) registrar(expedienteId, usuarioId, `${antes.nombre} — ${cambios.join(", ")}`);
    db().prepare("update expedientes set updated_at = ? where id = ?").run(new Date().toISOString(), expedienteId);
    return { expedienteId, archivoAnterior: (antes.archivo_path as string | null) ?? null };
  });
}

/** Quita un requisito solo de este expediente. Devuelve el archivo que tenía (para borrarlo). */
export function eliminarItem(usuarioId: number, id: number) {
  return transaccion(() => {
    const r = db().prepare("select expediente_id, nombre, archivo_path from expediente_items where id = ?").get(id);
    if (!r) throw new Error("El requisito ya no existe.");
    db().prepare("delete from expediente_items where id = ?").run(id);
    registrar(Number(r.expediente_id), usuarioId, `${r.nombre} — quitado del expediente`);
    return { expedienteId: Number(r.expediente_id), archivo: (r.archivo_path as string | null) ?? null };
  });
}

/** Cambia el estado. Devuelve un mensaje de error si faltan requisitos, o null. */
export function cambiarEstado(usuarioId: number, id: number, estado: EstadoExpediente): string | null {
  const e = db().prepare("select estado, fecha_envio from expedientes where id = ?").get(id);
  if (!e) return "El expediente ya no existe.";
  if (requiereChecklistCompleto(estado)) {
    const { items, duenos } = cargarExpediente(id)!;
    const r = resumen(items, duenos.length, hoyChile());
    if (!r.listoParaEnviar) {
      return "Faltan requisitos o hay certificados vencidos: " + [...r.pendientes, ...r.vencidos].map((i) => i.nombre).join(", ");
    }
  }
  if (e.estado === estado) return null;
  transaccion(() => {
    const fechaEnvio = estado === "enviado" && !e.fecha_envio ? hoyChile() : e.fecha_envio;
    db().prepare("update expedientes set estado = ?, fecha_envio = ?, updated_at = ? where id = ?").run(estado, fechaEnvio as string | null, new Date().toISOString(), id);
    registrar(id, usuarioId, `Estado del expediente: ${e.estado} → ${estado}`);
  });
  return null;
}

export type DatosExpediente = Pick<
  Expediente,
  "predio" | "rol_sii" | "comuna" | "tercero_autorizado" | "fecha_envio" | "fecha_respuesta" | "observaciones" | "notas"
>;

export function guardarDatos(id: number, d: DatosExpediente) {
  db()
    .prepare(
      `update expedientes set predio = ?, rol_sii = ?, comuna = ?, tercero_autorizado = ?, fecha_envio = ?,
       fecha_respuesta = ?, observaciones = ?, notas = ?, updated_at = ? where id = ?`,
    )
    .run(d.predio, d.rol_sii, d.comuna, d.tercero_autorizado, d.fecha_envio, d.fecha_respuesta, d.observaciones, d.notas, new Date().toISOString(), id);
}

export function agregarDueno(expedienteId: number, nombre: string, rut: string | null) {
  db().prepare("insert into duenos (expediente_id, nombre, rut) values (?, ?, ?)").run(expedienteId, nombre, rut);
}

export function quitarDueno(duenoId: number) {
  db().prepare("delete from duenos where id = ?").run(duenoId);
}

/** Elimina el expediente con todo lo suyo (el borrado de archivos lo hace quien llama). */
export function eliminarExpediente(id: number) {
  db().prepare("delete from expedientes where id = ?").run(id);
}
