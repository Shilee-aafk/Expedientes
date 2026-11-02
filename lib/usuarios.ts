import { createHash } from "node:crypto";

/**
 * Correo interno con el que cada usuario existe en Supabase Auth (no se envían correos):
 * la gente entra con su nombre de usuario. Debe coincidir con public.correo_de() en supabase/esquema.sql.
 */
export function correoDe(usuario: string): string {
  const u = usuario.trim().toLowerCase();
  const local = /^[a-z0-9._-]{1,60}$/.test(u) ? u : `u-${createHash("md5").update(u).digest("hex")}`;
  return `${local}@expedientes-spr.local`;
}
