"use client";

import { useActionState } from "react";
import { crearExpediente } from "../actions";

export function NuevoForm() {
  const [error, accion, enviando] = useActionState(crearExpediente, null);

  return (
    <form action={accion} className="card cascada space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="predio">Nombre del predio *</label>
          <input className="input" id="predio" name="predio" required autoFocus />
          <p className="mt-1 text-xs text-muted">El código (por ejemplo EXP-001-2026) se asigna automáticamente.</p>
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
      {error && <p key={error} className="sacudir rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <button className="btn-primary" disabled={enviando}>
        {enviando ? "Creando…" : "Crear expediente"}
      </button>
    </form>
  );
}
