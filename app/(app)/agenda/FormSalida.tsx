"use client";

import { startTransition, useActionState, useState } from "react";
import { Interruptor } from "@/components/Interruptor";
import { Select } from "@/components/Select";
import { SelectorFecha } from "@/components/SelectorFecha";
import { ETIQUETA_TIPO_EQUIPO, type Equipo, type Salida } from "@/lib/agenda";
import { guardarSalida, type EstadoFormSalida } from "./actions";

type Props = {
  salida?: Salida;
  fechaInicial?: string;
  expedienteInicial?: number;
  expedientes: { id: number; codigo: string; predio: string }[];
  personas: { id: string; nombre: string }[];
  equipos: Equipo[];
  /** A dónde volver al guardar (por ejemplo, el expediente) */
  volver?: string;
};

/** Programar o editar una salida a terreno: expediente, fecha y horario, quiénes van y qué equipos llevan. */
export function FormSalida({ salida: s, fechaInicial, expedienteInicial, expedientes, personas, equipos, volver }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormSalida, FormData>(guardarSalida.bind(null, s?.id ?? null, volver ?? null), null);
  const [expediente, setExpediente] = useState(String(s?.expediente_id ?? expedienteInicial ?? ""));
  const elegidosP = new Set(s?.personas.map((p) => p.id) ?? []);
  const elegidosE = new Set(s?.equipos.map((e) => e.id) ?? []);
  // Equipos dados de baja que esta salida ya tenía: se siguen mostrando
  const listaEquipos = [...equipos, ...(s?.equipos.filter((e) => !equipos.some((x) => x.id === e.id)).map((e) => ({ ...e, tipo: "otro" as const, activo: false })) ?? [])];

  return (
    // onSubmit en vez de action: así el formulario no se vacía cuando hay que confirmar choques
    <form
      className="card cascada space-y-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => accion(datos));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Expediente</label>
          <Select
            name="expediente_id"
            value={expediente}
            onChange={setExpediente}
            aria-label="Expediente"
            opciones={[{ value: "", label: "Sin expediente (otro trabajo)" }, ...expedientes.map((e) => ({ value: String(e.id), label: `${e.predio} · ${e.codigo}` }))]}
          />
        </div>
        {!expediente && (
          <div className="animar-entrada sm:col-span-2">
            <label className="label" htmlFor="titulo">¿De qué es la salida? *</label>
            <input className="input" id="titulo" name="titulo" defaultValue={s?.titulo ?? ""} placeholder="Levantamiento Fundo Los Alerces, replanteo…" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="fecha">Fecha *</label>
          <SelectorFecha id="fecha" name="fecha" defaultValue={s?.fecha ?? fechaInicial} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="hora_inicio">Desde</label>
            <input className="input" type="time" id="hora_inicio" name="hora_inicio" defaultValue={s?.hora_inicio?.slice(0, 5) ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="hora_fin">Hasta</label>
            <input className="input" type="time" id="hora_fin" name="hora_fin" defaultValue={s?.hora_fin?.slice(0, 5) ?? ""} />
          </div>
          <p className="col-span-2 text-xs text-muted">Sin horas = todo el día.</p>
        </div>
      </div>

      <fieldset>
        <legend className="label">¿Quiénes van?</legend>
        <div className="flex flex-wrap gap-2">
          {personas.map((p) => (
            <Interruptor key={p.id} name="personas" value={p.id} label={p.nombre} defaultChecked={elegidosP.has(p.id)} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Equipos</legend>
        {listaEquipos.length ? (
          <div className="flex flex-wrap gap-2">
            {listaEquipos.map((e) => (
              <Interruptor
                key={e.id}
                name="equipos"
                value={String(e.id)}
                label={
                  <>
                    {e.nombre} <span className="opacity-60">· {e.activo ? ETIQUETA_TIPO_EQUIPO[e.tipo] : "de baja"}</span>
                  </>
                }
                defaultChecked={elegidosE.has(e.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Aún no hay equipos. Agrégalos en la Agenda, sección «Equipos».</p>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor="notas">Notas</label>
        <textarea className="input" id="notas" name="notas" rows={3} defaultValue={s?.notas ?? ""} placeholder="Qué hay que medir, contacto en terreno, cómo llegar…" />
      </div>

      {estado?.error && <p key={estado.error} className="sacudir rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{estado.error}</p>}
      {estado?.avisos && (
        <div className="animar-entrada space-y-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">
          <p className="font-medium">Ojo, hay choques de horario:</p>
          <ul className="list-disc pl-5">
            {estado.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <button name="confirmado" value="1" className="btn-secondary px-3 py-1 text-xs" disabled={enviando}>
            Guardar igual
          </button>
        </div>
      )}
      <button className="btn-primary" disabled={enviando}>
        {enviando ? "Guardando…" : s ? "Guardar cambios" : "Programar salida"}
      </button>
    </form>
  );
}
