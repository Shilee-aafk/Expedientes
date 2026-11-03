import { describe, expect, it } from "vitest";
import { leerNumero } from "./numeros";

describe("leerNumero", () => {
  it("acepta coma o punto decimal y separador de miles", () => {
    expect(leerNumero("5385060.902")).toBe(5385060.902);
    expect(leerNumero("5.385.060,902")).toBe(5385060.902);
    expect(leerNumero("655252,89")).toBe(655252.89);
    expect(leerNumero("5.385.060")).toBe(5385060);
    expect(leerNumero(" 1000 ")).toBe(1000);
    expect(leerNumero(null)).toBeNull();
  });
  it("rechaza texto", () => {
    expect(() => leerNumero("norte")).toThrow();
  });
});
