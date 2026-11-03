"use client";

import { useEffect, useId, useRef } from "react";
import { forma, variante, type Medidas } from "@/lib/formaBarra";

/**
 * Burbuja de vidrio de la barra lateral. Barra y nombre de la opción bajo el mouse son
 * UNA sola forma (lib/formaBarra.ts): un único vidrio recortado con clip-path, su borde
 * claro y su sombra trazados con el mismo contorno. Al cambiar el contorno, CSS lo anima
 * (el brazo se estira con rebote y se recoge).
 */
export function BarraLateral({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const idMascara = useId().replace(/:/g, "");
  const estado = useRef<{ m: Medidas | null; abierto: boolean }>({ m: null, abierto: false });
  const reposo = useRef<number | undefined>(undefined);

  /** Aplica el contorno al vidrio, al borde y a la sombra. */
  const aplicar = (m: Medidas, abierto: boolean, animar = true) => {
    const barra = ref.current;
    if (!barra) return;
    const anterior = estado.current.m;
    // Si cambia el tipo de forma, CSS no puede interpolar: se parte desde la barra cerrada
    if (animar && anterior && variante(anterior) !== variante(m)) aplicar(m, false, false);
    const d = `path("${forma(m, abierto)}")`;
    barra.toggleAttribute("data-sin-transicion", !animar);
    barra.toggleAttribute("data-abierto", abierto);
    barra.style.setProperty("--forma", d);
    if (!animar) void barra.offsetWidth; // fija el estado sin animación antes del siguiente
    estado.current = { m, abierto };
    // En las puntas, la forma cerrada deja una línea interna en el borde: al terminar de
    // recogerse se vuelve a la barra simple
    clearTimeout(reposo.current);
    const v = variante(m);
    if (!abierto && v !== "medio" && v !== "capsula") {
      reposo.current = window.setTimeout(() => {
        const simple = medir(null);
        if (simple && !estado.current.abierto) aplicar(simple, false, false);
      }, animar ? 320 : 0);
    }
  };

  const medir = (item: Element | null): Medidas | null => {
    const barra = ref.current;
    if (!barra) return null;
    const b = barra.getBoundingClientRect();
    if (!item) return { w: b.width, h: b.height, c: b.height / 2, largo: 0 };
    const r = item.getBoundingClientRect();
    const etiqueta = item.querySelector(".etiqueta-barra");
    const fin = etiqueta ? etiqueta.getBoundingClientRect().right : r.right;
    return { w: b.width, h: b.height, c: r.top + r.height / 2 - b.top, largo: fin - b.right };
  };

  useEffect(() => {
    const barra = ref.current;
    if (!barra) return;
    const inicial = () => {
      const m = medir(null);
      if (m) aplicar(m, false, false);
    };
    inicial();
    const ro = new ResizeObserver(() => !estado.current.abierto && inicial());
    ro.observe(barra);
    return () => ro.disconnect();
    // Solo al montar: aplicar y medir trabajan con refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = (objetivo: EventTarget | null) => {
    const item = objetivo instanceof Element ? objetivo.closest(".group") : null;
    if (!item || !ref.current?.contains(item) || !matchMedia("(hover: hover)").matches) return;
    const m = medir(item);
    if (m) aplicar(m, true);
  };
  const cerrar = (hacia: EventTarget | null) => {
    const item = hacia instanceof Element ? hacia.closest(".group") : null;
    if (item && ref.current?.contains(item)) return abrir(item);
    const m = estado.current.m;
    if (m) aplicar(m, false);
  };

  return (
    <div
      ref={ref}
      className={`barra ${className}`}
      style={style}
      onMouseOver={(e) => abrir(e.target)}
      onMouseOut={(e) => cerrar(e.relatedTarget)}
      onFocus={(e) => e.target.matches(":focus-visible") && abrir(e.target)}
      onBlur={(e) => cerrar(e.relatedTarget)}
    >
      <svg aria-hidden className="barra-capa barra-sombra">
        <defs>
          <mask id={idMascara} maskUnits="userSpaceOnUse" x="-50" y="-50" width="1000" height="2000">
            <rect x="-50" y="-50" width="1000" height="2000" fill="white" />
            <path className="barra-trazo" fill="black" />
          </mask>
          <filter id={`${idMascara}-d`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <g mask={`url(#${idMascara})`}>
          <path className="barra-trazo" filter={`url(#${idMascara}-d)`} />
        </g>
      </svg>
      <div aria-hidden className="barra-capa barra-vidrio" />
      <svg aria-hidden className="barra-capa barra-borde">
        <path className="barra-trazo" />
      </svg>
      {children}
    </div>
  );
}
