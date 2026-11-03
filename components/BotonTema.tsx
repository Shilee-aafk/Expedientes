"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { CLAVE_TEMA, resolverTema, type PreferenciaTema } from "@/lib/tema";
import { EtiquetaBarra } from "./EtiquetaBarra";
import { IconoAuto, IconoLuna, IconoSol } from "./Iconos";

const ORDEN: PreferenciaTema[] = ["oscuro", "claro", "auto"];
const ETIQUETA: Record<PreferenciaTema, string> = { oscuro: "Oscuro", claro: "Claro", auto: "Automático" };

const ICONO: Record<PreferenciaTema, typeof IconoLuna> = { oscuro: IconoLuna, claro: IconoSol, auto: IconoAuto };

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

  const Icono = ICONO[pref];

  return (
    <button
      type="button"
      onClick={cambiar}
      className="group relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-text active:scale-95"
      aria-label={`Tema: ${ETIQUETA[pref]} (clic para cambiar)`}
    >
      <EtiquetaBarra texto={`Tema: ${ETIQUETA[pref]}`} />
      <span key={pref} className="pop relative">
        <Icono className="h-6 w-6" />
      </span>
    </button>
  );
}
