import { ETIQUETA_ESTADO, type EstadoExpediente } from "@/lib/types";

const COLOR_ESTADO: Record<EstadoExpediente, string> = {
  borrador: "bg-bg text-muted border-border",
  en_revision: "bg-brand-soft text-brand border-brand/20",
  listo_para_enviar: "bg-ok-soft text-ok border-ok/20",
  enviado: "bg-brand text-white border-brand",
  observado: "bg-warn-soft text-warn border-warn/20",
  aprobado: "bg-ok text-white border-ok",
};

export function EstadoBadge({ estado }: { estado: EstadoExpediente }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[estado]}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function Progreso({ cumplidos, total }: { cumplidos: number; total: number }) {
  const pct = total ? Math.round((cumplidos / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-muted">
        {cumplidos}/{total}
      </span>
    </div>
  );
}
