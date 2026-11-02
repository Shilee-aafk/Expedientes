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
- Usuarios con nombre de usuario y contraseña (cuentas de Supabase). Quitar a alguien del equipo lo **desactiva**: nunca se borra, y su nombre sigue en el historial.

Stack: Next.js 15 + Tailwind 4 + Supabase (Auth, Postgres con RLS, Storage) + Electron para la app de Windows.

## Configurar Supabase (una sola vez)
1. En Supabase → **SQL Editor**, ejecutar completo `supabase/esquema.sql`. Crea las tablas, las reglas de acceso, el historial automático y el bucket `documentos`. Se puede ejecutar más de una vez y **no borra datos** (si hay tablas de la primera versión, las adapta).
2. Recomendado: en **Authentication → Sign In / Providers**, desactivar *Allow new users to sign up* (los usuarios se crean desde la app).
3. En GitHub (repositorio `Expedientes`) → **Settings → Secrets and variables → Actions → Variables**, crear:
   - `SUPABASE_URL` = la *Project URL* (Supabase → Project Settings → API)
   - `SUPABASE_ANON_KEY` = la clave *anon public*

   Son datos públicos por diseño (la seguridad la dan las reglas de la base); los usa GitHub para compilar el instalador.

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
