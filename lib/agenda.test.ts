import { describe, expect, it } from "vitest";
import { choques, diasSemana, horario, inicioSemana, nombreDia, rangoSemana, seCruzan, sinCerrar, type Salida } from "./agenda";

const salida = (p: Partial<Salida>): Salida => ({
  id: 1, expediente_id: 1, titulo: null, fecha: "2026-11-20", hora_inicio: "09:00:00", hora_fin: "13:00:00", estado: "programada",
  notas: null, resultado: null, expediente: { codigo: "EXP-001-2026", predio: "Hijuela 2" },
  personas: [{ id: "u1", nombre: "Jesús" }], equipos: [{ id: 7, nombre: "Leica TS07" }], ...p,
});

describe("agenda", () => {
  it("semana de lunes a domingo", () => {
    expect(inicioSemana("2026-11-17")).toBe("2026-11-16"); // martes → lunes
    expect(inicioSemana("2026-11-22")).toBe("2026-11-16"); // domingo → lunes anterior
    expect(inicioSemana("2026-11-16")).toBe("2026-11-16");
    expect(diasSemana("2026-11-16")).toHaveLength(7);
    expect(rangoSemana("2026-11-16")).toBe("16 – 22 nov 2026");
    expect(rangoSemana("2026-12-28")).toBe("28 dic – 3 ene 2027");
    expect(nombreDia("2026-11-17")).toBe("martes 17 nov");
  });

  it("horarios", () => {
    expect(horario({ hora_inicio: "09:00:00", hora_fin: "13:30:00" })).toBe("09:00 – 13:30");
    expect(horario({ hora_inicio: null, hora_fin: null })).toBe("Todo el día");
    expect(seCruzan(salida({}), salida({ hora_inicio: "13:00", hora_fin: "17:00" }))).toBe(false); // se tocan en el borde
    expect(seCruzan(salida({}), salida({ hora_inicio: "12:00", hora_fin: "17:00" }))).toBe(true);
    expect(seCruzan(salida({}), salida({ hora_inicio: null, hora_fin: null }))).toBe(true); // todo el día
    expect(seCruzan(salida({}), salida({ fecha: "2026-11-21" }))).toBe(false);
  });

  it("avisa choques de persona y equipo", () => {
    const otras = [salida({ id: 2 }), salida({ id: 3, estado: "cancelada" }), salida({ id: 4, hora_inicio: "14:00", hora_fin: "18:00" })];
    const r = choques({ fecha: "2026-11-20", hora_inicio: "10:00", hora_fin: "12:00", personas: ["u1"], equipos: [7] }, otras);
    expect(r).toEqual([
      "Jesús ya está en Hijuela 2 (EXP-001-2026), 09:00 – 13:00.",
      "Leica TS07 ya está reservado para Hijuela 2 (EXP-001-2026), 09:00 – 13:00.",
    ]);
    // La misma salida al editarla no choca consigo
    expect(choques({ id: 2, fecha: "2026-11-20", hora_inicio: "10:00", hora_fin: "12:00", personas: ["u1"], equipos: [7] }, [otras[0]])).toEqual([]);
  });

  it("salidas pasadas sin cerrar", () => {
    const l = [salida({ id: 1, fecha: "2026-11-10" }), salida({ id: 2, fecha: "2026-11-10", estado: "realizada" }), salida({ id: 3, fecha: "2026-11-30" })];
    expect(sinCerrar(l, "2026-11-17").map((s) => s.id)).toEqual([1]);
  });
});
