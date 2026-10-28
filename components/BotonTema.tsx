"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { CLAVE_TEMA, resolverTema, type PreferenciaTema } from "@/lib/tema";

const ORDEN: PreferenciaTema[] = ["oscuro", "claro", "auto"];
const ETIQUETA: Record<PreferenciaTema, string> = { oscuro: "Oscuro", claro: "Claro", auto: "Automático" };

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONO: Record<PreferenciaTema, React.ReactNode> = {
  oscuro: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  claro: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  auto: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </>
  ),
};

function leerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CLAVE_TEMA);
    return v === "claro" || v === "auto" ? v : "oscuro";
  } catch {
    return "oscuro";
  }
}

export function BotonTema() {
  const [pref, setPref] = useState<PreferenciaTema>("oscuro");

  useEffect(() => {
    setPref(leerPreferencia());
  }, []);

  // En automático, seguir los cambios del sistema
  useEffect(() => {
    if (pref !== "auto") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => (document.documentElement.dataset.theme = resolverTema("auto"));
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, [pref]);

  function cambiar() {
    const siguiente = ORDEN[(ORDEN.indexOf(pref) + 1) % ORDEN.length];
    try {
      localStorage.setItem(CLAVE_TEMA, siguiente);
    } catch {}
    const aplicar = () => {
      flushSync(() => setPref(siguiente));
      document.documentElement.dataset.theme = resolverTema(siguiente);
    };

    const raiz = document.documentElement;
    // Sin transiciones de color mientras dura el cambio: cada tarjeta se pinta una sola vez
    // con su color nuevo y la animación la hace solo el círculo de revelado.
    raiz.dataset.cambiandoTema = "";
    const terminar = () => delete raiz.dataset.cambiandoTema;
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      aplicar();
      requestAnimationFrame(() => requestAnimationFrame(terminar));
    } else {
      document.startViewTransition(aplicar).finished.finally(terminar);
    }
  }

  return (
    <button type="button" onClick={cambiar} className="btn-secondary h-8 gap-1.5 px-3 text-xs" title="Cambiar tema" aria-label={`Tema: ${ETIQUETA[pref]}`}>
      <svg key={pref} viewBox="0 0 24 24" className="pop h-4 w-4" {...trazo}>
        {ICONO[pref]}
      </svg>
      <span className="hidden sm:inline">{ETIQUETA[pref]}</span>
    </button>
  );
}
