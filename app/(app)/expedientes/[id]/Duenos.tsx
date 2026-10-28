import type { Dueno } from "@/lib/types";
import { agregarDueno, quitarDueno } from "../actions";

export function Duenos({ expedienteId, duenos }: { expedienteId: number; duenos: Dueno[] }) {
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Dueño/s</h2>
      <ul className="space-y-1 text-sm">
        {duenos.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2">
            <span>
              {d.nombre}
              {d.rut && <span className="text-muted"> · {d.rut}</span>}
            </span>
            <form action={quitarDueno.bind(null, expedienteId, d.id)}>
              <button className="text-xs text-danger hover:underline">Quitar</button>
            </form>
          </li>
        ))}
        {duenos.length === 0 && <li className="text-muted">Sin dueños registrados.</li>}
      </ul>
      <form action={agregarDueno.bind(null, expedienteId)} className="flex gap-2">
        <input name="nombre" placeholder="Nombre" className="input" required />
        <input name="rut" placeholder="RUT" className="input w-32" />
        <button className="btn-secondary px-3">+</button>
      </form>
    </div>
  );
}
