import { describe, expect, it } from "vitest";
import { avisos, plazo } from "./plazos";
import type { Item } from "./types";

const HOY = "2026-11-03";
const base = { fecha_envio: null, fecha_respuesta: null, updated_at: "2026-11-01T12:00:00Z", estado_desde: null };

const item = (p: Partial<Item>): Item => ({
  id: 1, expediente_id: 1, orden: 0, nombre: "Certificado de dominio vigente", descripcion: null, opcional: false,
  cantidad_requerida: 1, por_dueno: false, vence_en_dias: 30, estado: "listo", cantidad_entregada: 1,
  fecha_emision: null, comentario: null, archivo_path: null, actualizado_at: null, ...p,
});

describe("plazos", () => {
  it("cuenta los días en el estado actual", () => {
    expect(plazo({ ...base, estado: "enviado", estado_desde: "2026-10-11T15:00:00Z" }, HOY)).toEqual({
      texto: "Enviado hace 23 días", dias: 23, detenido: null,
    });
    expect(plazo({ ...base, estado: "observado", estado_desde: "2026-11-03T10:00:00Z" }, HOY).texto).toBe("En observación hoy");
  });

  it("marca detenido según el estado", () => {
    expect(plazo({ ...base, estado: "enviado", estado_desde: "2026-10-01T15:00:00Z" }, HOY).detenido).toBe("sin respuesta del tercero autorizado (33 días)");
    expect(plazo({ ...base, estado: "observado", estado_desde: "2026-10-20T15:00:00Z" }, HOY).detenido).toBe("observaciones sin corregir (14 días)");
    expect(plazo({ ...base, estado: "listo_para_enviar", estado_desde: "2026-10-30T15:00:00Z" }, HOY).detenido).toBeNull();
  });

  it("sin la columna estado_desde usa la fecha de envío o la última modificación", () => {
    const { estado_desde: _, ...viejo } = base;
    void _;
    expect(plazo({ ...viejo, estado: "enviado", fecha_envio: "2026-10-27" }, HOY).dias).toBe(7);
    expect(plazo({ ...viejo, estado: "borrador" }, HOY).dias).toBe(2);
  });

  it("en aprobados muestra cuánto tardó", () => {
    expect(plazo({ ...base, estado: "aprobado", fecha_envio: "2026-09-01", fecha_respuesta: "2026-10-12" }, HOY).texto).toBe("Aprobado en 41 días");
  });
});

describe("avisos", () => {
  const exp = (id: number, estado: "enviado" | "en_revision" | "aprobado", items: Item[], desde = "2026-11-01T12:00:00Z") => ({
    ...base, id, codigo: `EXP-00${id}-2026`, predio: `Predio ${id}`, estado, estado_desde: desde, items, duenos: [],
  });

  it("junta vencidos, por vencer y detenidos, los más urgentes primero", () => {
    const lista = avisos(
      [
        exp(1, "en_revision", [item({ fecha_emision: "2026-10-08" })]), // vence 07/11: en 4 días
        exp(2, "en_revision", [item({ fecha_emision: "2026-09-20" })]), // venció 20/10
        exp(3, "enviado", [], "2026-09-15T12:00:00Z"), // 49 días enviado
        exp(4, "aprobado", [item({ fecha_emision: "2026-01-01" })]), // aprobado: no avisa
      ],
      HOY,
    );
    expect(lista.map((a) => [a.codigo, a.gravedad, a.texto])).toEqual([
      ["EXP-002-2026", "alta", "Certificado de dominio vigente: venció el 20/10"],
      ["EXP-003-2026", "media", "Enviado: sin respuesta del tercero autorizado (49 días)"],
      ["EXP-001-2026", "media", "Certificado de dominio vigente: vence en 4 días (07/11)"],
    ]);
  });
});
