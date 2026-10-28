import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Hash de contraseña con scrypt y sal aleatoria: "scrypt$<sal>$<hash>". */
export function hashClave(clave: string): string {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("hex")}$${scryptSync(clave, sal, 64).toString("hex")}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const [tipo, sal, hash] = guardado.split("$");
  if (tipo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(clave, Buffer.from(sal, "hex"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

export function nuevoToken(): string {
  return randomBytes(32).toString("hex");
}
