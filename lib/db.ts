import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Carpeta de datos: la base y los archivos adjuntos. Respaldar = copiar esta carpeta. */
export const DIR_DATOS = path.resolve(process.env.DATOS_DIR ?? path.join(process.cwd(), "datos"));
export const DIR_ARCHIVOS = path.join(DIR_DATOS, "archivos");

const AHORA = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

const ESQUEMA = `
create table if not exists usuarios (
  id integer primary key,
  usuario text not null unique collate nocase,
  nombre text not null,
  rut text,
  hash text not null,
  carnet_path text,
  titulo_path text,
  created_at text not null default ${AHORA}
);

create table if not exists sesiones (
  token text primary key,
  usuario_id integer not null references usuarios (id) on delete cascade,
  expira text not null
);

create table if not exists requisitos_plantilla (
  id integer primary key,
  orden integer not null default 0,
  nombre text not null,
  descripcion text,
  opcional integer not null default 0,
  cantidad integer not null default 1 check (cantidad >= 1),
  por_dueno integer not null default 0,
  vence_en_dias integer check (vence_en_dias > 0),
  origen_perfil text check (origen_perfil in ('carnet', 'titulo')),
  activo integer not null default 1,
  created_at text not null default ${AHORA}
);

create table if not exists correlativos (
  anio integer primary key,
  ultimo integer not null default 0
);

create table if not exists expedientes (
  id integer primary key,
  codigo text not null unique,
  predio text not null,
  rol_sii text,
  comuna text,
  profesional_id integer references usuarios (id) on delete set null,
  estado text not null default 'borrador' check (estado in
    ('borrador', 'en_revision', 'listo_para_enviar', 'enviado', 'observado', 'aprobado')),
  tercero_autorizado text,
  fecha_envio text,
  fecha_respuesta text,
  observaciones text,
  notas text,
  created_by integer references usuarios (id) on delete set null,
  created_at text not null default ${AHORA},
  updated_at text not null default ${AHORA}
);

create table if not exists duenos (
  id integer primary key,
  expediente_id integer not null references expedientes (id) on delete cascade,
  nombre text not null,
  rut text
);
create index if not exists duenos_expediente on duenos (expediente_id);

create table if not exists expediente_items (
  id integer primary key,
  expediente_id integer not null references expedientes (id) on delete cascade,
  requisito_id integer references requisitos_plantilla (id) on delete set null,
  orden integer not null default 0,
  nombre text not null,
  descripcion text,
  opcional integer not null default 0,
  cantidad_requerida integer not null default 1,
  por_dueno integer not null default 0,
  vence_en_dias integer,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'listo', 'no_aplica')),
  cantidad_entregada integer not null default 0 check (cantidad_entregada >= 0),
  fecha_emision text,
  comentario text,
  archivo_path text,
  actualizado_por integer references usuarios (id) on delete set null,
  actualizado_at text
);
create index if not exists items_expediente on expediente_items (expediente_id);

create table if not exists historial (
  id integer primary key,
  expediente_id integer not null references expedientes (id) on delete cascade,
  usuario_id integer references usuarios (id) on delete set null,
  accion text not null,
  created_at text not null default ${AHORA}
);
create index if not exists historial_expediente on historial (expediente_id, created_at desc);
`;

/** Requisitos para el envío a terceros autorizados (lista original en papel). */
const REQUISITOS_INICIALES: [string, { opcional?: 1; cantidad?: number; por_dueno?: 1; vence_en_dias?: number; origen_perfil?: string }][] = [
  ["Carnet dueño/s", { por_dueno: 1 }],
  ["Certificado de ruralidad", {}],
  ["Certificado de hipotecas y gravámenes", { vence_en_dias: 30 }],
  ["Certificado de dominio vigente", { vence_en_dias: 30 }],
  ["Avalúo fiscal detallado", { vence_en_dias: 30 }],
  ["Carnet profesional", { origen_perfil: "carnet" }],
  ["Título del profesional legalizado", { origen_perfil: "titulo" }],
  ["Planos firmados con lápiz tinta azul", { cantidad: 7 }],
  ["Pendrive con KMZ", {}],
  ["Plano archivado", {}],
  ["Minuta archivada", {}],
  ["Formulario SPR", {}],
  ["Poder notarial", { opcional: 1 }],
];

function preparar(db: DatabaseSync) {
  db.exec("pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 5000;");
  db.exec(ESQUEMA);
  const { n } = db.prepare("select count(*) as n from requisitos_plantilla").get() as { n: number };
  if (n === 0) {
    const ins = db.prepare(
      "insert into requisitos_plantilla (orden, nombre, opcional, cantidad, por_dueno, vence_en_dias, origen_perfil) values (?, ?, ?, ?, ?, ?, ?)",
    );
    REQUISITOS_INICIALES.forEach(([nombre, o], i) =>
      ins.run(i + 1, nombre, o.opcional ?? 0, o.cantidad ?? 1, o.por_dueno ?? 0, o.vence_en_dias ?? null, o.origen_perfil ?? null),
    );
  }
}

// Una sola conexión por proceso (en desarrollo sobrevive a las recargas del código)
const global_ = globalThis as unknown as { __db?: DatabaseSync };

export function db(): DatabaseSync {
  if (!global_.__db) {
    fs.mkdirSync(DIR_ARCHIVOS, { recursive: true });
    const conexion = new DatabaseSync(path.join(DIR_DATOS, "expedientes.db"));
    preparar(conexion);
    global_.__db = conexion;
  }
  return global_.__db;
}

/** Cierra la conexión (en Windows el archivo no se puede borrar mientras esté abierto). */
export function cerrarDb() {
  global_.__db?.close();
  global_.__db = undefined;
}

/** Ejecuta fn dentro de una transacción (todo o nada). */
export function transaccion<T>(fn: () => T): T {
  const conexion = db();
  conexion.exec("begin immediate");
  try {
    const r = fn();
    conexion.exec("commit");
    return r;
  } catch (e) {
    conexion.exec("rollback");
    throw e;
  }
}
