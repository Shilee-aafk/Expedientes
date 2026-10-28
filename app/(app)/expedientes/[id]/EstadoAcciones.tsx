"use client";

import { useState, useTransition } from "react";
import { ESTADOS, ETIQUETA_ESTADO, type EstadoExpediente } from "@/lib/types";
import { cambiarEstado, eliminarExpediente } from "../actions";

export function EstadoAcciones({ id, estado, listoParaEnviar }: { id: number; estado: EstadoExpediente; listoParaEnviar: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cambiar = (nuevo: EstadoExpediente) =>
    iniciar(async () => {
      setMensaje(await cambiarEstado(id, nuevo));
    });

  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Estado</h2>
      {estado !== "listo_para_enviar" && estado !== "enviado" && estado !== "aprobado" && (
        <button className="btn-primary w-full" disabled={!listoParaEnviar || pendiente} onClick={() => cambiar("listo_para_enviar")}>
          Marcar listo para enviar
        </button>
      )}
      {!listoParaEnviar && estado !== "enviado" && estado !== "aprobado" && (
        <p className="text-xs text-muted">Se habilita cuando todos los requisitos obligatorios están completos y vigentes.</p>
      )}
      <label className="label" htmlFor="estado">Cambiar estado</label>
      <select id="estado" className="input" value={estado} disabled={pendiente} onChange={(e) => cambiar(e.target.value as EstadoExpediente)}>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {ETIQUETA_ESTADO[e]}
          </option>
        ))}
      </select>
      {mensaje && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{mensaje}</p>}
      <button
        className="text-xs text-danger hover:underline"
        disabled={pendiente}
        onClick={() => confirm("¿Eliminar este expediente y sus archivos? No se puede deshacer.") && iniciar(() => eliminarExpediente(id))}
      >
        Eliminar expediente
      </button>
    </div>
  );
}
