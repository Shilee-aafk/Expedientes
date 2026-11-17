import { notFound } from "next/navigation";
import { cargarSalida, listarEquipos, listarExpedientesSimple, listarUsuarios } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { FormSalida } from "../../FormSalida";

export default async function EditarSalidaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  const [datos, expedientes, usuarios, equipos] = await Promise.all([cargarSalida(id), listarExpedientesSimple(), listarUsuarios(), listarEquipos()]);
  if (!datos) notFound();
  const { salida } = datos;
  const elegidos = new Set(salida.personas.map((p) => p.id));
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Editar salida a terreno</h1>
      <FormSalida
        salida={salida}
        expedientes={expedientes}
        personas={usuarios.filter((u) => u.activo || elegidos.has(u.id))}
        equipos={equipos}
        volver={`/agenda/${id}`}
      />
    </div>
  );
}
