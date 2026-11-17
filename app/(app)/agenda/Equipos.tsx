"use client";

import { useActionState } from "react";
import { Interruptor } from "@/components/Interruptor";
import { Select } from "@/components/Select";
import { ETIQUETA_TIPO_EQUIPO, TIPOS_EQUIPO, type Equipo } from "@/lib/agenda";
import { cambiarActivoEquipo, crearEquipo } from "./actions";

/** Equipos de la oficina (estación total, GPS…). Los dados de baja no se ofrecen al programar. */
export function Equipos({ equipos }: { equipos: Equipo[] }) {
  const [mensaje, accion, enviando] = useActionState(crearEquipo, null);
  return (
    <div className="card cascada space-y-3 p-4">
      <h2 className="font-semibold">Equipos</h2>
      {equipos.length === 0 && <p className="text-sm text-muted">Agrega los equipos para reservarlos en cada salida.</p>}
      <ul className="space-y-2 text-sm">
        {equipos.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2">
            <span className={e.activo ? "" : "opacity-55"}>
              {e.nombre} <span className="text-muted">· {ETIQUETA_TIPO_EQUIPO[e.tipo]}</span>
            </span>
            <Interruptor label={e.activo ? "En uso" : "De baja"} checked={e.activo} onChange={(v) => cambiarActivoEquipo(e.id, v)} />
          </li>
        ))}
      </ul>
      <form action={accion} className="space-y-2 border-t border-border pt-3">
        <input name="nombre" className="input" placeholder="Nombre (ej. Leica TS07)" required />
        <div className="flex gap-2">
          <Select name="tipo" className="min-w-0 flex-1" aria-label="Tipo de equipo" opciones={TIPOS_EQUIPO.map((t) => ({ value: t, label: ETIQUETA_TIPO_EQUIPO[t] }))} />
          <button className="btn-secondary px-3" disabled={enviando}>Agregar</button>
        </div>
        {mensaje && mensaje !== "Guardado" && <p className="text-sm text-danger">{mensaje}</p>}
      </form>
    </div>
  );
}
