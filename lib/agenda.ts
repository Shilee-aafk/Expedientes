import { hoyChile, sumarDias } from "./checklist";

export const TIPOS_EQUIPO = ["estacion_total", "gps", "dron", "nivel", "otro"] as const;
export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];
export const ETIQUETA_TIPO_EQUIPO: Record<TipoEquipo, string> = {
  estacion_total: "Estación total",
  gps: "GPS / GNSS",
  dron: "Dron",
  nivel: "Nivel",
  otro: "Otro",
};

export type Equipo = { id: number; nombre: string; tipo: TipoEquipo; activo: boolean };

export const ESTADOS_SALIDA = ["programada", "realizada", "cancelada"] as const;
export type EstadoSalida = (typeof ESTADOS_SALIDA)[number];
export const ETIQUETA_SALIDA: Record<EstadoSalida, string> = { programada: "Programada", realizada: "Realizada", cancelada: "Cancelada" };

export type Salida = {
  id: number;
  expediente_id: number | null;
  titulo: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: EstadoSalida;
  notas: string | null;
  resultado: string | null;
  expediente: { codigo: string; predio: string } | null;
  personas: { id: string; nombre: string }[];
  equipos: { id: number; nombre: string }[];
};

export type ArchivoSalida = { id: number; ruta: string; nombre: string; created_at: string };

/** Lunes de la semana de `fecha` (AAAA-MM-DD). */
export function inicioSemana(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

export function diasSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** "lunes 17 nov" */
export function nombreDia(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${NOMBRES_DIA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} ${MESES[m - 1]}`;
}

/** "17 – 23 nov 2026" o "28 dic – 3 ene 2027" */
export function rangoSemana(lunes: string): string {
  const fin = sumarDias(lunes, 6);
  const [, m1, d1] = lunes.split("-").map(Number);
  const [a2, m2, d2] = fin.split("-").map(Number);
  return m1 === m2 ? `${d1} – ${d2} ${MESES[m2 - 1]} ${a2}` : `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]} ${a2}`;
}

const minutos = (h: string | null) => {
  if (!h) return null;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};

/** "09:00 – 13:00", "desde 09:00" o "Todo el día" */
export function horario(s: Pick<Salida, "hora_inicio" | "hora_fin">): string {
  const i = s.hora_inicio?.slice(0, 5);
  const f = s.hora_fin?.slice(0, 5);
  if (i && f) return `${i} – ${f}`;
  if (i) return `desde ${i}`;
  if (f) return `hasta ${f}`;
  return "Todo el día";
}

/** Dos salidas del mismo día se cruzan si sus horarios se tocan (sin hora = todo el día). */
export function seCruzan(a: Pick<Salida, "fecha" | "hora_inicio" | "hora_fin">, b: Pick<Salida, "fecha" | "hora_inicio" | "hora_fin">): boolean {
  if (a.fecha !== b.fecha) return false;
  const ai = minutos(a.hora_inicio) ?? 0, af = minutos(a.hora_fin) ?? 24 * 60;
  const bi = minutos(b.hora_inicio) ?? 0, bf = minutos(b.hora_fin) ?? 24 * 60;
  return ai < bf && bi < af;
}

type Propuesta = Pick<Salida, "fecha" | "hora_inicio" | "hora_fin"> & { id?: number; personas: string[]; equipos: number[] };

/** Avisos de choque: la misma persona o el mismo equipo en otra salida que se cruza. */
export function choques(p: Propuesta, otras: Salida[]): string[] {
  const avisos: string[] = [];
  for (const o of otras) {
    if (o.id === p.id || o.estado === "cancelada" || !seCruzan(p, o)) continue;
    const donde = o.expediente ? `${o.expediente.predio} (${o.expediente.codigo})` : o.titulo || "otra salida";
    for (const per of o.personas) if (p.personas.includes(per.id)) avisos.push(`${per.nombre} ya está en ${donde}, ${horario(o)}.`);
    for (const eq of o.equipos) if (p.equipos.includes(eq.id)) avisos.push(`${eq.nombre} ya está reservado para ${donde}, ${horario(o)}.`);
  }
  return avisos;
}

/** Salidas que ya pasaron y siguen como "programada" (hay que marcarlas realizadas o canceladas). */
export function sinCerrar(salidas: Salida[], hoy = hoyChile()): Salida[] {
  return salidas.filter((s) => s.estado === "programada" && s.fecha < hoy);
}

export const tituloSalida = (s: Pick<Salida, "expediente" | "titulo">) =>
  s.expediente ? s.expediente.predio : s.titulo || "Salida a terreno";
