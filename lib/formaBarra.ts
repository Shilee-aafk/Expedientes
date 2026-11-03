/**
 * Contorno de la barra lateral con el nombre de una opción "estirado" desde ella,
 * como un solo trazo SVG: barra (píldora vertical), uniones curvas y brazo con punta
 * redonda. Abierto y cerrado usan los mismos comandos, así CSS puede animar entre ellos.
 *
 * Coordenadas: origen en la esquina superior izquierda de la barra.
 */
export type Medidas = {
  /** ancho y alto de la barra */
  w: number;
  h: number;
  /** centro vertical de la opción */
  c: number;
  /** largo del brazo desde el borde de la barra (0 = cerrado) */
  largo: number;
};

/** Mitad del alto del brazo y radio de las uniones curvas */
export const MEDIO_BRAZO = 24;
export const UNION = 14;

const n = (v: number) => Math.round(v * 100) / 100;

export type Variante = "medio" | "arriba" | "abajo" | "capsula";

/**
 * En los extremos (opción pegada a la punta redonda de la barra) no cabe la unión curva:
 * ahí el brazo es del alto de la barra y sigue su borde.
 */
export function variante({ w, h, c }: Pick<Medidas, "w" | "h" | "c">): Variante {
  const r = w / 2;
  const arriba = c - MEDIO_BRAZO - UNION < r - 0.5;
  const abajo = c + MEDIO_BRAZO + UNION > h - r + 0.5;
  if (arriba && abajo) return "capsula";
  if (arriba) return "arriba";
  if (abajo) return "abajo";
  return "medio";
}

export function forma(m: Medidas, abierto: boolean): string {
  const { w, h } = m;
  const r = w / 2;
  const v = variante(m);
  const L = abierto ? Math.max(m.largo, 0) : 0;
  const u = abierto ? UNION : 0;
  // Lado izquierdo de la barra (igual en todas): de abajo-derecha de la punta inferior hasta arriba
  const izquierda = `A ${r} ${r} 0 0 1 ${n(r)} ${n(h)} A ${r} ${r} 0 0 1 0 ${n(h - r)} L 0 ${n(r)} A ${r} ${r} 0 0 1 ${n(r)} 0 Z`;

  if (v === "capsula") {
    const x = n(w + L - r);
    return `M ${n(r)} 0 L ${x} 0 A ${r} ${r} 0 0 1 ${x} ${n(2 * r)} L ${n(r)} ${n(2 * r)} A ${r} ${r} 0 0 1 ${n(r)} 0 Z`;
  }
  if (v === "arriba") {
    const x = n(w + L - r);
    return (
      `M ${n(r)} 0 L ${x} 0 A ${r} ${r} 0 0 1 ${x} ${n(2 * r)} L ${n(w + u)} ${n(2 * r)} ` +
      `A ${u} ${u} 0 0 0 ${n(w)} ${n(2 * r + u)} L ${n(w)} ${n(h - r)} ${izquierda}`
    );
  }
  if (v === "abajo") {
    const x = n(w + L - r);
    return (
      `M ${n(r)} 0 A ${r} ${r} 0 0 1 ${n(w)} ${n(r)} L ${n(w)} ${n(h - 2 * r - u)} ` +
      `A ${u} ${u} 0 0 0 ${n(w + u)} ${n(h - 2 * r)} L ${x} ${n(h - 2 * r)} A ${r} ${r} 0 0 1 ${x} ${n(h)} ` +
      `L ${n(r)} ${n(h)} A ${r} ${r} 0 0 1 0 ${n(h - r)} L 0 ${n(r)} A ${r} ${r} 0 0 1 ${n(r)} 0 Z`
    );
  }
  const a = abierto ? MEDIO_BRAZO : 0;
  const { c } = m;
  const x = n(w + L - a);
  return (
    `M ${n(r)} 0 A ${r} ${r} 0 0 1 ${n(w)} ${n(r)} L ${n(w)} ${n(c - a - u)} ` +
    `A ${u} ${u} 0 0 0 ${n(w + u)} ${n(c - a)} L ${x} ${n(c - a)} A ${a} ${a} 0 0 1 ${x} ${n(c + a)} ` +
    `L ${n(w + u)} ${n(c + a)} A ${u} ${u} 0 0 0 ${n(w)} ${n(c + a + u)} L ${n(w)} ${n(h - r)} ${izquierda}`
  );
}
