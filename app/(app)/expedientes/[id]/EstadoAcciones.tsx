"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Confirmar } from "@/components/Confirmar";
import { Select } from "@/components/Select";
import { ESTADOS, ETIQUETA_ESTADO, type EstadoExpediente } from "@/lib/types";
import { cambiarEstado, eliminarExpediente } from "../actions";

export function EstadoAcciones({ id, estado, listoParaEnviar }: { id: number; estado: EstadoExpediente; listoParaEnviar: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mostrado, setMostrado] = useOptimistic(estado);

  const cambiar = (nuevo: EstadoExpediente) =>
    iniciar(async () => {
      setMostrado(nuevo);
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
      <Select
        id="estado"
        value={mostrado}
        onChange={(v) => cambiar(v as EstadoExpediente)}
        opciones={ESTADOS.map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] }))}
      />
      {mensaje && <p key={mensaje} className="sacudir rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{mensaje}</p>}
      <div className="border-t border-border pt-3">
        <Confirmar
          accion={() => eliminarExpediente(id)}
          titulo="¿Eliminar este expediente?"
          mensaje="Se borran su checklist, dueños, historial y archivos adjuntos. No se puede deshacer."
          className="btn-danger w-full"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
          Eliminar expediente
        </Confirmar>
      </div>
    </div>
  );
}
