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
  { href: "/expedientes", texto: "Expedientes", icono: iconos.expedientes, exacto: true },
  { href: "/expedientes/nuevo", texto: "Nuevo", icono: iconos.nuevo },
  { href: "/configuracion/plantilla", texto: "Plantilla", icono: iconos.plantilla },
];

/** Menú principal: burbuja larga flotante, fija abajo al centro, con tres botones en píldora. */
export function MenuInferior() {
  const ruta = usePathname();
  const activo = (href: string, exacto?: boolean) =>
    exacto ? ruta === href || /^\/expedientes\/\d+/.test(ruta) : ruta.startsWith(href);

  return (
    <nav
      aria-label="Menú principal"
      className="glass no-print fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[min(44rem,calc(100%-1.5rem))] -translate-x-1/2 items-center justify-evenly gap-2 rounded-full px-2 py-2"
      style={{ boxShadow: "0 12px 40px rgb(20 40 80 / 0.22), inset 0 1px 0 rgb(255 255 255 / 0.8)" }}
    >
      {enlaces.map((e) => {
        const on = activo(e.href, e.exacto);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={on ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition sm:flex-none sm:px-6 ${
              on
                ? "border-white/40 bg-brand/85 text-white shadow-[0_4px_14px_rgb(31_95_168/0.4),inset_0_1px_0_rgb(255_255_255/0.4)]"
                : "border-white/60 bg-white/45 text-text hover:bg-white/70 hover:text-brand"
            }`}
          >
            {e.icono}
            <span className="max-[360px]:hidden">{e.texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}
