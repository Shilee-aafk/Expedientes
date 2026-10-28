"use client";

import { useActionState } from "react";
import { crearExpediente } from "../actions";

export function NuevoForm({ perfiles, usuarioId }: { perfiles: { id: string; nombre: string }[]; usuarioId: string }) {
  const [error, accion, enviando] = useActionState(crearExpediente, null);

  return (
    <form action={accion} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="codigo">Código *</label>
          <input className="input" id="codigo" name="codigo" required placeholder="EXP-2026-001" />
        </div>
        <div>
          <label className="label" htmlFor="predio">Nombre del predio *</label>
          <input className="input" id="predio" name="predio" required />
        </div>
        <div>
          <label className="label" htmlFor="rol_sii">Rol SII</label>
          <input className="input" id="rol_sii" name="rol_sii" placeholder="123-45" />
        </div>
        <div>
          <label className="label" htmlFor="comuna">Comuna</label>
          <input className="input" id="comuna" name="comuna" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="profesional_id">Profesional responsable</label>
          <select className="input" id="profesional_id" name="profesional_id" defaultValue={usuarioId}>
            <option value="">Sin asignar</option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">Su carnet y título se adjuntan solos si están cargados en su perfil.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="duenos">Dueño/s</label>
          <textarea
            className="input"
            id="duenos"
            name="duenos"
            rows={3}
            placeholder={"Uno por línea: Nombre, RUT\nJuan Pérez, 12.345.678-9"}
          />
          <p className="mt-1 text-xs text-muted">Se pedirá un carnet por cada dueño.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notas">Notas</label>
          <textarea className="input" id="notas" name="notas" rows={2} />
        </div>
      </div>
      {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <button className="btn-primary" disabled={enviando}>
        {enviando ? "Creando…" : "Crear expediente"}
      </button>
    </form>
  );
}
