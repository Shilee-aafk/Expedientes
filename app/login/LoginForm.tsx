"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ResumenLocal } from "@/lib/migracion";
import { crearPrimerUsuario, ingresar, type EstadoLogin } from "./actions";

type Props = { primerUso: boolean; errorConexion: string | null; local: ResumenLocal | null };

export function LoginForm({ primerUso, errorConexion, local }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(primerUso ? crearPrimerUsuario : ingresar, null);
  const error = estado?.error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      {local && (
        <div className="card flotar-entrada w-full max-w-sm space-y-3 p-5" style={{ background: "var(--glass-menu)" }}>
          <p className="font-semibold">Este equipo tiene datos de la versión anterior</p>
          <p className="text-sm text-muted">
            {local.expedientes} expediente(s) y {local.usuarios} usuario(s) guardados solo en este computador. Súbelos a la base
            compartida para no perderlos de vista.
          </p>
          <Link href="/migrar" className="btn-primary w-full">
            Subir datos a Supabase
          </Link>
        </div>
      )}
      {errorConexion && (
        <p className="w-full max-w-sm rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          No se pudo conectar con la base de datos en línea. Revisa la conexión a internet.
          <span className="mt-1 block text-xs opacity-80">{errorConexion}</span>
        </p>
      )}
      <form action={accion} className="card flotar-entrada w-full max-w-sm space-y-4 p-7">
        <div>
          <h1 className="text-xl font-semibold">
            Expedientes <span className="text-brand">SPR</span>
          </h1>
          <p className="text-sm text-muted">
            {primerUso ? "Primer uso: crea el usuario administrador. Después podrás agregar al resto del equipo desde «Mi perfil»." : "Ingresa con tu cuenta del equipo."}
          </p>
        </div>
        {primerUso && (
          <div>
            <label className="label" htmlFor="nombre">Tu nombre</label>
            <input className="input" id="nombre" name="nombre" required autoComplete="name" defaultValue={estado?.nombre} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="usuario">Usuario</label>
          <input className="input" id="usuario" name="usuario" required autoComplete="username" autoCapitalize="none" autoFocus={!primerUso} defaultValue={estado?.usuario} />
        </div>
        <div>
          <label className="label" htmlFor="clave">Contraseña</label>
          <input className="input" id="clave" name="clave" type="password" required minLength={primerUso ? 6 : undefined} autoComplete={primerUso ? "new-password" : "current-password"} />
        </div>
        {primerUso && (
          <div>
            <label className="label" htmlFor="clave2">Repite la contraseña</label>
            <input className="input" id="clave2" name="clave2" type="password" required minLength={6} autoComplete="new-password" />
          </div>
        )}
        {error && <p key={error} className="sacudir rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={enviando}>
          {enviando ? "Un momento…" : primerUso ? "Crear y entrar" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
