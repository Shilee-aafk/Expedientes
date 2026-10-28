"use client";

import { useActionState } from "react";
import { ingresar } from "./actions";

export default function LoginPage() {
  const [error, accion, enviando] = useActionState(ingresar, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={accion} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold text-brand">Expedientes SPR</h1>
          <p className="text-sm text-muted">Ingresa con tu cuenta del equipo.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={enviando}>
          {enviando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
