-- Expedientes SPR: tablas, reglas de seguridad, historial automático y bucket de archivos.
-- Ejecutar una vez en Supabase → SQL Editor (luego seed.sql).

-- ─── Perfiles del equipo ──────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  rut text,
  -- Documentos del profesional que se reutilizan en todos sus expedientes
  carnet_path text,
  titulo_path text,
  created_at timestamptz not null default now()
);

create function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ─── Plantilla de requisitos ──────────────────────────────────────────
create table public.requisitos_plantilla (
  id bigint generated always as identity primary key,
  orden int not null default 0,
  nombre text not null,
  descripcion text,
  opcional boolean not null default false,
  cantidad int not null default 1 check (cantidad >= 1),
  -- Se exige un documento por cada dueño (ej. carnet de dueños)
  por_dueno boolean not null default false,
  -- Días de vigencia desde la fecha de emisión (certificados); null = no vence
  vence_en_dias int check (vence_en_dias > 0),
  -- Se completa automáticamente con un documento del perfil del profesional
  origen_perfil text check (origen_perfil in ('carnet', 'titulo')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Expedientes ──────────────────────────────────────────────────────
create table public.expedientes (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  predio text not null,
  rol_sii text,
  comuna text,
  profesional_id uuid references public.profiles (id) on delete set null,
  estado text not null default 'borrador' check (estado in
    ('borrador', 'en_revision', 'listo_para_enviar', 'enviado', 'observado', 'aprobado')),
  tercero_autorizado text,
  fecha_envio date,
  fecha_respuesta date,
  observaciones text,
  notas text,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.duenos (
  id bigint generated always as identity primary key,
  expediente_id bigint not null references public.expedientes (id) on delete cascade,
  nombre text not null,
  rut text
);
create index on public.duenos (expediente_id);

-- Cada expediente guarda una copia de la plantilla: editar la plantilla
-- no altera los expedientes ya creados.
create table public.expediente_items (
  id bigint generated always as identity primary key,
  expediente_id bigint not null references public.expedientes (id) on delete cascade,
  requisito_id bigint references public.requisitos_plantilla (id) on delete set null,
  orden int not null default 0,
  nombre text not null,
  descripcion text,
  opcional boolean not null default false,
  cantidad_requerida int not null default 1,
  por_dueno boolean not null default false,
  vence_en_dias int,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'listo', 'no_aplica')),
  cantidad_entregada int not null default 0 check (cantidad_entregada >= 0),
  fecha_emision date,
  comentario text,
  archivo_path text,
  actualizado_por uuid references public.profiles (id) on delete set null,
  actualizado_at timestamptz
);
create index on public.expediente_items (expediente_id);

create table public.historial (
  id bigint generated always as identity primary key,
  expediente_id bigint not null references public.expedientes (id) on delete cascade,
  usuario_id uuid default auth.uid() references public.profiles (id) on delete set null,
  accion text not null,
  created_at timestamptz not null default now()
);
create index on public.historial (expediente_id, created_at desc);

-- ─── Al crear un expediente: copiar la plantilla al checklist ─────────
create function public.crear_checklist()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  perfil public.profiles;
begin
  select * into perfil from public.profiles where id = new.profesional_id;

  insert into public.expediente_items
    (expediente_id, requisito_id, orden, nombre, descripcion, opcional,
     cantidad_requerida, por_dueno, vence_en_dias, estado, cantidad_entregada, archivo_path)
  select new.id, r.id, r.orden, r.nombre, r.descripcion, r.opcional,
         r.cantidad, r.por_dueno, r.vence_en_dias,
         case when p.path is not null then 'listo' else 'pendiente' end,
         case when p.path is not null then r.cantidad else 0 end,
         p.path
  from public.requisitos_plantilla r
  left join lateral (
    select case r.origen_perfil
             when 'carnet' then perfil.carnet_path
             when 'titulo' then perfil.titulo_path
           end as path
  ) p on true
  where r.activo
  order by r.orden;

  insert into public.historial (expediente_id, usuario_id, accion)
  values (new.id, auth.uid(), 'Expediente creado');
  return new;
end $$;

create trigger al_crear_expediente
  after insert on public.expedientes
  for each row execute function public.crear_checklist();

-- ─── Historial automático ─────────────────────────────────────────────
create function public.registrar_cambio_item()
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

create trigger al_cambiar_item
  after update on public.expediente_items
  for each row execute function public.registrar_cambio_item();

create function public.registrar_cambio_expediente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.estado is distinct from old.estado then
    insert into public.historial (expediente_id, usuario_id, accion)
    values (new.id, auth.uid(), format('Estado del expediente: %s → %s', old.estado, new.estado));
  end if;
  return new;
end $$;

create trigger al_cambiar_expediente
  before update on public.expedientes
  for each row execute function public.registrar_cambio_expediente();

-- ─── Seguridad: solo usuarios con sesión (el equipo) ──────────────────
-- No hay registro público: los usuarios se crean en Authentication → Users.
alter table public.profiles enable row level security;
alter table public.requisitos_plantilla enable row level security;
alter table public.expedientes enable row level security;
alter table public.duenos enable row level security;
alter table public.expediente_items enable row level security;
alter table public.historial enable row level security;

create policy "equipo lee perfiles" on public.profiles
  for select to authenticated using (true);
create policy "cada uno edita su perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "equipo gestiona plantilla" on public.requisitos_plantilla
  for all to authenticated using (true) with check (true);
create policy "equipo gestiona expedientes" on public.expedientes
  for all to authenticated using (true) with check (true);
create policy "equipo gestiona duenos" on public.duenos
  for all to authenticated using (true) with check (true);
create policy "equipo gestiona items" on public.expediente_items
  for all to authenticated using (true) with check (true);
create policy "equipo lee historial" on public.historial
  for select to authenticated using (true);

-- ─── Archivos (privados) ──────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false);

create policy "equipo lee documentos" on storage.objects
  for select to authenticated using (bucket_id = 'documentos');
create policy "equipo sube documentos" on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos');
create policy "equipo reemplaza documentos" on storage.objects
  for update to authenticated using (bucket_id = 'documentos');
create policy "equipo borra documentos" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos');
