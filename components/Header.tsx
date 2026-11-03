import Link from "next/link";
import { BarraLateral } from "./BarraLateral";
import { BotonTema } from "./BotonTema";
import { EtiquetaBarra } from "./EtiquetaBarra";
import { IconoSalir } from "./Iconos";
import { MenuPrincipal } from "./MenuPrincipal";

/**
 * Barra lateral flotante a la izquierda, en vertical y solo con íconos: logo, menú y tema
 * en una burbuja, y otra aparte para salir. El nombre de cada opción aparece al pasar el mouse.
 */
export function Header() {
  return (
    <header className="no-print pointer-events-none fixed inset-y-0 left-3 z-50 flex flex-col items-start justify-center gap-2">
      <BarraLateral className="flotar-entrada-lado pointer-events-auto flex flex-col items-center gap-1 rounded-full p-1.5">
        <Link href="/expedientes" aria-label="Expedientes SPR, inicio" className="group relative flex h-12 w-12 shrink-0 items-center justify-center">
          <EtiquetaBarra texto="Expedientes SPR" />
          <span className="liquido relative flex h-10 w-10 items-center justify-center rounded-full text-on-oro transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-[-8deg] group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 17c3-1 4-4 8-4s5 3 10 2" />
              <path d="M3 12c3-1 5-5 9-5s5 4 9 3" />
              <path d="M7 20c2-1 3-2 5-2s3 1 5 2" />
            </svg>
          </span>
        </Link>
        <span aria-hidden className="my-0.5 h-px w-7 bg-border" />
        <MenuPrincipal />
        <span aria-hidden className="my-0.5 h-px w-7 bg-border" />
        <BotonTema />
      </BarraLateral>
      <BarraLateral className="flotar-entrada-lado pointer-events-auto shrink-0 rounded-full p-1.5" style={{ animationDelay: "80ms" }}>
        <form action="/auth/salir" method="post">
        <button
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-danger active:scale-95"
          aria-label="Cerrar sesión"
        >
          <EtiquetaBarra texto="Cerrar sesión" />
          <IconoSalir className="relative h-6 w-6" />
        </button>
        </form>
      </BarraLateral>
    </header>
  );
}
