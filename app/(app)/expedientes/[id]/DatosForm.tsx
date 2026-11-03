"use client";

import { useActionState } from "react";
import { SelectorFecha } from "@/components/SelectorFecha";
import type { Expediente } from "@/lib/types";
import { guardarDatos } from "../actions";

export function DatosForm({ expediente: e }: { expediente: Expediente }) {
  const [mensaje, accion, enviando] = useActionState(guardarDatos.bind(null, e.id), null);
  const campo = (name: keyof Expediente, label: string, placeholder?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} defaultValue={e[name] == null ? "" : String(e[name])} placeholder={placeholder} />
    </div>
  );

  return (
    <form action={accion} className="card space-y-3 p-4">
      <h2 className="font-semibold">Datos del expediente</h2>
      {campo("predio", "Predio")}
      <div className="grid grid-cols-2 gap-2">
        {campo("rol_sii", "Rol SII")}
        {campo("comuna", "Comuna")}
      </div>

      <details className="group" open={!!(e.region || e.inscripcion_fojas)}>
        <summary className="cursor-pointer list-none pt-2 text-sm font-semibold text-muted">
          <span className="inline-block transition-transform group-open:rotate-90">›</span> Datos para el plano (viñeta)
        </summary>
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {campo("region", "Región", "Los Lagos")}
            {campo("provincia", "Provincia", "Llanquihue")}
          </div>
          {campo("sector", "Sector", "Putenio")}
          <p className="pt-1 text-xs font-semibold text-muted">Inscripción de dominio</p>
          <div className="grid grid-cols-3 gap-2">
            {campo("inscripcion_fojas", "Fojas", "5400v")}
            {campo("inscripcion_numero", "N°", "7033")}
            {campo("inscripcion_anio", "Año", "2016")}
          </div>
          {campo("conservador", "Conservador de Bienes Raíces de", "Puerto Montt")}
          {campo("plano_base", "Plano base", "N° 7030 del año 2021")}
          <div className="grid grid-cols-2 gap-2">
            {campo("lamina", "Lámina", "A")}
            {campo("escala", "Escala 1:", "1000")}
          </div>
          <p className="pt-1 text-xs font-semibold text-muted">Coordenadas de acceso (UTM WGS84)</p>
          <div className="grid grid-cols-3 gap-2">
            {campo("acceso_norte", "Norte", "5385060,902")}
            {campo("acceso_este", "Este", "655252,890")}
            {campo("huso", "Huso", "18S")}
          </div>
        </div>
      </details>

      <h3 className="pt-2 text-sm font-semibold text-muted">Seguimiento del envío</h3>
      {campo("tercero_autorizado", "Tercero autorizado")}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="fecha_envio">Fecha de envío</label>
          <SelectorFecha id="fecha_envio" name="fecha_envio" defaultValue={e.fecha_envio} />
        </div>
        <div>
          <label className="label" htmlFor="fecha_respuesta">Fecha de respuesta</label>
          <SelectorFecha id="fecha_respuesta" name="fecha_respuesta" defaultValue={e.fecha_respuesta} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="observaciones">Observaciones recibidas</label>
        <textarea className="input" id="observaciones" name="observaciones" rows={3} defaultValue={e.observaciones ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="notas">Notas internas</label>
        <textarea className="input" id="notas" name="notas" rows={2} defaultValue={e.notas ?? ""} />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={enviando}>Guardar</button>
        {mensaje && <span className={`text-sm ${mensaje === "Guardado" ? "animar-entrada text-ok" : "sacudir text-danger"}`}>{mensaje === "Guardado" ? "✓ Guardado" : mensaje}</span>}
      </div>
    </form>
  );
}
