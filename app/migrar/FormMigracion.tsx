"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Select } from "@/components/Select";
import type { ResumenLocal } from "@/lib/migracion";
import { ejecutarMigracion, type EstadoMigracion } from "./actions";

export function FormMigracion({ local }: { local: ResumenLocal }) {
  const [estado, accion, enviando] = useActionState<EstadoMigracion, FormData>(ejecutarMigracion, null);
  const r = estado?.resultado;

  if (r) {
    return (
      <div className="card flotar-entrada w-full max-w-md space-y-4 p-7">
        <h1 className="text-xl font-semibold">Datos subidos a Supabase ✓</h1>
        <ul className="space-y-1 text-sm">
          <li>{r.usuarios} usuario(s)</li>
          <li>{r.expedientes} expediente(s) con su checklist, dueños e historial</li>
          <li>{r.archivos} archivo(s) adjunto(s)</li>
        </ul>
        <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm">
          Todos entran con su mismo usuario y la contraseña temporal que definiste. Pídeles cambiarla en <b>Mi perfil</b>.
          Los datos siguen guardados también en este equipo, como respaldo.
        </p>
        {r.avisos.length > 0 && (
          <div className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            <p className="font-medium">Avisos:</p>
            <ul className="list-disc pl-5">{r.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
        <Link href="/expedientes" className="btn-primary w-full">Entrar a la app</Link>
      </div>
    );
  }

  return (
    <form action={accion} className="card flotar-entrada w-full max-w-md space-y-4 p-7">
      <div>
        <h1 className="text-xl font-semibold">Subir datos a Supabase</h1>
        <p className="text-sm text-muted">
          Este equipo tiene {local.expedientes} expediente(s) y {local.usuarios} usuario(s) de la versión anterior. Se suben a la
          base compartida con sus mismos códigos, historial y archivos. Nada se borra de este equipo.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="admin">¿Quién eres?</label>
        <Select
          id="admin"
          name="admin"
          defaultValue={estado?.admin ?? String(local.nombres[0]?.usuario ?? "")}
          opciones={local.nombres.map((n) => ({ value: n.usuario, label: `${n.nombre} (${n.usuario})` }))}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted">
          Las contraseñas no se pueden trasladar. Define una <b>contraseña temporal</b> para todos los usuarios:
          {" "}{local.nombres.map((n) => n.usuario).join(", ")}. Cada uno la cambia después en Mi perfil.
        </p>
        <input className="input" name="clave" type="password" placeholder="Contraseña temporal (mín. 6)" required minLength={6} autoComplete="new-password" />
        <input className="input" name="clave2" type="password" placeholder="Repite la contraseña temporal" required minLength={6} autoComplete="new-password" />
      </div>
      {estado?.error && <p key={estado.error} className="sacudir rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{estado.error}</p>}
      <button className="btn-primary w-full" disabled={enviando}>
        {enviando ? "Subiendo… (puede tardar si hay muchos archivos)" : "Subir datos"}
      </button>
      <Link href="/login" className="block text-center text-sm text-muted hover:text-brand">Ahora no</Link>
    </form>
  );
}
