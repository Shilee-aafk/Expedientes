import { requireUser } from "@/lib/supabase/server";
import { NuevoForm } from "./NuevoForm";

export default async function NuevoExpedientePage() {
  const { supabase, user } = await requireUser();
  const { data: perfiles } = await supabase.from("profiles").select("id, nombre").order("nombre");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo expediente</h1>
      <p className="text-sm text-muted">El checklist se crea automáticamente con los requisitos de la plantilla.</p>
      <NuevoForm perfiles={perfiles ?? []} usuarioId={user.id} />
    </div>
  );
}
