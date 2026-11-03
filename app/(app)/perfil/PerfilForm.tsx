"use client";

import { useActionState, useState, useTransition } from "react";
import { subirArchivo } from "@/lib/subir";
import type { Profile } from "@/lib/types";
import { cambiarClave, guardarDocumentoPerfil, guardarPerfil } from "./actions";

export function Mensaje({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <span key={mensaje} className={`text-sm ${mensaje === "Guardado" ? "animar-entrada text-ok" : "sacudir text-danger"}`}>
      {mensaje === "Guardado" ? "✓ Guardado" : mensaje}
    </span>
  );
}

export function PerfilForm({ perfil }: { perfil: Profile }) {
  const [mensaje, accion, enviando] = useActionState(guardarPerfil, null);
  const [mensajeClave, accionClave, enviandoClave] = useActionState(cambiarClave, null);

  return (
    <>
      <form action={accion} className="card cascada space-y-3 p-6">
        <p className="text-sm text-muted">
          Usuario: <span className="font-medium text-text">{perfil.usuario}</span>
        </p>
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input className="input" id="nombre" name="nombre" defaultValue={perfil.nombre} required />
        </div>
        <div>
          <label className="label" htmlFor="rut">RUT</label>
          <input className="input" id="rut" name="rut" defaultValue={perfil.rut ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="profesion">Profesión (para la viñeta de los planos)</label>
          <input className="input" id="profesion" name="profesion" defaultValue={perfil.profesion ?? ""} placeholder="Técnico de nivel superior en topografía" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={enviando}>Guardar</button>
          <Mensaje mensaje={mensaje} />
        </div>
      </form>

      <div className="card cascada space-y-4 p-6" style={{ "--i": 1 } as React.CSSProperties}>
        <div>
          <h2 className="font-semibold">Documentos del profesional</h2>
          <p className="text-sm text-muted">Se adjuntan automáticamente en los expedientes que crees.</p>
        </div>
        <Documento perfil={perfil} campo="carnet_path" titulo="Carnet profesional" />
        <Documento perfil={perfil} campo="titulo_path" titulo="Título profesional legalizado" />
      </div>

      <form action={accionClave} className="card cascada space-y-3 p-6" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="font-semibold">Cambiar contraseña</h2>
        <input className="input" name="actual" type="password" placeholder="Contraseña actual" required autoComplete="current-password" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" name="nueva" type="password" placeholder="Nueva (mín. 6)" required minLength={6} autoComplete="new-password" />
          <input className="input" name="nueva2" type="password" placeholder="Repite la nueva" required minLength={6} autoComplete="new-password" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" disabled={enviandoClave}>Cambiar contraseña</button>
          <Mensaje mensaje={mensajeClave} />
        </div>
      </form>
    </>
  );
}

function Documento({ perfil, campo, titulo }: { perfil: Profile; campo: "carnet_path" | "titulo_path"; titulo: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actual = perfil[campo];

  async function subir(archivo: File) {
    setError(null);
    try {
      const path = await subirArchivo(`perfiles/${perfil.id}`, archivo);
      iniciar(() => guardarDocumentoPerfil(campo, path));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className={`transition-opacity ${pendiente ? "opacity-60" : ""}`}>
      <label className="label">{titulo}</label>
      {actual && (
        <a href={`/archivo?path=${encodeURIComponent(actual)}`} target="_blank" className="mb-1 block text-sm text-brand hover:underline">
          Ver documento actual
        </a>
      )}
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input" onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
