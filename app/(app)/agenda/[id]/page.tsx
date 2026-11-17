import Link from "next/link";
import { notFound } from "next/navigation";
import { Confirmar } from "@/components/Confirmar";
import { ETIQUETA_SALIDA, horario, inicioSemana, nombreDia, tituloSalida } from "@/lib/agenda";
import { cargarSalida } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { eliminarSalida } from "../actions";
import { AccionesSalida } from "./AccionesSalida";
import { FotosSalida } from "./FotosSalida";

const COLOR = { programada: "bg-brand-soft text-brand", realizada: "bg-ok-soft text-ok", cancelada: "bg-bg text-muted" } as const;

export default async function SalidaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  const datos = await cargarSalida(id);
  if (!datos) notFound();
  const { salida: s, archivos } = datos;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/agenda?semana=${inicioSemana(s.fecha)}`} className="group inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand">
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Agenda
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            {tituloSalida(s)}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR[s.estado]}`}>{ETIQUETA_SALIDA[s.estado]}</span>
          </h1>
          <p className="text-muted first-letter:uppercase">
            {nombreDia(s.fecha)} · {horario(s)}
          </p>
          {s.expediente && (
            <Link href={`/expedientes/${s.expediente_id}`} className="text-sm text-brand hover:underline">
              {s.expediente.codigo} · ver expediente
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/agenda/${id}/editar`} className="btn-secondary">Editar</Link>
          <Confirmar
            accion={eliminarSalida.bind(null, id, s.fecha)}
            titulo="¿Eliminar esta salida?"
            mensaje="Se borra de la agenda junto con sus fotos y archivos. Si solo no se hizo, mejor márcala como cancelada."
          >
            Eliminar
          </Confirmar>
        </div>
      </div>

      <div className="card cascada grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <h2 className="label">Van</h2>
          <p>{s.personas.map((p) => p.nombre).join(", ") || <span className="text-muted">Nadie asignado</span>}</p>
        </div>
        <div>
          <h2 className="label">Equipos</h2>
          <p>{s.equipos.map((e) => e.nombre).join(", ") || <span className="text-muted">Sin equipos</span>}</p>
        </div>
        {s.notas && (
          <div className="sm:col-span-2">
            <h2 className="label">Notas</h2>
            <p className="whitespace-pre-line">{s.notas}</p>
          </div>
        )}
        {s.resultado && (
          <div className="sm:col-span-2">
            <h2 className="label">Lo que se hizo en terreno</h2>
            <p className="whitespace-pre-line">{s.resultado}</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <AccionesSalida id={id} estado={s.estado} resultado={s.resultado} />
        </div>
      </div>

      <FotosSalida salidaId={id} archivos={archivos} />
    </div>
  );
}
