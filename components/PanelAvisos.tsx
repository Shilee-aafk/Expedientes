import Link from "next/link";
import type { Aviso } from "@/lib/plazos";
import { NotificarAvisos } from "./NotificarAvisos";

const VISIBLES = 6;

function Fila({ a }: { a: Aviso }) {
  return (
    <li>
      <Link href={`/expedientes/${a.expedienteId}`} className="group flex items-start gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-glass-hover">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.gravedad === "alta" ? "bg-danger" : "bg-warn"}`} />
        <span className="min-w-0 text-sm">
          <span className="font-medium group-hover:text-brand">{a.predio}</span>
          <span className="text-muted"> · {a.codigo}</span>
          <span className={`block ${a.gravedad === "alta" ? "text-danger" : "text-warn"}`}>{a.texto}</span>
        </span>
      </Link>
    </li>
  );
}

/** "Requiere atención": certificados vencidos o por vencer y expedientes detenidos. */
export function PanelAvisos({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  const altas = avisos.filter((a) => a.gravedad === "alta").length;
  return (
    <section className="card cascada space-y-2 p-4" aria-labelledby="titulo-avisos">
      <NotificarAvisos cantidad={avisos.length} altas={altas} primero={`${avisos[0].predio}: ${avisos[0].texto}`} />
      <h2 id="titulo-avisos" className="flex items-center gap-2 font-semibold">
        Requiere atención
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">{avisos.length}</span>
      </h2>
      <ul className="grid gap-x-4 md:grid-cols-2">
        {avisos.slice(0, VISIBLES).map((a, i) => (
          <Fila key={i} a={a} />
        ))}
      </ul>
      {avisos.length > VISIBLES && (
        <details className="group">
          <summary className="cursor-pointer list-none px-2 text-sm text-muted hover:text-brand">
            <span className="group-open:hidden">Ver {avisos.length - VISIBLES} más</span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <ul className="mt-1 grid gap-x-4 md:grid-cols-2">
            {avisos.slice(VISIBLES).map((a, i) => (
              <Fila key={i} a={a} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
