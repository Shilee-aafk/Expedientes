"use client";

import { useState, useTransition } from "react";
import type { EstadoSalida } from "@/lib/agenda";
import { cambiarEstadoSalida } from "../actions";

/** Marcar la salida como realizada (con lo que se hizo), cancelarla o volverla a programar. */
export function AccionesSalida({ id, estado, resultado }: { id: number; estado: EstadoSalida; resultado: string | null }) {
  const [cerrando, setCerrando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const cambiar = (e: EstadoSalida, f?: FormData) => iniciar(() => cambiarEstadoSalida(id, e, f));

  if (estado !== "programada")
    return (
      <button type="button" className="btn-secondary px-3 py-1 text-xs" disabled={pendiente} onClick={() => cambiar("programada")}>
        Volver a programada
      </button>
    );

  if (cerrando)
    return (
      <form
        className="animar-entrada w-full space-y-2"
        action={(f) => {
          cambiar("realizada", f);
          setCerrando(false);
        }}
      >
        <label className="label" htmlFor="resultado">¿Qué se hizo en terreno?</label>
        <textarea id="resultado" name="resultado" className="input" rows={3} defaultValue={resultado ?? ""} placeholder="Puntos tomados, vértices encontrados, observaciones…" autoFocus />
        <div className="flex gap-2">
          <button className="btn-primary px-3 py-1 text-xs" disabled={pendiente}>Marcar realizada</button>
          <button type="button" className="text-xs text-muted hover:text-text" onClick={() => setCerrando(false)}>Cancelar</button>
        </div>
      </form>
    );

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={() => setCerrando(true)}>Marcar realizada</button>
      <button type="button" className="btn-secondary px-3 py-1 text-xs" disabled={pendiente} onClick={() => cambiar("cancelada")}>Cancelar salida</button>
    </div>
  );
}
