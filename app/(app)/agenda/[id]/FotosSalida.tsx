"use client";

import { useState } from "react";
import { Confirmar } from "@/components/Confirmar";
import type { ArchivoSalida } from "@/lib/agenda";
import { subirArchivo } from "@/lib/subir";
import { agregarArchivoSalida, quitarArchivoSalida } from "../actions";

const esImagen = (n: string) => /\.(jpe?g|png|webp|heic|gif)$/i.test(n);

/** Fotos y archivos de terreno (croquis, libreta, puntos). */
export function FotosSalida({ salidaId, archivos }: { salidaId: number; archivos: ArchivoSalida[] }) {
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function subir(lista: FileList) {
    setError(null);
    setSubiendo(lista.length);
    for (const a of Array.from(lista)) {
      try {
        const ruta = await subirArchivo(`salidas/${salidaId}`, a);
        await agregarArchivoSalida(salidaId, ruta, a.name);
      } catch (e) {
        setError(`${a.name}: ${(e as Error).message}`);
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  }

  return (
    <div className="card cascada space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Fotos y archivos de terreno</h2>
        <label className="btn-secondary cursor-pointer px-3 py-1 text-xs">
          {subiendo > 0 ? `Subiendo ${subiendo}…` : "Agregar"}
          <input type="file" multiple className="sr-only" accept="image/*,.pdf,.csv,.txt,.kmz,.kml,.dwg,.zip" disabled={subiendo > 0} onChange={(e) => e.target.files?.length && subir(e.target.files)} />
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {archivos.length === 0 ? (
        <p className="text-sm text-muted">Sube fotos de los vértices, del acceso o la libreta de terreno.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {archivos.map((a) => (
            <li key={a.id} className="group relative overflow-hidden rounded-xl border border-border">
              <a href={`/archivo?path=${encodeURIComponent(a.ruta)}`} target="_blank" rel="noreferrer" className="block">
                {esImagen(a.nombre) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/archivo?path=${encodeURIComponent(a.ruta)}`} alt={a.nombre} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-muted">{a.nombre}</div>
                )}
              </a>
              <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Confirmar accion={() => quitarArchivoSalida(salidaId, a.id)} titulo="¿Quitar este archivo?" mensaje={a.nombre} textoConfirmar="Quitar" className="btn-danger px-2 py-0.5 text-xs">
                  ✕
                </Confirmar>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
