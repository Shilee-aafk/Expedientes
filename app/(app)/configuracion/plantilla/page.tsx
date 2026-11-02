import { listarRequisitos } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { ListaPlantilla } from "./ListaPlantilla";

export default async function PlantillaPage() {
  await requireUser();
  const requisitos = await listarRequisitos();
  const activos = requisitos.filter((r) => r.activo).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantilla de requisitos</h1>
        <p className="text-sm text-muted">
          {requisitos.length} requisitos · {activos} activos. Se copian a cada expediente nuevo; editarlos o eliminarlos no cambia los expedientes ya creados.
        </p>
      </div>
      <ListaPlantilla requisitos={requisitos} />
    </div>
  );
}
