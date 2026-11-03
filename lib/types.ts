export const ESTADOS = [
  "borrador",
  "en_revision",
  "listo_para_enviar",
  "enviado",
  "observado",
  "aprobado",
] as const;
export type EstadoExpediente = (typeof ESTADOS)[number];

export const ETIQUETA_ESTADO: Record<EstadoExpediente, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  listo_para_enviar: "Listo para enviar",
  enviado: "Enviado",
  observado: "Observado",
  aprobado: "Aprobado",
};

export type EstadoItem = "pendiente" | "listo" | "no_aplica";

export type Profile = {
  id: string;
  usuario: string;
  nombre: string;
  rut: string | null;
  carnet_path: string | null;
  titulo_path: string | null;
  profesion: string | null;
  activo: boolean;
};

export type Requisito = {
  id: number;
  orden: number;
  nombre: string;
  descripcion: string | null;
  opcional: boolean;
  cantidad: number;
  por_dueno: boolean;
  vence_en_dias: number | null;
  origen_perfil: "carnet" | "titulo" | null;
  activo: boolean;
};

export type Dueno = {
  id: number;
  expediente_id: number;
  nombre: string;
  rut: string | null;
  /** Quien firma por poder (opcional) */
  apoderado_nombre: string | null;
  apoderado_rut: string | null;
};

export type Item = {
  id: number;
  expediente_id: number;
  orden: number;
  nombre: string;
  descripcion: string | null;
  opcional: boolean;
  cantidad_requerida: number;
  por_dueno: boolean;
  vence_en_dias: number | null;
  estado: EstadoItem;
  cantidad_entregada: number;
  fecha_emision: string | null;
  comentario: string | null;
  archivo_path: string | null;
  actualizado_at: string | null;
};

export type Expediente = {
  id: number;
  codigo: string;
  predio: string;
  rol_sii: string | null;
  comuna: string | null;
  profesional_id: string | null;
  estado: EstadoExpediente;
  tercero_autorizado: string | null;
  fecha_envio: string | null;
  fecha_respuesta: string | null;
  observaciones: string | null;
  notas: string | null;
  // Viñeta del plano
  sector: string | null;
  provincia: string | null;
  region: string | null;
  inscripcion_fojas: string | null;
  inscripcion_numero: string | null;
  inscripcion_anio: string | null;
  conservador: string | null;
  plano_base: string | null;
  lamina: string | null;
  escala: number | null;
  acceso_norte: number | null;
  acceso_este: number | null;
  huso: string | null;
  /** Último cambio de estado (para los plazos) */
  estado_desde?: string | null;
  created_at: string;
  updated_at: string;
};
