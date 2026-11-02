/** Estado del actualizador de la app de escritorio (lo envía electron/main.cjs). */
export type EstadoActualizacion =
  | { estado: "inactivo" | "buscando" | "al-dia" | "no-disponible" }
  | { estado: "descargando"; version?: string; porcentaje?: number }
  | { estado: "lista"; version: string }
  | { estado: "error"; mensaje: string };

/** API que expone electron/preload.cjs. Solo existe dentro de la app de escritorio. */
export type ApiEscritorio = {
  version: () => Promise<string>;
  estadoActualizacion: () => Promise<EstadoActualizacion>;
  buscarActualizacion: () => Promise<void>;
  instalarActualizacion: () => Promise<void>;
  alCambiarActualizacion: (fn: (estado: EstadoActualizacion) => void) => () => void;
};

export function apiEscritorio(): ApiEscritorio | null {
  return typeof window !== "undefined" ? ((window as unknown as { escritorio?: ApiEscritorio }).escritorio ?? null) : null;
}
