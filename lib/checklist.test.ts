import { describe, expect, it } from "vitest";
import { cantidadRequerida, hoyChile, itemCumplido, resumen, vigencia } from "./checklist";

type Base = {
  nombre: string;
  opcional: boolean;
  cantidad_requerida: number;
  por_dueno: boolean;
  vence_en_dias: number | null;
  estado: "pendiente" | "listo" | "no_aplica";
  cantidad_entregada: number;
  fecha_emision: string | null;
};
const base: Base = {
  nombre: "x",
  opcional: false,
  cantidad_requerida: 1,
  por_dueno: false,
  vence_en_dias: null,
  estado: "pendiente",
  cantidad_entregada: 0,
  fecha_emision: null,
};
let n = 0;
const item = (o: Partial<Base> = {}) => ({
  ...base,
  id: ++n,
  ...o,
});
const HOY = "2026-10-28";

describe("vigencia", () => {
  const cert = { vence_en_dias: 30, estado: "listo" as const, cantidad_entregada: 1 };
  it("sin vigencia configurada devuelve null", () => {
    expect(vigencia(item(), HOY)).toBeNull();
  });
  it("detecta vigente, por vencer, vencido y sin fecha", () => {
    expect(vigencia(item({ ...cert, fecha_emision: "2026-10-20" }), HOY)).toBe("vigente");
    expect(vigencia(item({ ...cert, fecha_emision: "2026-10-01" }), HOY)).toBe("por_vencer");
    expect(vigencia(item({ ...cert, fecha_emision: "2026-09-27" }), HOY)).toBe("vencido");
    expect(vigencia(item({ ...cert, fecha_emision: "2026-09-28" }), HOY)).toBe("por_vencer") // vence hoy;
    expect(vigencia(item(cert), HOY)).toBe("sin_fecha");
  });
  it("un certificado vencido o sin fecha no cuenta como cumplido", () => {
    expect(itemCumplido(item({ ...cert, fecha_emision: "2026-01-01" }), 1, HOY)).toBe(false);
    expect(itemCumplido(item(cert), 1, HOY)).toBe(false);
    expect(itemCumplido(item({ ...cert, fecha_emision: HOY }), 1, HOY)).toBe(true);
  });
});

describe("cantidades", () => {
  it("los 7 planos exigen los 7", () => {
    const planos = { cantidad_requerida: 7, estado: "listo" as const };
    expect(itemCumplido(item({ ...planos, cantidad_entregada: 6 }), 1, HOY)).toBe(false);
    expect(itemCumplido(item({ ...planos, cantidad_entregada: 7 }), 1, HOY)).toBe(true);
  });
  it("el carnet de dueños exige uno por dueño", () => {
    const carnets = item({ por_dueno: true, estado: "listo", cantidad_entregada: 2 });
    expect(cantidadRequerida(carnets, 3)).toBe(3);
    expect(cantidadRequerida(carnets, 0)).toBe(1);
    expect(itemCumplido(carnets, 3, HOY)).toBe(false);
    expect(itemCumplido(carnets, 2, HOY)).toBe(true);
  });
});

describe("resumen", () => {
  it("excluye opcionales y no aplica, y bloquea con pendientes", () => {
    const items = [
      item({ estado: "listo", cantidad_entregada: 1 }),
      item(),
      item({ opcional: true }),
      item({ estado: "no_aplica" }),
    ];
    const r = resumen(items, 1, HOY);
    expect(r.total).toBe(2);
    expect(r.cumplidos).toBe(1);
    expect(r.porcentaje).toBe(50);
    expect(r.listoParaEnviar).toBe(false);
  });
  it("listo para enviar con todo cumplido aunque falte el opcional", () => {
    const r = resumen([item({ estado: "listo", cantidad_entregada: 1 }), item({ opcional: true })], 1, HOY);
    expect(r.listoParaEnviar).toBe(true);
  });
  it("un opcional vencido también bloquea el envío", () => {
    const r = resumen(
      [
        item({ estado: "listo", cantidad_entregada: 1 }),
        item({ opcional: true, estado: "listo", cantidad_entregada: 1, vence_en_dias: 30, fecha_emision: "2026-01-01" }),
      ],
      1,
      HOY,
    );
    expect(r.vencidos).toHaveLength(1);
    expect(r.listoParaEnviar).toBe(false);
  });
});

it("hoyChile usa la zona horaria de Santiago", () => {
  // 02:00 UTC del 29 = 23:00 del 28 en Chile (UTC-3)
  expect(hoyChile(new Date("2026-10-29T02:00:00Z"))).toBe("2026-10-28");
});
