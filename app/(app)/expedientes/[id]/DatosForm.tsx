"use client";

import { useActionState } from "react";
import type { Expediente } from "@/lib/types";
import { guardarDatos } from "../actions";

export function DatosForm({ expediente: e }: { expediente: Expediente }) {
  const [mensaje, accion, enviando] = useActionState(guardarDatos.bind(null, e.id), null);
  const campo = (name: keyof Expediente, label: string, type = "text") => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} defaultValue={(e[name] as string) ?? ""} />
    </div>
  );

  return (
    <form action={accion} className="card space-y-3 p-4">
      <h2 className="font-semibold">Datos del expediente</h2>
      {campo("predio", "Predio")}
      <div className="grid grid-cols-2 gap-2">
        {campo("rol_sii", "Rol SII")}
        {campo("comuna", "Comuna")}
      </div>

      <h3 className="pt-2 text-sm font-semibold text-muted">Seguimiento del envío</h3>
      {campo("tercero_autorizado", "Tercero autorizado")}
      <div className="grid grid-cols-2 gap-2">
        {campo("fecha_envio", "Fecha de envío", "date")}
        {campo("fecha_respuesta", "Fecha de respuesta", "date")}
      </div>
      <div>
        <label className="label" htmlFor="observaciones">Observaciones recibidas</label>
        <textarea className="input" id="observaciones" name="observaciones" rows={3} defaultValue={e.observaciones ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="notas">Notas internas</label>
        <textarea className="input" id="notas" name="notas" rows={2} defaultValue={e.notas ?? ""} />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={enviando}>Guardar</button>
        {mensaje && <span className={`text-sm ${mensaje === "Guardado" ? "animar-entrada text-ok" : "sacudir text-danger"}`}>{mensaje === "Guardado" ? "✓ Guardado" : mensaje}</span>}
      </div>
    </form>
  );
}
