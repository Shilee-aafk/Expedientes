"use client";

import { useRef, useState, useTransition } from "react";

type Props = {
  /** Acción a ejecutar al confirmar (puede ser una server action). */
  accion: () => unknown | Promise<unknown>;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
};

/** Botón que pide confirmación en un diálogo de vidrio antes de ejecutar una acción destructiva. */
export function Confirmar({ accion, titulo, mensaje, textoConfirmar = "Eliminar", className = "btn-danger", children, ...aria }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirmar = () =>
    iniciar(async () => {
      setError(null);
      try {
        await accion();
        dialogo.current?.close();
      } catch (e) {
        // redirect() de Next se propaga como error especial: no es un fallo
        if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
        setError((e as Error).message);
      }
    });

  return (
    <>
      <button type="button" className={className} aria-label={aria["aria-label"]} onClick={() => dialogo.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialogo}
        className="dialogo"
        onClick={(e) => e.target === dialogo.current && !pendiente && dialogo.current?.close()}
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold">{titulo}</h2>
              <p className="mt-1 text-sm text-muted">{mensaje}</p>
            </div>
          </div>
          {error && <p key={error} className="sacudir rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={pendiente} onClick={() => dialogo.current?.close()}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn border-transparent bg-danger text-on-brand hover:shadow-[0_6px_20px_color-mix(in_srgb,var(--danger)_45%,transparent)]"
              disabled={pendiente}
              onClick={confirmar}
            >
              {pendiente ? "Eliminando…" : textoConfirmar}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
