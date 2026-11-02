import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Base local de la versión anterior en una carpeta temporal (se define antes de cargar los módulos)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "expedientes-migracion-"));
process.env.DATOS_DIR = dir;
let mig: typeof import("./migracion");
let ids: { ana: number; rosa: number; expediente: number };

beforeAll(async () => {
  const local = await import("./local/repo");
  const ana = local.crearUsuario({ usuario: "Ana", nombre: "Ana Pérez", clave: "secreta1" });
  const rosa = local.crearUsuario({ usuario: "rosa", nombre: "Rosa Vera", clave: "secreta2" });
  local.guardarDocumentoPerfil(ana, "carnet_path", `perfiles/${ana}/1-carnet.pdf`);
  const expediente = local.crearExpediente(ana, { predio: "Fundo Local", rol_sii: "12-3", comuna: "Paine", notas: null }, [
    { nombre: "María Soto", rut: "11.111.111-1" },
  ]);
  const { items } = local.cargarExpediente(expediente)!;
  const planos = items.find((i) => i.cantidad_requerida === 7)!;
  local.actualizarItem(rosa, planos.id, { cantidad_entregada: 4, estado: "pendiente", archivo_path: `expedientes/${expediente}/${planos.id}/1-plano.pdf` });
  local.cambiarEstado(ana, expediente, "en_revision");
  // Archivos en disco
  for (const rel of [`perfiles/${ana}/1-carnet.pdf`, `expedientes/${expediente}/${planos.id}/1-plano.pdf`]) {
    fs.mkdirSync(path.join(dir, "archivos", path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, "archivos", rel), "%PDF-1.4 prueba");
  }
  ids = { ana, rosa, expediente };
  mig = await import("./migracion");
});

afterAll(async () => {
  (await import("./local/db")).cerrarDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("migración de datos locales", () => {
  it("detecta los datos pendientes de subir", () => {
    const r = mig.resumenLocal();
    expect(r).toMatchObject({ usuarios: 2, expedientes: 1 });
    expect(r!.nombres.map((n) => n.usuario)).toEqual(["Ana", "rosa"]);
  });

  it("lista los archivos adjuntos", () => {
    expect(mig.archivosLocales().sort()).toEqual(
      [`expedientes/${ids.expediente}/` + mig.leerDatosLocales().items.find((i) => i.cantidad_requerida === 7)!.id + "/1-plano.pdf", `perfiles/${ids.ana}/1-carnet.pdf`].sort(),
    );
  });

  it("cambia los ids de usuario por uuid y las rutas de perfil", () => {
    const uuid = new Map([
      [ids.ana, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      [ids.rosa, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    ]);
    const p = mig.prepararDatos(mig.leerDatosLocales(), uuid);
    const e = p.expedientes[0];
    expect(e.codigo).toMatch(/^EXP-001-\d{4}$/);
    expect(e.profesional_id).toBe(uuid.get(ids.ana));
    expect(e.estado).toBe("en_revision");
    const planos = p.items.find((i) => i.cantidad_requerida === 7)!;
    expect(planos.actualizado_por).toBe(uuid.get(ids.rosa));
    expect(planos.opcional).toBe(false);
    const carnet = p.items.find((i) => i.nombre === "Carnet profesional")!;
    expect(carnet.archivo_path).toBe(`perfiles/${uuid.get(ids.ana)}/1-carnet.pdf`);
    expect(p.perfiles.find((x) => x.id === uuid.get(ids.ana))!.carnet_path).toBe(`perfiles/${uuid.get(ids.ana)}/1-carnet.pdf`);
    expect(p.historial.map((h) => h.usuario_id)).toContain(uuid.get(ids.rosa));
    expect(p.requisitos).toHaveLength(13);
    // Para la prueba de importación en Postgres (scripts de verificación)
    if (process.env.GUARDAR_PAYLOAD) fs.writeFileSync(process.env.GUARDAR_PAYLOAD, JSON.stringify(p));
  });

  it("no ofrece migrar de nuevo una vez marcada", () => {
    fs.writeFileSync(path.join(dir, "migrado-a-supabase.json"), "{}");
    expect(mig.resumenLocal()).toBeNull();
    fs.rmSync(path.join(dir, "migrado-a-supabase.json"));
  });
});
