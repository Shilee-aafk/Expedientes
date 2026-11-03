import Link from "next/link";
import { MapaGeneral } from "@/components/MapaGeneral";
import { listarKmz } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";

export default async function MapaPage() {
  await requireUser();
  const kmz = await listarKmz();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mapa de predios</h1>
        <p className="text-sm text-muted">Todos los expedientes con KMZ, coloreados por estado. Clic en un predio para abrirlo.</p>
      </div>
      {kmz.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          Aún no hay KMZ adjuntos. Súbelos en el requisito «Pendrive con KMZ» de cada expediente.{" "}
          <Link href="/expedientes" className="text-brand hover:underline">
            Ir a expedientes
          </Link>
        </div>
      ) : (
        <MapaGeneral kmz={kmz} />
      )}
    </div>
  );
}
