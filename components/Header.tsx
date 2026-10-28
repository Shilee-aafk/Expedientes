import Link from "next/link";
import { BotonTema } from "./BotonTema";
import { MenuPrincipal } from "./MenuPrincipal";

/** Barra flotante superior: logo, menú (con la píldora deslizante) y cambio de tema. */
export function Header() {
  return (
    <header className="no-print fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <div className="glass flotar-entrada flex max-w-full items-center gap-1 rounded-full p-1.5">
        <Link
          href="/expedientes"
          title="Expedientes SPR"
          aria-label="Expedientes SPR, inicio"
          className="group flex h-10 w-10 shrink-0 items-center justify-center"
        >
          <span className="liquido flex h-8 w-8 items-center justify-center rounded-full text-on-oro transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-[-8deg] group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 17c3-1 4-4 8-4s5 3 10 2" />
              <path d="M3 12c3-1 5-5 9-5s5 4 9 3" />
              <path d="M7 20c2-1 3-2 5-2s3 1 5 2" />
            </svg>
          </span>
        </Link>
        <MenuPrincipal className="min-w-0 flex-1" />
        <BotonTema />
      </div>
    </header>
  );
}
