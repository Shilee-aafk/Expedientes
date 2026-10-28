import type { EstadoExpediente, Item } from "./types";

/** Días antes del vencimiento en que un certificado se marca "por vencer". */
export const AVISO_DIAS = 7;

type ItemChecklist = Pick<
  Item,
  | "id"
  | "nombre"
  | "opcional"
  | "cantidad_requerida"
  | "por_dueno"
  | "vence_en_dias"
  | "estado"
  | "cantidad_entregada"
  | "fecha_emision"
>;

export type Vigencia = "vigente" | "por_vencer" | "vencido" | "sin_fecha";

/** Fecha de hoy en Chile como AAAA-MM-DD. */
export function hoyChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora);
}

function diaNumero(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86_400_000;
}

export function sumarDias(fecha: string, dias: number): string {
  return new Date((diaNumero(fecha) + dias) * 86_400_000).toISOString().slice(0, 10);
}

/** Cantidad exigida: un documento por dueño cuando corresponde. */
export function cantidadRequerida(item: ItemChecklist, numDuenos: number): number {
  return item.por_dueno ? Math.max(numDuenos, 1) : item.cantidad_requerida;
}

export function fechaVencimiento(item: ItemChecklist): string | null {
  if (!item.vence_en_dias || !item.fecha_emision) return null;
  return sumarDias(item.fecha_emision, item.vence_en_dias);
}

/** null cuando el requisito no tiene vigencia. */
export function vigencia(item: ItemChecklist, hoy: string): Vigencia | null {
  if (!item.vence_en_dias) return null;
  const vence = fechaVencimiento(item);
  if (!vence) return "sin_fecha";
  const restantes = diaNumero(vence) - diaNumero(hoy);
  if (restantes < 0) return "vencido";
  if (restantes <= AVISO_DIAS) return "por_vencer";
  return "vigente";
}

/** Un requisito cuenta como cumplido si está listo, con la cantidad completa y vigente. */
export function itemCumplido(item: ItemChecklist, numDuenos: number, hoy: string): boolean {
  if (item.estado !== "listo") return false;
  if (item.cantidad_entregada < cantidadRequerida(item, numDuenos)) return false;
  const v = vigencia(item, hoy);
  return v === null || v === "vigente" || v === "por_vencer";
}

export type Resumen = {
  total: number;
  cumplidos: number;
  porcentaje: number;
  pendientes: ItemChecklist[];
  vencidos: ItemChecklist[];
  porVencer: ItemChecklist[];
  listoParaEnviar: boolean;
};

/** Avance del expediente. Los opcionales y los "no aplica" no cuentan en el total. */
export function resumen(items: ItemChecklist[], numDuenos: number, hoy: string): Resumen {
  const exigidos = items.filter((i) => !i.opcional && i.estado !== "no_aplica");
  const pendientes = exigidos.filter((i) => !itemCumplido(i, numDuenos, hoy));
  const conVigencia = items.filter((i) => i.estado === "listo");
  const vencidos = conVigencia.filter((i) => vigencia(i, hoy) === "vencido");
  const porVencer = conVigencia.filter((i) => vigencia(i, hoy) === "por_vencer");
  const cumplidos = exigidos.length - pendientes.length;
  return {
    total: exigidos.length,
    cumplidos,
    porcentaje: exigidos.length ? Math.round((cumplidos / exigidos.length) * 100) : 0,
    pendientes,
    vencidos,
    porVencer,
    listoParaEnviar: pendientes.length === 0 && vencidos.length === 0,
  };
}

/** Estados a los que no se puede pasar con requisitos pendientes o vencidos. */
export function requiereChecklistCompleto(estado: EstadoExpediente): boolean {
  return estado === "listo_para_enviar" || estado === "enviado";
}
