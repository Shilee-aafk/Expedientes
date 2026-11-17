import Link from "next/link";
import { TarjetaSalida } from "@/components/TarjetaSalida";
import { diasSemana, inicioSemana, nombreDia, rangoSemana } from "@/lib/agenda";
import { hoyChile, sumarDias } from "@/lib/checklist";
import { listarEquipos, listarSalidas } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { Equipos } from "./Equipos";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  await requireUser();
  const hoy = hoyChile();
  const { semana } = await searchParams;
  const lunes = inicioSemana(semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : hoy);
  const dias = diasSemana(lunes);
  const [salidas, sinCerrar, equipos] = await Promise.all([
    listarSalidas({ desde: lunes, hasta: dias[6] }),
    listarSalidas({ estado: "programada", antesDe: hoy }),
    listarEquipos(true),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Agenda de terreno</h1>
        <Link href={`/agenda/nueva?fecha=${lunes <= hoy && hoy <= dias[6] ? hoy : lunes}`} className="btn-primary">
          Programar salida
        </Link>
      </div>

      {sinCerrar.length > 0 && (
        <div className="card cascada space-y-2 border-warn/40 p-4">
          <h2 className="font-semibold text-warn">¿Se hicieron estas salidas?</h2>
          <p className="text-sm text-muted">Ya pasó su fecha y siguen como programadas. Márcalas como realizadas (con notas y fotos) o canceladas.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sinCerrar.map((s) => (
              <div key={s.id}>
                <div className="mb-1 text-xs text-muted first-letter:uppercase">{nombreDia(s.fecha)}</div>
                <TarjetaSalida s={s} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link href={`/agenda?semana=${sumarDias(lunes, -7)}`} className="btn-secondary px-3" aria-label="Semana anterior">‹</Link>
        <Link href="/agenda" className="btn-secondary px-3">Hoy</Link>
        <Link href={`/agenda?semana=${sumarDias(lunes, 7)}`} className="btn-secondary px-3" aria-label="Semana siguiente">›</Link>
        <span className="ml-2 font-medium">{rangoSemana(lunes)}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {dias.map((d, i) => {
          const delDia = salidas.filter((s) => s.fecha === d);
          const esHoy = d === hoy;
          return (
            <section
              key={d}
              className={`card cascada flex min-h-28 flex-col gap-2 p-3 ${esHoy ? "ring-2 ring-brand/50" : ""} ${d < hoy ? "opacity-75" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between">
                <h2 className={`text-sm font-semibold first-letter:uppercase ${esHoy ? "text-brand" : ""}`}>{nombreDia(d)}</h2>
                <Link href={`/agenda/nueva?fecha=${d}`} className="text-lg leading-none text-muted hover:text-brand" aria-label={`Programar salida el ${nombreDia(d)}`}>
                  +
                </Link>
              </div>
              {delDia.map((s) => (
                <TarjetaSalida key={s.id} s={s} />
              ))}
              {delDia.length === 0 && <p className="text-xs text-muted">Sin salidas</p>}
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div />
        <Equipos equipos={equipos} />
      </div>
    </div>
  );
}
