import Link from "next/link";
import { Contador } from "@/components/Contador";
import { PanelAvisos } from "@/components/PanelAvisos";
import { Select } from "@/components/Select";
import { Progreso } from "@/components/ui";
import { hoyChile, resumen } from "@/lib/checklist";
import { avisos, plazo } from "@/lib/plazos";
import { listarExpedientes } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { ESTADOS, ETIQUETA_ESTADO } from "@/lib/types";

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  await requireUser();

  // Se traen todos (el equipo maneja pocos expedientes) para que el panel resumen no dependa del filtro
  const datos = await listarExpedientes();
  const hoy = hoyChile();
  const todas = datos.map((e) => ({ ...e, r: resumen(e.items, e.duenos.length, hoy), p: plazo(e, hoy) }));
  const lista = avisos(datos, hoy);

  const t = q?.trim().toLowerCase();
  const filas = todas.filter(
    (e) =>
      (!estado || e.estado === estado) &&
      (!t || [e.codigo, e.predio, e.comuna, e.rol_sii, ...e.duenos.map((d) => d.nombre)].some((v) => v?.toLowerCase().includes(t))),
  );

  const activos = todas.filter((e) => e.estado !== "aprobado");
  const tarjetas = [
    { titulo: "En revisión", valor: todas.filter((e) => e.estado === "borrador" || e.estado === "en_revision").length, color: "text-brand", filtro: "en_revision" },
    { titulo: "Listos para enviar", valor: todas.filter((e) => e.estado === "listo_para_enviar").length, color: "text-ok", filtro: "listo_para_enviar" },
    { titulo: "Enviados", valor: todas.filter((e) => e.estado === "enviado" || e.estado === "observado").length, color: "text-accent", filtro: "enviado" },
    {
      titulo: "Certificados por vencer",
      valor: activos.reduce((n, e) => n + e.r.porVencer.length + e.r.vencidos.length, 0),
      color: "text-warn",
      detalle: `${activos.reduce((n, e) => n + e.r.vencidos.length, 0)} vencidos`,
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Expedientes</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((c, i) => {
          const contenido = (
            <>
              <div className={`text-3xl font-semibold ${c.color}`}>
                <Contador valor={c.valor} />
              </div>
              <div className="mt-1 text-sm text-muted">{c.titulo}</div>
              {c.detalle && <div className="text-xs text-danger">{c.detalle}</div>}
            </>
          );
          return c.filtro ? (
            <Link key={c.titulo} href={`/expedientes?estado=${c.filtro}`} className="card card-hover cascada block p-4" style={{ "--i": i } as React.CSSProperties}>
              {contenido}
            </Link>
          ) : (
            <div key={c.titulo} className="card cascada p-4" style={{ "--i": i } as React.CSSProperties}>
              {contenido}
            </div>
          );
        })}
      </div>

      <PanelAvisos avisos={lista} />

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por código, predio, comuna, rol o dueño" className="input basis-full sm:max-w-sm sm:flex-1 sm:basis-auto" />
        <Select
          name="estado"
          defaultValue={estado ?? ""}
          enviarAlCambiar
          aria-label="Filtrar por estado"
          className="min-w-0 flex-1 sm:w-52 sm:flex-none"
          opciones={[{ value: "", label: "Todos los estados" }, ...ESTADOS.map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] }))]}
        />
        <button className="btn-secondary">Filtrar</button>
        {(q || estado) && (
          <Link href="/expedientes" className="btn-secondary">
            Limpiar
          </Link>
        )}
      </form>

      <ul className="space-y-2">
        {filas.map((e, i) => (
          <li key={e.id} className="cascada" style={{ "--i": i + 4 } as React.CSSProperties}>
            {/* Vista simple: nombre, avance y alertas (el resto está dentro del expediente) */}
            <Link href={`/expedientes/${e.id}`} className="card card-hover grid items-center gap-x-6 gap-y-2 p-4 sm:grid-cols-[1fr_12rem]">
              <div className="min-w-0">
                <div className="truncate font-semibold">{e.predio}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={e.p.detenido ? "rounded-full bg-warn-soft px-2 py-0.5 text-warn" : "text-muted"} title={e.p.detenido ?? undefined}>
                      {e.p.texto}
                    </span>
                    {e.r.vencidos.length > 0 && (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-danger">{e.r.vencidos.length} vencido(s)</span>
                    )}
                    {e.r.porVencer.length > 0 && (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-warn">{e.r.porVencer.length} por vencer</span>
                    )}
                </div>
              </div>
              <Progreso cumplidos={e.r.cumplidos} total={e.r.total} />
            </Link>
          </li>
        ))}
        {filas.length === 0 && (
          <li className="card cascada p-10 text-center text-muted">
            {q || estado ? "No hay expedientes con ese filtro." : "Aún no hay expedientes. Crea el primero con «Nuevo»."}
          </li>
        )}
      </ul>
    </div>
  );
}
