"use client";

import { useEffect, useState } from "react";

/** Número que cuenta desde 0 hasta su valor al aparecer. */
export function Contador({ valor, duracion = 900 }: { valor: number; duracion?: number }) {
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMostrado(valor);
      return;
    }
    let frame = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      setMostrado(Math.round(valor * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor, duracion]);

  return <span className="tabular-nums">{mostrado}</span>;
}
