-- Arreglo: requisitos duplicados (seed ejecutado dos veces, una con texto mal codificado
-- como "dueÃ±o") y funciones del historial recreadas con el texto correcto.
-- Se puede ejecutar más de una vez sin problema.

-- Una fila está "rota" si su texto quedó mal codificado.
create or replace function pg_temp.roto(t text) returns boolean language sql immutable as
$$ select t like '%Ã%' or t like '%â€%' $$;

-- 1. Plantilla: por cada "orden" repetido, conservar la fila bien escrita
--    (si ambas están bien, la más antigua).
delete from public.requisitos_plantilla r
using public.requisitos_plantilla o
where r.orden = o.orden
  and r.id <> o.id
  and (
    (pg_temp.roto(r.nombre) and not pg_temp.roto(o.nombre))
    or (pg_temp.roto(r.nombre) = pg_temp.roto(o.nombre) and r.id > o.id)
  );

-- 2. Checklists ya creados: lo mismo dentro de cada expediente.
delete from public.expediente_items r
using public.expediente_items o
where r.expediente_id = o.expediente_id
  and r.orden = o.orden
  and r.id <> o.id
  and (
    (pg_temp.roto(r.nombre) and not pg_temp.roto(o.nombre))
    or (pg_temp.roto(r.nombre) = pg_temp.roto(o.nombre) and r.id > o.id)
  );

-- 3. Funciones con textos (por si se cargaron mal codificadas).
create or replace function public.registrar_cambio_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cambios text[] := '{}';
begin
  if new.estado is distinct from old.estado then
    cambios := cambios || format('estado: %s → %s', old.estado, new.estado);
  end if;
  if new.cantidad_entregada is distinct from old.cantidad_entregada then
    cambios := cambios || format('cantidad: %s/%s', new.cantidad_entregada, new.cantidad_requerida);
  end if;
  if new.fecha_emision is distinct from old.fecha_emision then
    cambios := cambios || format('emisión: %s', coalesce(new.fecha_emision::text, '—'));
  end if;
  if new.archivo_path is distinct from old.archivo_path then
    cambios := cambios || case when new.archivo_path is null then 'archivo quitado' else 'archivo adjuntado' end;
  end if;
  if new.comentario is distinct from old.comentario then
    cambios := cambios || 'comentario editado'::text;
  end if;

  if array_length(cambios, 1) > 0 then
    insert into public.historial (expediente_id, usuario_id, accion)
    values (new.expediente_id, auth.uid(), new.nombre || ' — ' || array_to_string(cambios, ', '));
  end if;
  return new;
end $$;

create or replace function public.registrar_cambio_expediente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.estado is distinct from old.estado then
    insert into public.historial (expediente_id, usuario_id, accion)
    values (new.id, auth.uid(), format('Estado del expediente: %s → %s', old.estado, new.estado));
  end if;
  return new;
end $$;

-- 4. Resultado: debe mostrar 13 requisitos, todos bien escritos.
select orden, nombre from public.requisitos_plantilla order by orden;
