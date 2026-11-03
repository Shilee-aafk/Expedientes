"use client";

import { useEffect } from "react";
import { apiEscritorio } from "@/lib/escritorio";

const CLAVE = "avisos-notificados";

/** En la app de escritorio, una notificación de Windows al día con el resumen de avisos. */
export function NotificarAvisos({ cantidad, altas, primero }: { cantidad: number; altas: number; primero: string }) {
  useEffect(() => {
    if (!apiEscritorio() || typeof Notification === "undefined") return;
    const hoy = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(CLAVE) === hoy) return;
      localStorage.setItem(CLAVE, hoy);
    } catch {
      return;
    }
    const titulo = altas > 0 ? `${cantidad} avisos (${altas} urgentes)` : `${cantidad} aviso${cantidad === 1 ? "" : "s"}`;
    new Notification(`Expedientes SPR · ${titulo}`, { body: cantidad === 1 ? primero : `${primero}\n…y ${cantidad - 1} más.` });
  }, [cantidad, altas, primero]);
  return null;
}
