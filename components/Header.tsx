import Link from "next/link";

export function Header({ nombre }: { nombre: string }) {
  return (
    <header className="glass no-print sticky top-0 z-10 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/expedientes" className="text-lg font-semibold text-brand">
          Expedientes SPR
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/perfil" className="flex items-center gap-2 rounded-full px-2 py-1 text-muted transition hover:bg-white/50 hover:text-brand" title="Mi perfil">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/85 text-xs font-semibold text-white">
              {nombre.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden sm:inline">{nombre}</span>
          </Link>
          <form action="/auth/salir" method="post">
            <button className="btn-secondary px-3 py-1 text-xs">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
