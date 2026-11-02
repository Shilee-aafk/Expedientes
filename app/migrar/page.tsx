import Link from "next/link";
import { resumenLocal } from "@/lib/migracion";
import { FormMigracion } from "./FormMigracion";

export const dynamic = "force-dynamic";

export default function MigrarPage() {
  const local = resumenLocal();
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      {local ? (
        <FormMigracion local={local} />
      ) : (
        <div className="card flotar-entrada w-full max-w-md space-y-3 p-7 text-center">
          <p className="font-semibold">No hay datos pendientes de subir en este equipo.</p>
          <Link href="/login" className="btn-primary">Ir a ingresar</Link>
        </div>
      )}
    </main>
  );
}
