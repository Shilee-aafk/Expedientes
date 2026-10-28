import { Confirmar } from "@/components/Confirmar";
import { Interruptor } from "@/components/Interruptor";
import { Select } from "@/components/Select";
import { requireUser } from "@/lib/supabase/server";
import type { Requisito } from "@/lib/types";
import { eliminarRequisito, guardarRequisito } from "./actions";

export default async function PlantillaPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("requisitos_plantilla").select("*").order("orden");
  const requisitos = (data ?? []) as Requisito[];
  const siguiente = (requisitos.at(-1)?.orden ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plantilla de requisitos</h1>
        <p className="text-sm text-muted">
          Se copia a cada expediente nuevo. Editar o eliminar un requisito no cambia los expedientes ya creados.
        </p>
      </div>
      <div className="space-y-2">
        {requisitos.map((r, i) => (
          <FilaRequisito key={r.id} r={r} indice={i} />
        ))}
        <h2 className="pt-4 font-semibold">Agregar requisito</h2>
        <FilaRequisito r={null} orden={siguiente} indice={requisitos.length} />
      </div>
    </div>
  );
}

function FilaRequisito({ r, orden, indice }: { r: Requisito | null; orden?: number; indice: number }) {
  return (
    <form
      action={guardarRequisito.bind(null, r?.id ?? null)}
      className={`card cascada grid items-end gap-3 p-4 transition-opacity sm:grid-cols-[4rem_1fr_5rem_6rem_8rem_auto] ${r && !r.activo ? "opacity-60" : ""}`}
      style={{ "--i": indice } as React.CSSProperties}
    >
      <div>
        <label className="label">Orden</label>
        <input name="orden" type="number" className="input" defaultValue={r?.orden ?? orden} />
      </div>
      <div>
        <label className="label">Requisito</label>
        <input name="nombre" className="input" defaultValue={r?.nombre} required />
      </div>
      <div>
        <label className="label">Cantidad</label>
        <input name="cantidad" type="number" min={1} className="input" defaultValue={r?.cantidad ?? 1} />
      </div>
      <div>
        <label className="label" title="Días de vigencia desde la emisión">Vigencia (días)</label>
        <input name="vence_en_dias" type="number" min={1} className="input" defaultValue={r?.vence_en_dias ?? ""} placeholder="—" />
      </div>
      <div>
        <label className="label">Desde perfil</label>
        <Select
          name="origen_perfil"
          defaultValue={r?.origen_perfil ?? ""}
          opciones={[
            { value: "", label: "No" },
            { value: "carnet", label: "Carnet prof." },
            { value: "titulo", label: "Título prof." },
          ]}
        />
      </div>
      <div className="flex gap-2">
        <button className={r ? "btn-secondary" : "btn-primary"}>{r ? "Guardar" : "Agregar"}</button>
        {r && (
          <Confirmar
            accion={eliminarRequisito.bind(null, r.id)}
            titulo="¿Eliminar este requisito?"
            mensaje={`«${r.nombre}» dejará de aparecer en los expedientes nuevos. Los expedientes ya creados lo conservan.`}
            className="btn-danger h-9 w-9 p-0"
            aria-label={`Eliminar ${r.nombre}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </Confirmar>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:col-span-6">
        <Interruptor enviarAlCambiar={!!r} name="opcional" label="Opcional" defaultChecked={r?.opcional} />
        <Interruptor enviarAlCambiar={!!r} name="por_dueno" label="Uno por dueño" defaultChecked={r?.por_dueno} />
        <Interruptor enviarAlCambiar={!!r} name="activo" label="Activo" defaultChecked={r?.activo ?? true} />
        <input name="descripcion" className="input min-w-48 flex-1" defaultValue={r?.descripcion ?? ""} placeholder="Descripción o indicaciones (opcional)" />
      </div>
    </form>
  );
}
