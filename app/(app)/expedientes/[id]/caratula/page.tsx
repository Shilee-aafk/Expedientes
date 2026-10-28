import Link from "next/link";
import { cantidadRequerida, fechaVencimiento, hoyChile, itemCumplido, resumen } from "@/lib/checklist";
import { cargarExpediente } from "@/lib/datos";
import { formatoFecha } from "@/lib/formato";
import { ETIQUETA_ESTADO } from "@/lib/types";
import { Imprimir } from "./Imprimir";

export default async function CaratulaPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { expediente: e, items, duenos, perfiles } = await cargarExpediente(id);
  const hoy = hoyChile();
  const r = resumen(items, duenos.length, hoy);
  const profesional = perfiles.find((p) => p.id === e.profesional_id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="no-print flex justify-between">
        <Link href={`/expedientes/${id}`} className="btn-secondary">← Volver</Link>
        <Imprimir />
      </div>

      <article className="card space-y-5 p-8 print:p-0">
        <header className="border-b border-border pb-4">
          <p className="text-sm text-muted">Expediente de subdivisión de predio rústico</p>
          <h1 className="text-2xl font-semibold">{e.codigo}</h1>
          <p className="text-sm text-muted">Generado el {formatoFecha(hoy)} · Estado: {ETIQUETA_ESTADO[e.estado]}</p>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-muted">Predio</dt><dd>{e.predio}</dd></div>
          <div><dt className="text-muted">Rol SII</dt><dd>{e.rol_sii ?? "—"}</dd></div>
          <div><dt className="text-muted">Comuna</dt><dd>{e.comuna ?? "—"}</dd></div>
          <div><dt className="text-muted">Profesional</dt><dd>{profesional ? `${profesional.nombre}${profesional.rut ? ` · ${profesional.rut}` : ""}` : "—"}</dd></div>
          <div className="col-span-2">
            <dt className="text-muted">Dueño/s</dt>
            <dd>{duenos.map((d) => `${d.nombre}${d.rut ? ` (${d.rut})` : ""}`).join("; ") || "—"}</dd>
          </div>
          {e.tercero_autorizado && (
            <div className="col-span-2"><dt className="text-muted">Tercero autorizado</dt><dd>{e.tercero_autorizado}</dd></div>
          )}
        </dl>

        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted">
            <tr>
              <th className="w-10 py-2">✓</th>
              <th className="py-2">Requisito</th>
              <th className="py-2">Cantidad</th>
              <th className="py-2">Emisión / vence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const ok = itemCumplido(i, duenos.length, hoy);
              return (
                <tr key={i.id} className="border-b border-border">
                  <td className="py-2 text-lg">{i.estado === "no_aplica" ? "–" : ok ? "☑" : "☐"}</td>
                  <td className="py-2">
                    {i.nombre}
                    {i.opcional && <span className="text-muted"> (opcional)</span>}
                    {i.estado === "no_aplica" && <span className="text-muted"> — no aplica</span>}
                  </td>
                  <td className="py-2 tabular-nums">
                    {i.cantidad_entregada}/{cantidadRequerida(i, duenos.length)}
                  </td>
                  <td className="py-2">
                    {i.vence_en_dias ? `${formatoFecha(i.fecha_emision)} / ${formatoFecha(fechaVencimiento(i))}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="text-sm">
          Requisitos obligatorios cumplidos: <strong>{r.cumplidos} de {r.total}</strong>
          {r.listoParaEnviar ? " — expediente completo." : " — expediente incompleto."}
        </p>

        <div className="grid grid-cols-2 gap-10 pt-12 text-center text-sm">
          <div className="border-t border-text pt-1">Firma profesional</div>
          <div className="border-t border-text pt-1">Recepción</div>
        </div>
      </article>
    </div>
  );
}
