# Expedientes SPR

App para controlar el checklist de los expedientes de **subdivisión de predios rústicos** antes de enviarlos a terceros autorizados. Los datos viven en **Supabase**: todos los computadores del equipo trabajan sobre la misma base, en tiempo real.

- Checklist por expediente con los requisitos de la *Plantilla* (editable).
- Código automático por año: EXP-001-2026, EXP-002-2026…
- Contador para los 7 planos firmados y un carnet por cada dueño.
- Vigencia de certificados: con la fecha de emisión avisa "por vencer" o "vencido".
- "Listo para enviar" solo se habilita con todo completo y vigente.
- Archivos adjuntos por requisito (PDF, imágenes, KMZ) en Supabase Storage.
- El carnet y el título del profesional se cargan una vez en *Mi perfil* y se adjuntan solos en los expedientes que crea.
- Seguimiento del envío, historial de cambios con autor y carátula imprimible.
- Panel **Requiere atención**: certificados vencidos o por vencer y expedientes detenidos (enviado sin respuesta 30 días, en observación 10, listo sin enviar 7, sin avances 30; ver `lib/plazos.ts`). En la app de escritorio, además, una notificación al día.
- Mapa del KMZ/KML adjunto (satélite o calles) con la superficie y el perímetro de cada polígono; de fondo, los KMZ de los demás expedientes.
- **Mapa de predios** (menú *Mapa*): todos los KMZ juntos, coloreados por estado, con leyenda para mostrar u ocultar cada estado.
- Contraseña temporal para otra persona del equipo (*Mi perfil → Equipo → Contraseña*), si olvidó la suya.
- Visita automática a Supabase cada 3 días (`.github/workflows/mantener-supabase.yml`) para que el plan gratis no pause el proyecto.
- Usuarios con nombre de usuario y contraseña (cuentas de Supabase). Quitar a alguien del equipo lo **desactiva**: nunca se borra, y su nombre sigue en el historial.

Stack: Next.js 15 + Tailwind 4 + Supabase (Auth, Postgres con RLS, Storage) + Electron para la app de Windows.

## Configurar Supabase (una sola vez)
1. En Supabase → **SQL Editor**, ejecutar completo `supabase/esquema.sql`. Crea las tablas, las reglas de acceso, el historial automático y el bucket `documentos`. Se puede ejecutar más de una vez y **no borra datos** (si hay tablas de la primera versión, las adapta).
2. Recomendado: en **Authentication → Sign In / Providers**, desactivar *Allow new users to sign up* (los usuarios se crean desde la app).
3. En GitHub (repositorio `Expedientes`) → **Settings → Environments → production → Environment secrets**, crear:
   - `SUPABASE_URL` = la *Project URL* (Supabase → Project Settings → API)
   - `SUPABASE_ANON_KEY` = la clave *anon public*

   Los usa GitHub para compilar el instalador (también se aceptan como variables del repositorio).

La primera persona que abra la app crea el **usuario administrador**; después, desde *Mi perfil → Equipo*, se agregan los demás.

## Subir los datos de la versión anterior (0.1.x)
La versión 0.1.x guardaba todo en el computador (`%APPDATA%\Expedientes SPR\datos`). Al instalar la versión nueva en ese equipo, la pantalla de ingreso ofrece **"Subir datos a Supabase"**:

- Sube usuarios, plantilla, expedientes (con sus mismos números y códigos), checklist, dueños, historial y archivos.
- Las contraseñas no se pueden trasladar (estaban cifradas con otro método): se define una **contraseña temporal** para todos y cada uno la cambia en *Mi perfil*.
- Los datos del computador **no se borran**: quedan como respaldo.
- Requiere que Supabase no tenga otros expedientes ni usuarios. Si los que hay son de prueba, se pueden quitar con `supabase/limpiar-datos-de-prueba.sql` (revisar antes qué contiene).

## App de escritorio para Windows (.exe) y actualizaciones
La app se distribuye con un **instalador** (`Expedientes-SPR-Instalador-X.Y.Z.exe`, en *Releases*). Una vez instalada, **se actualiza sola**: al abrir (y cada 4 horas) busca una versión nueva, la descarga y avisa "Nueva versión lista — Reiniciar y actualizar". En *Mi perfil → Aplicación* se ve la versión y se puede buscar manualmente. Necesita internet para trabajar (la base está en Supabase).

Windows SmartScreen puede advertir que la app "no es reconocida" porque no está firmada: *Más información → Ejecutar de todas formas*.

### Publicar una versión nueva
```bash
npm run publicar -- 0.2.0
git push
```
Al detectar la versión nueva, GitHub Actions (`.github/workflows/publicar-app.yml`) corre las pruebas, crea la etiqueta, compila el instalador en Windows (con las variables de Supabase) y lo publica como *Release*. El repositorio debe ser **público** para que las apps descarguen las actualizaciones sin clave.

## Plugin para AutoCAD y Civil 3D
Dibuja la viñeta del plano de subdivisión con los datos del expediente (predio, rol, región, inscripción de dominio, propietarios con "por poder", profesional, lámina, logo SP y sello). Funciona en **AutoCAD y Civil 3D 2021–2027**: usa solo la API de AutoCAD y se compila tres veces (`net48` para 2021–2024, `net8.0-windows` para 2025–2026 y `net10.0-windows` para 2027).

- Se instala desde la app: *Mi perfil → Plugin para AutoCAD / Civil 3D → Instalar*. Queda en `%APPDATA%\Autodesk\ApplicationPlugins\ExpedientesSPR.bundle` y AutoCAD lo carga solo. La app lo actualiza al abrirse cuando trae una versión nueva.
- Comandos: `SPR_INGRESAR` (usuario y contraseña de la app), `SPR_EXPEDIENTE` (asocia el dibujo a un expediente), `SPR_VINETA` (inserta o actualiza la viñeta; en un layout va en mm, en el modelo a la escala del plano) y `SPR_SALIR`.
- Los datos de la viñeta se completan en el expediente (sección *Datos para el plano*) y en *Mi perfil* (profesión y RUT). Lo que falte queda en blanco y el comando avisa.
- Código: `plugin/Nucleo` (Supabase y diseño de la viñeta, sin AutoCAD, con pruebas en `plugin/Pruebas`) y `plugin/Plugin` (comandos). `node scripts/preparar-plugin.mjs` arma el bundle en `plugin/dist`.

```bash
dotnet test plugin/Pruebas
node scripts/preparar-plugin.mjs
```

## Desarrollo
```bash
cp .env.example .env.local   # URL y clave anon de Supabase
npm install
npm run dev                  # http://localhost:3000
```

```bash
npm test        # checklist, base local antigua y migración
npm run lint
npm run build
```

- `npm run app:probar`: abre la ventana de escritorio en el equipo de desarrollo.
- `npm run app:carpeta`: la app sin instalador en `dist-app/win-unpacked/` (el instalador completo lo genera GitHub).
- `lib/local/`: formato de la base local de la versión 0.1.x; solo se usa para leerla al migrar.

El estilo es "liquid glass" con la paleta de Sánchez Paz (dorado champaña), en tema oscuro (por defecto), claro o automático. Los colores están en `app/globals.css`.
