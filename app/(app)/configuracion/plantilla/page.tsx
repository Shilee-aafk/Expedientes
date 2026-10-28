import { requireUser } from "@/lib/supabase/server";
import type { Requisito } from "@/lib/types";
import { guardarRequisito } from "./actions";

export default async function PlantillaPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("requisitos_plantilla").select("*").order("orden");
  const requisitos = (data ?? []) as Requisito[];
  const siguiente = (requisitos.at(-1)?.orden ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Plantilla de requisitos</h1>
        <p className="text-sm text-muted">
          Se copia a cada expediente nuevo. Los cambios no modifican los expedientes ya creados. Desactiva un requisito en vez de borrarlo.
        </p>
      </div>
      <div className="space-y-2">
        {requisitos.map((r) => (
          <FilaRequisito key={r.id} r={r} />
        ))}
        <h2 className="pt-4 font-semibold">Agregar requisito</h2>
        <FilaRequisito r={null} orden={siguiente} />
      </div>
    </div>
  );
}

function FilaRequisito({ r, orden }: { r: Requisito | null; orden?: number }) {
  return (
    <form action={guardarRequisito.bind(null, r?.id ?? null)} className={`card grid items-end gap-3 p-4 sm:grid-cols-[4rem_1fr_5rem_6rem_8rem_auto] ${r && !r.activo ? "opacity-60" : ""}`}>
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
        <select name="origen_perfil" className="input" defaultValue={r?.origen_perfil ?? ""}>
          <option value="">No</option>
          <option value="carnet">Carnet prof.</option>
          <option value="titulo">Título prof.</option>
        </select>
      </div>
      <button className="btn-secondary">{r ? "Guardar" : "Agregar"}</button>
      <div className="flex flex-wrap gap-4 text-sm sm:col-span-6">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="opcional" defaultChecked={r?.opcional} /> Opcional
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="por_dueno" defaultChecked={r?.por_dueno} /> Uno por dueño
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="activo" defaultChecked={r?.activo ?? true} /> Activo
        </label>
        <input name="descripcion" className="input flex-1" defaultValue={r?.descripcion ?? ""} placeholder="Descripción o indicaciones (opcional)" />
      </div>
    </form>
  );
}
