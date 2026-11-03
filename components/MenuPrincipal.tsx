"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EtiquetaBarra } from "./EtiquetaBarra";
import { IconoExpedientes, IconoNuevo, IconoPerfil, IconoPlantilla } from "./Iconos";

const enlaces = [
  { href: "/expedientes", texto: "Expedientes", Icono: IconoExpedientes },
  { href: "/expedientes/nuevo", texto: "Nuevo", Icono: IconoNuevo },
  { href: "/configuracion/plantilla", texto: "Plantilla", Icono: IconoPlantilla },
  { href: "/perfil", texto: "Perfil", Icono: IconoPerfil },
];

function indiceActivo(ruta: string) {
  if (ruta.startsWith("/expedientes/nuevo")) return 1;
  if (ruta.startsWith("/configuracion/plantilla")) return 2;
  if (ruta.startsWith("/perfil")) return 3;
  if (ruta.startsWith("/expedientes")) return 0;
  return -1;
}

/**
 * Opciones de la barra lateral (solo íconos). La píldora dorada de la opción activa
 * se desliza con efecto elástico; el nombre aparece solo en la opción bajo el mouse.
 */
export function MenuPrincipal() {
  const activo = indiceActivo(usePathname());

  return (
    <nav aria-label="Menú principal">
      <div className="relative grid grid-rows-4 gap-1">
        <span
          aria-hidden
          className="liquido absolute inset-x-0 top-0 h-10 rounded-full transition-[transform,opacity] duration-500 ease-[var(--ease-spring)]"
          style={{ transform: `translateY(calc(${Math.max(activo, 0)} * (100% + 0.25rem)))`, opacity: activo < 0 ? 0 : 1 }}
        />
        {enlaces.map((e, i) => {
          const on = i === activo;
          return (
            <Link
              key={e.href}
              href={e.href}
              aria-current={on ? "page" : undefined}
              aria-label={e.texto}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 active:scale-95 ${
                on ? "text-on-oro" : "text-muted hover:text-text"
              }`}
            >
              <EtiquetaBarra texto={e.texto} />
              <span className={`relative transition-transform duration-500 ease-[var(--ease-spring)] ${on ? "scale-110" : ""}`}>
                <e.Icono className="h-5 w-5" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
