"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const iconos = {
  expedientes: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" {...trazo}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  nuevo: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" {...trazo}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  plantilla: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" {...trazo}>
      <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
    </svg>
  ),
};

const enlaces = [
  { href: "/expedientes", texto: "Expedientes", icono: iconos.expedientes },
  { href: "/expedientes/nuevo", texto: "Nuevo", icono: iconos.nuevo },
  { href: "/configuracion/plantilla", texto: "Plantilla", icono: iconos.plantilla },
];

function indiceActivo(ruta: string) {
  if (ruta.startsWith("/expedientes/nuevo")) return 1;
  if (ruta.startsWith("/configuracion/plantilla")) return 2;
  if (ruta.startsWith("/expedientes")) return 0;
  return -1;
}

/**
 * Menú principal: burbuja larga flotante, fija abajo al centro.
 * La píldora activa se desliza con efecto elástico entre los tres botones.
 */
export function MenuInferior() {
  const activo = indiceActivo(usePathname());

  return (
    <nav
      aria-label="Menú principal"
      className="glass no-print fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 w-[min(40rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-full p-1.5 flotar-entrada"
    >
      <div className="relative grid grid-cols-3">
        <span
          aria-hidden
          className="liquido absolute inset-y-0 left-0 w-1/3 rounded-full transition-[transform,opacity] duration-500 ease-[var(--ease-spring)]"
          style={{ transform: `translateX(${Math.max(activo, 0) * 100}%)`, opacity: activo < 0 ? 0 : 1 }}
        />
        {enlaces.map((e, i) => {
          const on = i === activo;
          return (
            <Link
              key={e.href}
              href={e.href}
              aria-current={on ? "page" : undefined}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-300 active:scale-95 ${
                on ? "text-on-brand" : "text-muted hover:text-text"
              }`}
            >
              <span className={`transition-transform duration-500 ease-[var(--ease-spring)] ${on ? "scale-110" : ""}`}>{e.icono}</span>
              <span className="max-[360px]:hidden">{e.texto}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
