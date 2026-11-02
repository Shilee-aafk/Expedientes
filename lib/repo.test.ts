import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Base de datos temporal: se define antes de cargar el módulo
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "expedientes-test-"));
process.env.DATOS_DIR = dir;
let repo: typeof import("./repo");
let ana: number;

beforeAll(async () => {
  repo = await import("./repo");
  ana = repo.crearUsuario({ usuario: "ana", nombre: "Ana Pérez", clave: "secreta1" });
});
afterAll(async () => {
  // Cerrar la base antes de borrarla: Windows no permite borrar un archivo abierto
  (await import("./db")).cerrarDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

const anio = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date()).slice(0, 4);

describe("usuarios y sesiones", () => {
  it("verifica contraseñas y rechaza duplicados", () => {
    expect(repo.verificarCredenciales("ANA", "secreta1")).toBe(ana);
    expect(repo.verificarCredenciales("ana", "otra")).toBeNull();
    expect(() => repo.crearUsuario({ usuario: "ana", nombre: "X", clave: "123456" })).toThrow(/Ya existe/);
    expect(() => repo.crearUsuario({ usuario: "b", nombre: "B", clave: "123" })).toThrow(/6 caracteres/);
  });
  it("crea y borra sesiones", () => {
    const token = repo.crearSesion(ana);
    expect(repo.usuarioDeSesion(token)?.nombre).toBe("Ana Pérez");
    repo.borrarSesion(token);
    expect(repo.usuarioDeSesion(token)).toBeNull();
  });
  it("cambia la contraseña solo con la actual correcta", () => {
    expect(() => repo.cambiarClave(ana, "mala", "nueva123")).toThrow(/actual/);
    repo.cambiarClave(ana, "secreta1", "nueva123");
    expect(repo.verificarCredenciales("ana", "nueva123")).toBe(ana);
  });
});

describe("expedientes", () => {
  it("la plantilla inicial trae los 13 requisitos bien escritos", () => {
    const r = repo.listarRequisitos();
    expect(r).toHaveLength(13);
    expect(r[0].nombre).toBe("Carnet dueño/s");
    expect(r.find((x) => x.orden === 8)?.cantidad).toBe(7);
  });

  it("asigna códigos correlativos y arma el checklist con los documentos del creador", () => {
    repo.guardarDocumentoPerfil(ana, "carnet_path", "perfiles/1/carnet.pdf");
    const a = repo.crearExpediente(ana, { predio: "Fundo A", rol_sii: null, comuna: null, notas: null }, [{ nombre: "Juan", rut: null }]);
    const b = repo.crearExpediente(ana, { predio: "Fundo B", rol_sii: null, comuna: null, notas: null }, []);
    const da = repo.cargarExpediente(a)!;
    expect(da.expediente.codigo).toBe(`EXP-001-${anio}`);
    expect(repo.cargarExpediente(b)!.expediente.codigo).toBe(`EXP-002-${anio}`);
    expect(da.items).toHaveLength(13);
    expect(da.duenos).toHaveLength(1);
    const carnet = da.items.find((i) => i.nombre === "Carnet profesional")!;
    expect(carnet.estado).toBe("listo");
    expect(carnet.archivo_path).toBe("perfiles/1/carnet.pdf");
    expect(da.historial[0].accion).toBe("Expediente creado");
  });

  it("registra los cambios del checklist en el historial", () => {
    const id = repo.listarExpedientes().find((e) => e.predio === "Fundo A")!.id;
    const planos = repo.cargarExpediente(id)!.items.find((i) => i.cantidad_requerida === 7)!;
    repo.actualizarItem(ana, planos.id, { cantidad_entregada: 3, estado: "pendiente" });
    const h = repo.cargarExpediente(id)!.historial[0];
    expect(h.accion).toBe("Planos firmados con lápiz tinta azul — cantidad: 3/7");
    expect(h.usuario?.nombre).toBe("Ana Pérez");
  });

  it("no deja marcar listo para enviar con requisitos pendientes", () => {
    const id = repo.listarExpedientes().find((e) => e.predio === "Fundo B")!.id;
    expect(repo.cambiarEstado(ana, id, "listo_para_enviar")).toMatch(/Faltan requisitos/);
    expect(repo.cambiarEstado(ana, id, "en_revision")).toBeNull();
    expect(repo.cargarExpediente(id)!.expediente.estado).toBe("en_revision");
  });

  it("eliminar un requisito de la plantilla no toca los expedientes creados", () => {
    const notarial = repo.listarRequisitos().find((r) => r.nombre === "Poder notarial")!;
    repo.eliminarRequisito(notarial.id);
    expect(repo.listarRequisitos()).toHaveLength(12);
    const id = repo.listarExpedientes()[0].id;
    expect(repo.cargarExpediente(id)!.items.some((i) => i.nombre === "Poder notarial")).toBe(true);
  });

  it("eliminar el expediente borra su checklist, dueños e historial", () => {
    const id = repo.listarExpedientes().find((e) => e.predio === "Fundo A")!.id;
    repo.eliminarExpediente(id);
    expect(repo.cargarExpediente(id)).toBeNull();
  });
});
