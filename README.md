# Expedientes SPR

Web para controlar el checklist de los expedientes de **subdivisión de predios rústicos** antes de enviarlos a terceros autorizados.

- Checklist por expediente con los 13 requisitos (editables en *Plantilla*).
- Contador para los 7 planos firmados y un carnet por cada dueño.
- Vigencia de certificados: con la fecha de emisión se calcula el vencimiento y se avisa "por vencer" o "vencido".
- "Listo para enviar" solo se habilita con todo completo y vigente.
- Archivos adjuntos por requisito (PDF, imágenes, KMZ) en almacenamiento privado.
- El carnet y el título del profesional se cargan una vez en *Mi perfil* y se adjuntan solos.
- Seguimiento del envío (tercero autorizado, fechas, observaciones) e historial de cambios.
- Carátula imprimible o en PDF.

Stack: Next.js 15 + Tailwind 4 + Supabase (login, Postgres, Storage).

## Puesta en marcha

### 1. Base de datos (una sola vez)
En Supabase → **SQL Editor**, ejecuta en orden:
1. `supabase/migrations/0001_init.sql`: tablas, seguridad, historial y bucket `documentos`.
2. `supabase/seed.sql`: los 13 requisitos.
3. `supabase/migrations/0003_codigo_automatico.sql`: código automático EXP-001-2026 (se reinicia cada año) y el creador como profesional del expediente.

Las vigencias de 30 días del seed son un punto de partida; ajústalas en *Plantilla*.

Si copias los archivos desde Windows PowerShell, usa `-Encoding UTF8` para que las tildes y la ñ no se dañen:

```powershell
Get-Content supabase\seed.sql -Raw -Encoding UTF8 | Set-Clipboard
```

`supabase/migrations/0002_arreglo_duplicados.sql` corrige una plantilla con requisitos duplicados o mal codificados (por ejemplo "dueÃ±o"). Se puede ejecutar más de una vez.

### 2. Usuarios del equipo
No hay registro público. Créalos en Supabase → **Authentication → Users → Add user**, con contraseña. Se recomienda desactivar *Allow new users to sign up* en **Authentication → Sign In / Providers**.

### 3. Correr la app
```bash
cp .env.example .env.local   # completar URL y anon key (Project Settings → API)
npm install
npm run dev                  # http://localhost:3000
```

### 4. Publicar
Importa el repositorio en Vercel y agrega las dos variables de `.env.example`.

## Desarrollo
```bash
npm test        # lógica del checklist (lib/checklist.ts)
npm run lint
npm run build
```

El estilo es "liquid glass" con la paleta de Sánchez Paz (dorado champaña), en tema oscuro (por defecto), claro o automático. Los colores están en `app/globals.css` (`:root` y `[data-theme="dark"]`).
