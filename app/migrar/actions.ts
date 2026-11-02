"use server";

import { migrar, type ResultadoMigracion } from "@/lib/migracion";

export type EstadoMigracion = { error?: string; resultado?: ResultadoMigracion; admin?: string } | null;

export async function ejecutarMigracion(_: EstadoMigracion, f: FormData): Promise<EstadoMigracion> {
  const admin = String(f.get("admin") ?? "");
  const clave = String(f.get("clave") ?? "");
  if (clave !== String(f.get("clave2") ?? "")) return { error: "Las contraseñas no coinciden.", admin };
  try {
    return { resultado: await migrar(admin, clave), admin };
  } catch (e) {
    return { error: (e as Error).message, admin };
  }
}
