/** Número escrito con coma o punto decimal ("5.385.060,902" o "5385060.902"); null si está vacío. */
export function leerNumero(v: string | null): number | null {
  if (!v) return null;
  let t = v.replace(/\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`«${v}» no es un número.`);
  return n;
}
