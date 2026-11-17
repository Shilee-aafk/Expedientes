import { hoyChile } from "@/lib/checklist";
import { listarEquipos, listarExpedientesSimple, listarUsuarios } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { FormSalida } from "../FormSalida";

export default async function NuevaSalidaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; expediente?: string }> }) {
  await requireUser();
  const { fecha, expediente } = await searchParams;
  const [expedientes, usuarios, equipos] = await Promise.all([listarExpedientesSimple(), listarUsuarios(), listarEquipos()]);
  const expedienteId = Number(expediente) || undefined;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Programar salida a terreno</h1>
      <FormSalida
        fechaInicial={fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoyChile()}
        expedienteInicial={expedienteId}
        expedientes={expedientes.filter((e) => e.estado !== "aprobado" || e.id === expedienteId)}
        personas={usuarios.filter((u) => u.activo)}
        equipos={equipos}
        volver={expedienteId ? `/expedientes/${expedienteId}` : undefined}
      />
    </div>
  );
}
