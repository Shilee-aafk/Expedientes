"use client";

import { useActionState, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { guardarDocumentoPerfil, guardarPerfil } from "./actions";

export function PerfilForm({ perfil, email }: { perfil: Profile; email: string }) {
  const [mensaje, accion, enviando] = useActionState(guardarPerfil, null);

  return (
    <>
      <form action={accion} className="card space-y-3 p-6">
        <p className="text-sm text-muted">{email}</p>
        <div>
          <label className="label" htmlFor="nombre">Nombre</label>
          <input className="input" id="nombre" name="nombre" defaultValue={perfil.nombre} required />
        </div>
        <div>
          <label className="label" htmlFor="rut">RUT</label>
          <input className="input" id="rut" name="rut" defaultValue={perfil.rut ?? ""} />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={enviando}>Guardar</button>
          {mensaje && <span className={`text-sm ${mensaje === "Guardado" ? "text-ok" : "text-danger"}`}>{mensaje}</span>}
        </div>
      </form>

      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-semibold">Documentos del profesional</h2>
          <p className="text-sm text-muted">Se adjuntan automáticamente en los expedientes nuevos donde seas el profesional responsable.</p>
        </div>
        <Documento perfil={perfil} campo="carnet_path" titulo="Carnet profesional" />
        <Documento perfil={perfil} campo="titulo_path" titulo="Título profesional legalizado" />
      </div>
    </>
  );
}

function Documento({ perfil, campo, titulo }: { perfil: Profile; campo: "carnet_path" | "titulo_path"; titulo: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actual = perfil[campo];

  async function subir(archivo: File) {
    setError(null);
    const limpio = archivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
    const path = `perfiles/${perfil.id}/${Date.now()}-${limpio}`;
    const { error } = await createClient().storage.from("documentos").upload(path, archivo);
    if (error) return setError("No se pudo subir: " + error.message);
    iniciar(() => guardarDocumentoPerfil(campo, path));
  }

  return (
    <div className={pendiente ? "opacity-60" : ""}>
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
