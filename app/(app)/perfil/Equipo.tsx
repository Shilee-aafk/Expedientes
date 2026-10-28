"use client";

import { useActionState } from "react";
import { Confirmar } from "@/components/Confirmar";
import type { Profile } from "@/lib/types";
import { crearUsuario, eliminarUsuario } from "./actions";
import { Mensaje } from "./PerfilForm";

/** Usuarios del equipo: cualquiera puede agregar o quitar a otros (no a sí mismo). */
export function Equipo({ usuarios, yoId }: { usuarios: Profile[]; yoId: number }) {
  const [mensaje, accion, enviando] = useActionState(crearUsuario, null);

  return (
    <div className="card cascada space-y-4 p-6" style={{ "--i": 3 } as React.CSSProperties}>
      <div>
        <h2 className="font-semibold">Equipo</h2>
        <p className="text-sm text-muted">Personas que pueden entrar a la app.</p>
      </div>
      <ul className="divide-y divide-border text-sm">
        {usuarios.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 py-2">
            <span>
              {u.nombre} <span className="text-muted">· {u.usuario}</span>
              {u.id === yoId && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">tú</span>}
            </span>
            {u.id !== yoId && (
              <Confirmar
                accion={() => eliminarUsuario(u.id)}
                titulo="¿Eliminar este usuario?"
                mensaje={`${u.nombre} ya no podrá entrar. Sus expedientes y cambios en el historial se conservan.`}
                className="btn-danger px-3 py-1 text-xs"
              >
                Eliminar
              </Confirmar>
            )}
          </li>
        ))}
      </ul>
      <form action={accion} className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Agregar persona</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input" name="nombre" placeholder="Nombre" required />
          <input className="input" name="usuario" placeholder="Usuario" required autoCapitalize="none" autoComplete="off" />
          <input className="input" name="clave" type="password" placeholder="Contraseña (mín. 6)" required minLength={6} autoComplete="new-password" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" disabled={enviando}>Agregar</button>
          <Mensaje mensaje={mensaje} />
        </div>
      </form>
    </div>
  );
}
