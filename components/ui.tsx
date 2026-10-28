import { ETIQUETA_ESTADO, type EstadoExpediente } from "@/lib/types";

const COLOR_ESTADO: Record<EstadoExpediente, string> = {
  borrador: "bg-bg text-muted border-border",
  en_revision: "bg-brand-soft text-brand border-brand/25",
  listo_para_enviar: "bg-ok-soft text-ok border-ok/25",
  enviado: "bg-brand text-on-brand border-brand",
  observado: "bg-warn-soft text-warn border-warn/25",
  aprobado: "bg-ok text-on-brand border-ok",
};

export function EstadoBadge({ estado }: { estado: EstadoExpediente }) {
  return (
    // key: al cambiar de estado la insignia se vuelve a montar y hace "pop"
    <span
      key={estado}
      className={`pop inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[estado]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export function Progreso({ cumplidos, total }: { cumplidos: number; total: number }) {
  const pct = total ? Math.round((cumplidos / total) * 100) : 0;
  const completo = pct === 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-border">
        <div className="h-full transition-[width] duration-700 ease-[var(--ease-out-expo)]" style={{ width: `${pct}%` }}>
          <div
            className={`barra-llenar h-full rounded-full ${completo ? "bg-ok" : "bg-brand"}`}
            style={{ boxShadow: `0 0 12px ${completo ? "var(--ok)" : "var(--brand-glow)"}` }}
          />
        </div>
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-muted">
        {cumplidos}/{total}
      </span>
    </div>
  );
}

export function Esqueleto({ className = "" }: { className?: string }) {
  return <div className={`esqueleto ${className}`} />;
}
