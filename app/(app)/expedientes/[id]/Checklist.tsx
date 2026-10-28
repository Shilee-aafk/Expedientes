"use client";

import { useOptimistic, useState, useTransition } from "react";
import { cantidadRequerida, fechaVencimiento, itemCumplido, vigencia, type Vigencia } from "@/lib/checklist";
import { formatoFecha } from "@/lib/formato";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { actualizarItem, type CambioItem } from "../actions";

const TEXTO_VIGENCIA: Record<Vigencia, [string, string]> = {
  vigente: ["Vigente", "text-ok"],
  por_vencer: ["Por vencer", "text-warn"],
  vencido: ["Vencido", "text-danger"],
  sin_fecha: ["Falta fecha de emisión", "text-warn"],
};

type Props = { items: Item[]; numDuenos: number; hoy: string; expedienteId: number };

export function Checklist(props: Props) {
  return (
    <ul className="space-y-2">
      {props.items.map((item, i) => (
        <ChecklistItem key={item.id} item={item} indice={i} {...props} />
      ))}
    </ul>
  );
}

function ChecklistItem({ item: real, indice, numDuenos, hoy, expedienteId }: Props & { item: Item; indice: number }) {
  // El cambio se ve al instante; si el servidor falla, vuelve al valor real.
  const [item, aplicarOptimista] = useOptimistic(real, (actual: Item, cambio: CambioItem) => ({ ...actual, ...cambio }));
  const [, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [celebrar, setCelebrar] = useState(false);

  const requerida = cantidadRequerida(item, numDuenos);
  const cumplido = itemCumplido(item, numDuenos, hoy);
  const v = item.estado === "listo" ? vigencia(item, hoy) : null;
  const noAplica = item.estado === "no_aplica";

  const guardar = (cambio: CambioItem) => {
    const completa = itemCumplido({ ...item, ...cambio }, numDuenos, hoy) && !cumplido;
    if (completa) setCelebrar(true);
    iniciar(async () => {
      aplicarOptimista(cambio);
      setError(null);
      try {
        await actualizarItem(item.id, cambio);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const marcar = (listo: boolean) => guardar({ estado: listo ? "listo" : "pendiente", cantidad_entregada: listo ? requerida : 0 });
  const contar = (n: number) => {
    const cantidad = Math.max(0, Math.min(n, requerida));
    if (cantidad === item.cantidad_entregada) return;
    guardar({ cantidad_entregada: cantidad, estado: cantidad >= requerida ? "listo" : "pendiente" });
  };

  async function subir(archivo: File) {
    setSubiendo(true);
    const limpio = archivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
    const path = `expedientes/${expedienteId}/${item.id}/${Date.now()}-${limpio}`;
    const { error } = await createClient().storage.from("documentos").upload(path, archivo);
    setSubiendo(false);
    if (error) return setError("No se pudo subir el archivo: " + error.message);
    guardar({ archivo_path: path });
  }

  const borde = noAplica ? "opacity-55" : cumplido ? "border-ok/40" : v === "vencido" ? "border-danger/50" : "";

  return (
    <li
      className={`card cascada p-3 ${borde} ${celebrar ? "brillo-ok" : ""}`}
      style={{ "--i": indice } as React.CSSProperties}
      onAnimationEnd={(e) => e.animationName === "brillo-ok" && setCelebrar(false)}
    >
      <div className="flex flex-wrap items-center gap-3">
        {requerida > 1 ? (
          <div className="flex items-center gap-1">
            <button type="button" className="btn-secondary h-8 w-8 p-0" onClick={() => contar(item.cantidad_entregada - 1)} disabled={noAplica || item.cantidad_entregada === 0} aria-label="Restar">
              −
            </button>
            <span className={`w-12 text-center text-sm font-semibold tabular-nums transition-colors ${cumplido ? "text-ok" : ""}`}>
              <span key={item.cantidad_entregada} className="pop inline-block">
                {item.cantidad_entregada}
              </span>
              /{requerida}
            </span>
            <button type="button" className="btn-secondary h-8 w-8 p-0" onClick={() => contar(item.cantidad_entregada + 1)} disabled={noAplica || item.cantidad_entregada >= requerida} aria-label="Sumar">
              +
            </button>
          </div>
        ) : (
          <span className="check-wrap">
            <input type="checkbox" className="check" checked={item.estado === "listo"} disabled={noAplica} onChange={(e) => marcar(e.target.checked)} aria-label={item.nombre} />
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className={`font-medium transition-colors ${noAplica ? "text-muted line-through" : ""}`}>
            {item.nombre}
            {item.opcional && <span className="ml-2 text-xs font-normal text-muted">(opcional)</span>}
            {item.por_dueno && <span className="ml-2 text-xs font-normal text-muted">(uno por dueño)</span>}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted">
            {item.vence_en_dias && (
              <span>
                Vigencia {item.vence_en_dias} días
                {item.fecha_emision && ` · emitido ${formatoFecha(item.fecha_emision)} · vence ${formatoFecha(fechaVencimiento(item))}`}
              </span>
            )}
            {v && (
              <span key={v} className={`animar-entrada ${TEXTO_VIGENCIA[v][1]}`}>
                {TEXTO_VIGENCIA[v][0]}
              </span>
            )}
            {subiendo && <span className="animate-pulse text-brand">Subiendo archivo…</span>}
            {item.archivo_path && !subiendo && (
              <a href={`/archivo?path=${encodeURIComponent(item.archivo_path)}`} target="_blank" className="animar-entrada text-brand hover:underline">
                Ver archivo
              </a>
            )}
            {item.comentario && !abierto && <span className="italic">“{item.comentario}”</span>}
          </div>
        </div>

        <button type="button" className="btn-secondary gap-1 px-3 py-1 text-xs" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
          Detalles
          <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform duration-300 ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="desplegable" data-abierto={abierto} inert={!abierto}>
        <div>
          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            {item.vence_en_dias && (
              <div>
                <label className="label">Fecha de emisión</label>
                <input type="date" className="input" defaultValue={item.fecha_emision ?? ""} max={hoy} onChange={(e) => guardar({ fecha_emision: e.target.value || null })} />
              </div>
            )}
            <div>
              <label className="label">Archivo (PDF, imagen o KMZ)</label>
              <input type="file" className="input" accept=".pdf,.jpg,.jpeg,.png,.kmz,.kml,.dwg,.zip" disabled={subiendo} onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
              {item.archivo_path && (
                <button type="button" className="mt-1 text-xs text-danger hover:underline" onClick={() => guardar({ archivo_path: null })}>
                  Quitar archivo
                </button>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Comentario</label>
              <textarea className="input" rows={2} defaultValue={item.comentario ?? ""} onBlur={(e) => e.target.value !== (item.comentario ?? "") && guardar({ comentario: e.target.value || null })} />
            </div>
            {item.opcional && (
              <label className="flex items-center gap-2 text-sm">
                <span className="check-wrap">
                  <input type="checkbox" className="check" checked={noAplica} onChange={(e) => guardar({ estado: e.target.checked ? "no_aplica" : "pendiente", cantidad_entregada: 0 })} />
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                No aplica para este expediente
              </label>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p key={error} className="sacudir mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </li>
  );
}
