/** Estado del actualizador de la app de escritorio (lo envía electron/main.cjs). */
export type EstadoActualizacion =
  | { estado: "inactivo" | "buscando" | "al-dia" | "no-disponible" }
  | { estado: "descargando"; version?: string; porcentaje?: number }
  | { estado: "lista"; version: string }
  | { estado: "error"; mensaje: string };

/** Plugin de AutoCAD / Civil 3D: versión que trae la app y la instalada (null si no está). */
export type EstadoPlugin = { disponible: boolean; version: string | null; instalada: string | null };

/** API que expone electron/preload.cjs. Solo existe dentro de la app de escritorio. */
export type ApiEscritorio = {
  version: () => Promise<string>;
  /** Solo en versiones 0.3.4 o posteriores */
  instalacion?: () => Promise<{ paraTodos: boolean }>;
  estadoActualizacion: () => Promise<EstadoActualizacion>;
  buscarActualizacion: () => Promise<void>;
  instalarActualizacion: () => Promise<void>;
  estadoPlugin: () => Promise<EstadoPlugin>;
  instalarPlugin: (config: { url: string; anonKey: string }) => Promise<EstadoPlugin>;
  alCambiarActualizacion: (fn: (estado: EstadoActualizacion) => void) => () => void;
};

export function apiEscritorio(): ApiEscritorio | null {
  return typeof window !== "undefined" ? ((window as unknown as { escritorio?: ApiEscritorio }).escritorio ?? null) : null;
}
