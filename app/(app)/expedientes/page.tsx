import Link from "next/link";
import { EstadoBadge, Progreso } from "@/components/ui";
import { hoyChile, resumen } from "@/lib/checklist";
import { formatoFecha } from "@/lib/formato";
import { requireUser } from "@/lib/supabase/server";
import { ESTADOS, ETIQUETA_ESTADO, type Expediente, type Item } from "@/lib/types";

type Fila = Expediente & {
  items: Item[];
  duenos: { nombre: string }[];
  profesional: { nombre: string } | null;
};

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const { supabase } = await requireUser();

  let consulta = supabase
    .from("expedientes")
    .select("*, items:expediente_items(*), duenos(nombre), profesional:profiles!expedientes_profesional_id_fkey(nombre)")
    .order("updated_at", { ascending: false });
  if (estado) consulta = consulta.eq("estado", estado);
  if (q) {
    const t = q.replace(/[%,()]/g, " ").trim();
    consulta = consulta.or(`codigo.ilike.%${t}%,predio.ilike.%${t}%,comuna.ilike.%${t}%,rol_sii.ilike.%${t}%`);
  }
  const { data, error } = await consulta;
  const filas = (data ?? []) as unknown as Fila[];
  const hoy = hoyChile();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Expedientes</h1>
        <Link href="/expedientes/nuevo" className="btn-primary">
          + Nuevo expediente
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por código, predio, comuna o rol" className="input max-w-sm flex-1" />
        <select name="estado" defaultValue={estado ?? ""} className="input w-auto">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO[e]}
            </option>
          ))}
        </select>
        <button className="btn-secondary">Filtrar</button>
      </form>

      {error && <p className="text-sm text-danger">{error.message}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Predio</th>
              <th className="px-4 py-3">Dueño/s</th>
              <th className="px-4 py-3">Profesional</th>
              <th className="px-4 py-3">Estado</th>
              <th className="w-40 px-4 py-3">Avance</th>
              <th className="px-4 py-3">Alertas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => {
              const r = resumen(e.items, e.duenos.length, hoy);
              return (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/expedientes/${e.id}`} className="text-brand hover:underline">
                      {e.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {e.predio}
                    {e.comuna && <div className="text-xs text-muted">{e.comuna}</div>}
                  </td>
                  <td className="px-4 py-3">{e.duenos.map((d) => d.nombre).join(", ") || "—"}</td>
                  <td className="px-4 py-3">{e.profesional?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={e.estado} />
                    {e.fecha_envio && <div className="mt-1 text-xs text-muted">Enviado {formatoFecha(e.fecha_envio)}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Progreso cumplidos={r.cumplidos} total={r.total} />
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.vencidos.length > 0 && <div className="text-danger">{r.vencidos.length} vencido(s)</div>}
                    {r.porVencer.length > 0 && <div className="text-warn">{r.porVencer.length} por vencer</div>}
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {q || estado ? "No hay expedientes con ese filtro." : "Aún no hay expedientes. Crea el primero."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
