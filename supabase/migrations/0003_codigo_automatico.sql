-- Código automático de expediente: EXP-001-2026, EXP-002-2026, … (se reinicia cada año).
-- El profesional pasa a ser automáticamente quien crea el expediente.
-- Se puede ejecutar más de una vez.

-- Último número usado por año. Solo lo toca la función (sin políticas = sin acceso directo).
create table if not exists public.correlativos (
  anio int primary key,
  ultimo int not null default 0
);
alter table public.correlativos enable row level security;

create or replace function public.siguiente_codigo(p_anio int)
returns text language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  -- Incremento atómico: dos expedientes creados a la vez nunca reciben el mismo número
  insert into public.correlativos (anio, ultimo) values (p_anio, 1)
  on conflict (anio) do update set ultimo = correlativos.ultimo + 1
  returning ultimo into n;
  return format('EXP-%s-%s', case when n < 1000 then lpad(n::text, 3, '0') else n::text end, p_anio);
end $$;

create or replace function public.asignar_codigo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := public.siguiente_codigo(extract(year from now() at time zone 'America/Santiago')::int);
  end if;
  return new;
end $$;

drop trigger if exists antes_de_crear_expediente on public.expedientes;
create trigger antes_de_crear_expediente
  before insert on public.expedientes
  for each row execute function public.asignar_codigo();

alter table public.expedientes alter column profesional_id set default auth.uid();

-- Renumerar los expedientes existentes que no tienen el formato nuevo (por fecha de creación)
do $$
declare
  e record;
begin
  for e in
    select id, created_at from public.expedientes
    where codigo !~ '^EXP-\d{3,}-\d{4}$'
    order by created_at, id
  loop
    update public.expedientes
    set codigo = public.siguiente_codigo(extract(year from e.created_at at time zone 'America/Santiago')::int)
    where id = e.id;
  end loop;
end $$;

select codigo, predio from public.expedientes order by created_at;
