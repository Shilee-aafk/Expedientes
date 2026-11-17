import Link from "next/link";
import { horario, tituloSalida, type Salida } from "@/lib/agenda";

const COLOR = {
  programada: "border-l-brand",
  realizada: "border-l-ok opacity-80",
  cancelada: "border-l-border opacity-50 line-through",
} as const;

/** Salida a terreno resumida: horario, predio, quiénes van y equipos. */
export function TarjetaSalida({ s, compacta = false }: { s: Salida; compacta?: boolean }) {
  return (
    <Link
      href={`/agenda/${s.id}`}
      className={`block rounded-xl border border-border border-l-4 bg-bg p-2.5 text-sm transition-colors hover:border-brand/60 hover:bg-glass-hover ${COLOR[s.estado]}`}
    >
      <div className="text-xs font-medium text-muted tabular-nums">{horario(s)}</div>
      <div className="font-medium leading-snug">{tituloSalida(s)}</div>
      {s.expediente && !compacta && <div className="text-xs text-muted">{s.expediente.codigo}</div>}
      {(s.personas.length > 0 || s.equipos.length > 0) && (
        <div className="mt-1 text-xs text-muted">
          {s.personas.map((p) => p.nombre.split(" ")[0]).join(", ")}
          {s.personas.length > 0 && s.equipos.length > 0 && " · "}
          {s.equipos.map((e) => e.nombre).join(", ")}
        </div>
      )}
    </Link>
  );
}
