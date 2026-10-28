-- Requisitos para el envío a terceros autorizados (lista original en papel).
-- Las vigencias son un punto de partida: ajústalas en Configuración → Plantilla.
-- Solo inserta si la plantilla está vacía: ejecutarlo dos veces no duplica nada.
insert into public.requisitos_plantilla
  (orden, nombre, opcional, cantidad, por_dueno, vence_en_dias, origen_perfil)
select * from (values
  (1,  'Carnet dueño/s',                          false, 1, true,  null::int, null),
  (2,  'Certificado de ruralidad',                false, 1, false, null, null),
  (3,  'Certificado de hipotecas y gravámenes',   false, 1, false, 30,   null),
  (4,  'Certificado de dominio vigente',          false, 1, false, 30,   null),
  (5,  'Avalúo fiscal detallado',                 false, 1, false, 30,   null),
  (6,  'Carnet profesional',                      false, 1, false, null, 'carnet'),
  (7,  'Título del profesional legalizado',       false, 1, false, null, 'titulo'),
  (8,  'Planos firmados con lápiz tinta azul',    false, 7, false, null, null),
  (9,  'Pendrive con KMZ',                        false, 1, false, null, null),
  (10, 'Plano archivado',                         false, 1, false, null, null),
  (11, 'Minuta archivada',                        false, 1, false, null, null),
  (12, 'Formulario SPR',                          false, 1, false, null, null),
  (13, 'Poder notarial',                          true,  1, false, null, null)
) as v(orden, nombre, opcional, cantidad, por_dueno, vence_en_dias, origen_perfil)
where not exists (select 1 from public.requisitos_plantilla);
