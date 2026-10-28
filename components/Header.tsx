import Link from "next/link";
import { BotonTema } from "./BotonTema";

export function Header({ nombre }: { nombre: string }) {
  return (
    <header className="glass no-print sticky top-0 z-10 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/expedientes" className="group flex items-center gap-2 text-lg font-semibold tracking-tight text-text">
          <span className="flex h-8 w-8 items-center justify-center liquido rounded-xl text-on-brand transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-[-8deg] group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 17c3-1 4-4 8-4s5 3 10 2" />
              <path d="M3 12c3-1 5-5 9-5s5 4 9 3" />
              <path d="M7 20c2-1 3-2 5-2s3 1 5 2" />
            </svg>
          </span>
          Expedientes <span className="text-brand">SPR</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <BotonTema />
          <Link href="/perfil" className="flex items-center gap-2 rounded-full px-2 py-1 text-muted transition hover:bg-glass-hover hover:text-text" title="Mi perfil">
            <span className="flex h-7 w-7 items-center justify-center liquido rounded-full text-xs font-semibold text-on-brand transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-110">
              {nombre.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden sm:inline">{nombre}</span>
          </Link>
          <form action="/auth/salir" method="post">
            <button className="btn-secondary h-8 px-3 text-xs">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
