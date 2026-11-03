"use client";

import { useRef } from "react";

/**
 * Burbuja de vidrio de la barra lateral. Cuando una opción despliega su nombre, abre
 * el borde claro de la barra justo a esa altura (--hueco-y): así el contorno de la barra
 * sigue por el contorno del nombre y se ven como una sola pieza.
 */
export function BarraLateral({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);

  const marcar = (objetivo: EventTarget | null) => {
    const barra = ref.current;
    const item = objetivo instanceof Element ? objetivo.closest(".group") : null;
    if (!barra || !item || !barra.contains(item)) return;
    const b = barra.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    barra.style.setProperty("--hueco-y", `${r.top + r.height / 2 - b.top}px`);
    barra.dataset.hueco = "";
  };
  const soltar = (hacia: EventTarget | null) => {
    const barra = ref.current;
    if (!barra) return;
    const item = hacia instanceof Element ? hacia.closest(".group") : null;
    if (item && barra.contains(item)) return marcar(item);
    delete barra.dataset.hueco;
  };

  return (
    <div
      ref={ref}
      className={`barra ${className}`}
      style={style}
      onMouseOver={(e) => marcar(e.target)}
      onMouseOut={(e) => soltar(e.relatedTarget)}
      onFocus={(e) => e.target.matches(":focus-visible") && marcar(e.target)}
      onBlur={(e) => soltar(e.relatedTarget)}
    >
      {children}
    </div>
  );
}
