import { NuevoForm } from "./NuevoForm";

export default function NuevoExpedientePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo expediente</h1>
      <p className="text-sm text-muted">El checklist se crea automáticamente con los requisitos de la plantilla.</p>
      <NuevoForm />
    </div>
  );
}
