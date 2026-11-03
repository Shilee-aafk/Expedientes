import { fechaVencimiento, hoyChile, resumen } from "./checklist";
import type { EstadoExpediente, Item } from "./types";

/**
 * Días a partir de los cuales un expediente se considera detenido en cada estado.
 * (En "enviado" se espera la respuesta del tercero autorizado; en "observado" nos toca corregir.)
 */
export const PLAZOS: Partial<Record<EstadoExpediente, { dias: number; aviso: string }>> = {
  borrador: { dias: 30, aviso: "sin avances" },
  en_revision: { dias: 30, aviso: "sin avances" },
  listo_para_enviar: { dias: 7, aviso: "listo pero sin enviar" },
  enviado: { dias: 30, aviso: "sin respuesta del tercero autorizado" },
  observado: { dias: 10, aviso: "observaciones sin corregir" },
};

const TEXTO_ESTADO: Record<EstadoExpediente, string> = {
  borrador: "En borrador",
  en_revision: "En revisión",
  listo_para_enviar: "Listo para enviar",
  enviado: "Enviado",
  observado: "En observación",
  aprobado: "Aprobado",
};

export type DatosPlazo = {
  estado: EstadoExpediente;
  /** Último cambio de estado (columna estado_desde; puede no existir en bases antiguas) */
  estado_desde?: string | null;
  fecha_envio: string | null;
  fecha_respuesta: string | null;
  updated_at: string;
};

export type Plazo = {
  /** "Enviado hace 23 días", "Aprobado en 41 días" */
  texto: string;
  dias: number;
  /** Texto del aviso cuando superó el plazo de su estado */
  detenido: string | null;
};

const dia = (fecha: string) => {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86_400_000;
};
/** Fecha (AAAA-MM-DD) en Chile de un timestamp o de una fecha */
const fechaChile = (v: string) => (v.length <= 10 ? v : hoyChile(new Date(v)));
const diasEntre = (desde: string, hasta: string) => Math.max(0, Math.round(dia(hasta) - dia(fechaChile(desde))));
const plural = (n: number) => (n === 0 ? "hoy" : n === 1 ? "hace 1 día" : `hace ${n} días`);

export function plazo(e: DatosPlazo, hoy: string): Plazo {
  if (e.estado === "aprobado") {
    const dias = e.fecha_envio && e.fecha_respuesta ? diasEntre(e.fecha_envio, e.fecha_respuesta) : null;
    return { texto: dias === null ? "Aprobado" : `Aprobado en ${dias} día${dias === 1 ? "" : "s"}`, dias: dias ?? 0, detenido: null };
  }
  const desde = e.estado_desde ?? (e.estado === "enviado" ? e.fecha_envio : null) ?? e.updated_at;
  const dias = diasEntre(desde, hoy);
  const regla = PLAZOS[e.estado];
  return {
    texto: `${TEXTO_ESTADO[e.estado]} ${plural(dias)}`,
    dias,
    detenido: regla && dias >= regla.dias ? `${regla.aviso} (${dias} días)` : null,
  };
}

export type Aviso = {
  expedienteId: number;
  codigo: string;
  predio: string;
  gravedad: "alta" | "media";
  texto: string;
  /** para ordenar: los más urgentes primero */
  orden: number;
};

type ExpedienteAvisos = DatosPlazo & {
  id: number;
  codigo: string;
  predio: string;
  items: Item[];
  duenos: unknown[];
};

const fechaCorta = (f: string) => {
  const [, m, d] = f.split("-");
  return `${d}/${m}`;
};

/** Avisos de todos los expedientes no aprobados: certificados vencidos o por vencer y expedientes detenidos. */
export function avisos(expedientes: ExpedienteAvisos[], hoy: string): Aviso[] {
  const lista: Aviso[] = [];
  for (const e of expedientes) {
    if (e.estado === "aprobado") continue;
    const base = { expedienteId: e.id, codigo: e.codigo, predio: e.predio };
    const r = resumen(e.items, e.duenos.length, hoy);
    for (const i of r.vencidos) {
      const f = fechaVencimiento(i)!;
      lista.push({ ...base, gravedad: "alta", texto: `${i.nombre}: venció el ${fechaCorta(f)}`, orden: dia(f) - dia(hoy) });
    }
    for (const i of r.porVencer) {
      const f = fechaVencimiento(i)!;
      const n = dia(f) - dia(hoy);
      lista.push({ ...base, gravedad: "media", texto: `${i.nombre}: vence ${n === 0 ? "hoy" : n === 1 ? "mañana" : `en ${n} días`} (${fechaCorta(f)})`, orden: 100 + n });
    }
    const p = plazo(e, hoy);
    if (p.detenido) lista.push({ ...base, gravedad: e.estado === "observado" ? "alta" : "media", texto: `${TEXTO_ESTADO[e.estado]}: ${p.detenido}`, orden: 50 - p.dias / 100 });
  }
  return lista.sort((a, b) => (a.gravedad === b.gravedad ? a.orden - b.orden : a.gravedad === "alta" ? -1 : 1));
}
