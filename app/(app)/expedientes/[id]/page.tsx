import Link from "next/link";
import { EstadoBadge, Progreso } from "@/components/ui";
import { hoyChile, resumen } from "@/lib/checklist";
import { cargarExpediente } from "@/lib/datos";
import { formatoFechaHora } from "@/lib/formato";
import { Checklist } from "./Checklist";
import { DatosForm } from "./DatosForm";
import { Duenos } from "./Duenos";
import { EstadoAcciones } from "./EstadoAcciones";

export default async function ExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { expediente, items, duenos, historial } = await cargarExpediente(id);
  const hoy = hoyChile();
  const r = resumen(items, duenos.length, hoy);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/expedientes" className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand">
            <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Expedientes
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            {expediente.predio} <EstadoBadge estado={expediente.estado} />
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-muted">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-brand">{expediente.codigo}</span>
            {expediente.comuna && ` · ${expediente.comuna}`}
            {expediente.rol_sii && ` · Rol ${expediente.rol_sii}`}
          </p>
        </div>
        <Link href={`/expedientes/${id}/caratula`} className="btn-secondary">
          Carátula para imprimir
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-3">
          <div className="card cascada space-y-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Avance del checklist</span>
              <span key={r.porcentaje} className="pop inline-block font-semibold text-text">{r.porcentaje}%</span>
            </div>
            <Progreso cumplidos={r.cumplidos} total={r.total} />
            {r.vencidos.length > 0 && (
              <p className="animar-entrada text-sm text-danger">Vencidos: {r.vencidos.map((i) => i.nombre).join(", ")}</p>
            )}
            {r.porVencer.length > 0 && (
              <p className="animar-entrada text-sm text-warn">Por vencer: {r.porVencer.map((i) => i.nombre).join(", ")}</p>
            )}
          </div>
          <Checklist items={items} numDuenos={duenos.length} hoy={hoy} expedienteId={id} />
        </section>

        <aside className="space-y-4 [&>*]:cascada [&>*:nth-child(2)]:[--i:2] [&>*:nth-child(3)]:[--i:4] [&>*:nth-child(4)]:[--i:6]">
          <EstadoAcciones id={id} estado={expediente.estado} listoParaEnviar={r.listoParaEnviar} />
          <Duenos expedienteId={id} duenos={duenos} />
          <DatosForm expediente={expediente} />
          <div className="card p-4">
            <h2 className="mb-3 font-semibold">Historial</h2>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {historial.map((h) => (
                <li key={h.id} className="animar-entrada border-l-2 border-border pl-3 transition-colors hover:border-brand">
                  <div>{h.accion}</div>
                  <div className="text-xs text-muted">
                    {formatoFechaHora(h.created_at)} · {h.usuario?.nombre ?? "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
