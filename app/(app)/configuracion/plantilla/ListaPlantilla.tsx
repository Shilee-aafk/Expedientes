"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Confirmar } from "@/components/Confirmar";
import { Interruptor } from "@/components/Interruptor";
import { Select } from "@/components/Select";
import type { Requisito } from "@/lib/types";
import { cambiarActivo, eliminarRequisito, guardarRequisito } from "./actions";

const ORIGEN = { carnet: "Carnet prof.", titulo: "Título prof." } as const;

const iconoLapiz = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
  </svg>
);
const iconoBasurero = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

/** Lista compacta: una fila por requisito con sus características como etiquetas; se edita en línea. */
export function ListaPlantilla({ requisitos }: { requisitos: Requisito[] }) {
  const [editando, setEditando] = useState<number | "nuevo" | null>(null);
  const siguiente = (requisitos.at(-1)?.orden ?? 0) + 1;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setEditando(editando === "nuevo" ? null : "nuevo")}>
          + Agregar requisito
        </button>
      </div>

      <div className="desplegable" data-abierto={editando === "nuevo"} inert={editando !== "nuevo"}>
        <div>
          <div className="card p-4">
            <h2 className="mb-3 font-semibold">Nuevo requisito</h2>
            {editando === "nuevo" && <Editor r={null} orden={siguiente} alTerminar={() => setEditando(null)} />}
          </div>
        </div>
      </div>

      <ul className="card divide-y divide-border">
        {requisitos.map((r, i) => (
          <Fila key={r.id} r={r} indice={i} abierto={editando === r.id} alternar={() => setEditando(editando === r.id ? null : r.id)} />
        ))}
        {requisitos.length === 0 && <li className="p-8 text-center text-muted">No hay requisitos. Agrega el primero.</li>}
      </ul>
    </div>
  );
}

function Etiqueta({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "marca" }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${tono === "marca" ? "bg-brand-soft text-brand" : "bg-bg text-muted"}`}>
      {children}
    </span>
  );
}

function Fila({ r, indice, abierto, alternar }: { r: Requisito; indice: number; abierto: boolean; alternar: () => void }) {
  const [activo, setActivo] = useOptimistic(r.activo);
  const [, iniciar] = useTransition();

  return (
    <li className="cascada" style={{ "--i": indice } as React.CSSProperties}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-opacity ${activo ? "" : "opacity-50"}`}>
        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted">{r.orden}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-medium">{r.nombre}</span>
            {r.cantidad > 1 && <Etiqueta tono="marca">×{r.cantidad}</Etiqueta>}
            {r.vence_en_dias && <Etiqueta tono="marca">Vigencia {r.vence_en_dias} días</Etiqueta>}
            {r.por_dueno && <Etiqueta>Uno por dueño</Etiqueta>}
            {r.opcional && <Etiqueta>Opcional</Etiqueta>}
            {r.origen_perfil && <Etiqueta>Desde perfil: {ORIGEN[r.origen_perfil]}</Etiqueta>}
          </div>
          {r.descripcion && <p className="truncate text-xs text-muted">{r.descripcion}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Interruptor
            label={<span className="text-xs text-muted">{activo ? "Activo" : "Inactivo"}</span>}
            checked={activo}
            onChange={(v) =>
              iniciar(async () => {
                setActivo(v);
                await cambiarActivo(r.id, v);
              })
            }
          />
          <button type="button" className={`btn-secondary h-9 w-9 p-0 ${abierto ? "bg-brand-soft text-brand" : ""}`} onClick={alternar} aria-label={`Editar ${r.nombre}`} aria-expanded={abierto}>
            {iconoLapiz}
          </button>
          <Confirmar
            accion={() => eliminarRequisito(r.id)}
            titulo="¿Eliminar este requisito?"
            mensaje={`«${r.nombre}» dejará de aparecer en los expedientes nuevos. Los expedientes ya creados lo conservan.`}
            className="btn-danger h-9 w-9 p-0"
            aria-label={`Eliminar ${r.nombre}`}
          >
            {iconoBasurero}
          </Confirmar>
        </div>
      </div>
      <div className="desplegable" data-abierto={abierto} inert={!abierto}>
        <div>
          <div className="border-t border-border bg-bg px-4 py-4 [li:last-child_&]:rounded-b-2xl">{abierto && <Editor r={r} alTerminar={alternar} />}</div>
        </div>
      </div>
    </li>
  );
}

function Editor({ r, orden, alTerminar }: { r: Requisito | null; orden?: number; alTerminar: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <form
      action={(f) =>
        iniciar(async () => {
          const e = await guardarRequisito(r?.id ?? null, f);
          setError(e);
          if (!e) alTerminar();
        })
      }
      className="grid items-end gap-3 sm:grid-cols-[4rem_1fr_5rem_7rem_9rem]"
    >
      <div>
        <label className="label">Orden</label>
        <input name="orden" type="number" className="input" defaultValue={r?.orden ?? orden} />
      </div>
      <div>
        <label className="label">Requisito</label>
        <input name="nombre" className="input" defaultValue={r?.nombre} required autoFocus />
      </div>
      <div>
        <label className="label">Cantidad</label>
        <input name="cantidad" type="number" min={1} className="input" defaultValue={r?.cantidad ?? 1} />
      </div>
      <div>
        <label className="label" title="Días de vigencia desde la emisión">Vigencia (días)</label>
        <input name="vence_en_dias" type="number" min={1} className="input" defaultValue={r?.vence_en_dias ?? ""} placeholder="No vence" />
      </div>
      <div>
        <label className="label">Desde perfil</label>
        <Select
          name="origen_perfil"
          defaultValue={r?.origen_perfil ?? ""}
          opciones={[
            { value: "", label: "No" },
            { value: "carnet", label: "Carnet prof." },
            { value: "titulo", label: "Título prof." },
          ]}
        />
      </div>
      <div className="sm:col-span-5">
        <input name="descripcion" className="input" defaultValue={r?.descripcion ?? ""} placeholder="Descripción o indicaciones (opcional)" />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:col-span-5">
        <Interruptor name="opcional" label="Opcional" defaultChecked={r?.opcional} />
        <Interruptor name="por_dueno" label="Uno por dueño" defaultChecked={r?.por_dueno} />
        <Interruptor name="activo" label="Activo" defaultChecked={r?.activo ?? true} />
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-secondary" onClick={alTerminar}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={pendiente}>
            {pendiente ? "Guardando…" : r ? "Guardar" : "Agregar"}
          </button>
        </div>
      </div>
      {error && <p key={error} className="sacudir text-sm text-danger sm:col-span-5">{error}</p>}
    </form>
  );
}
