import type { Dueno } from "@/lib/types";
import { actualizarDueno, agregarDueno, quitarDueno } from "../actions";

/** Campos de un dueño; "por poder" es opcional (va en la viñeta del plano). */
function Campos({ d }: { d?: Dueno }) {
  return (
    <>
      <div className="flex gap-2">
        <input name="nombre" placeholder="Nombre" className="input" required defaultValue={d?.nombre} />
        <input name="rut" placeholder="RUT" className="input w-36" defaultValue={d?.rut ?? ""} />
      </div>
      <div className="flex gap-2">
        <input name="apoderado_nombre" placeholder="Por poder: nombre (opcional)" className="input" defaultValue={d?.apoderado_nombre ?? ""} />
        <input name="apoderado_rut" placeholder="RUT" className="input w-36" defaultValue={d?.apoderado_rut ?? ""} />
      </div>
    </>
  );
}

export function Duenos({ expedienteId, duenos }: { expedienteId: number; duenos: Dueno[] }) {
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Dueño/s</h2>
      <ul className="space-y-1 text-sm">
        {duenos.map((d) => (
          <li key={d.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-2 rounded-lg py-1 hover:text-brand">
                <span>
                  {d.nombre}
                  {d.rut && <span className="text-muted"> · {d.rut}</span>}
                  {d.apoderado_nombre && <span className="block text-xs text-muted">Por poder: {d.apoderado_nombre}{d.apoderado_rut ? ` · ${d.apoderado_rut}` : ""}</span>}
                </span>
                <span className="text-xs text-muted group-open:hidden">Editar</span>
              </summary>
              <form action={actualizarDueno.bind(null, expedienteId, d.id)} className="mt-1 space-y-2 pb-2">
                <Campos d={d} />
                <div className="flex items-center gap-3">
                  <button className="btn-secondary px-3 py-1 text-xs">Guardar</button>
                  <button formAction={quitarDueno.bind(null, expedienteId, d.id)} formNoValidate className="text-xs text-danger hover:underline">
                    Quitar
                  </button>
                </div>
              </form>
            </details>
          </li>
        ))}
        {duenos.length === 0 && <li className="text-muted">Sin dueños registrados.</li>}
      </ul>
      <form action={agregarDueno.bind(null, expedienteId)} className="space-y-2 border-t border-border pt-3">
        <Campos />
        <button className="btn-secondary px-3 py-1 text-xs">Agregar dueño</button>
      </form>
    </div>
  );
}
