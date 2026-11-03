"use client";

import { useActionState, useState } from "react";
import type { Profile } from "@/lib/types";
import { restablecerClave } from "./actions";

/** Botón "Contraseña" de una persona del equipo: le pone una contraseña temporal. */
export function ClaveTemporal({ usuario }: { usuario: Profile }) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, accion, enviando] = useActionState(restablecerClave.bind(null, usuario.id), null);
  const ok = mensaje === "Guardado";

  if (!abierto)
    return (
      <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => setAbierto(true)}>
        Contraseña
      </button>
    );

  return (
    <form action={accion} className="animar-entrada w-[min(28rem,100%)] space-y-2 rounded-xl border border-border p-3 text-left">
      <p className="text-xs text-muted">
        Contraseña temporal para <b className="text-text">{usuario.nombre}</b>. Entra con ella y la cambia en Mi perfil. Se cierran sus sesiones abiertas.
      </p>
      {ok ? (
        <p className="text-sm text-ok">✓ Listo. Avísale la contraseña temporal a {usuario.nombre}.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" name="clave" type="password" placeholder="Contraseña temporal (mín. 6)" required minLength={6} autoComplete="new-password" />
          <input className="input" name="clave2" type="password" placeholder="Repítela" required minLength={6} autoComplete="new-password" />
        </div>
      )}
      <div className="flex items-center gap-3">
        {!ok && (
          <button className="btn-primary px-3 py-1 text-xs" disabled={enviando}>
            Guardar
          </button>
        )}
        <button type="button" className="text-xs text-muted hover:text-text" onClick={() => setAbierto(false)}>
          {ok ? "Cerrar" : "Cancelar"}
        </button>
        {mensaje && !ok && <span className="sacudir text-sm text-danger">{mensaje}</span>}
      </div>
    </form>
  );
}
