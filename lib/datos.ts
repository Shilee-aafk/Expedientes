import { notFound } from "next/navigation";
import * as repo from "./repo";
import { requireUser } from "./sesion";

export type { HistorialFila } from "./repo";

export async function cargarExpediente(id: number) {
  await requireUser();
  const datos = Number.isInteger(id) ? await repo.cargarExpediente(id) : null;
  if (!datos) notFound();
  return datos;
}
