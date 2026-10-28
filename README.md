# Expedientes SPR

Web para controlar el checklist de los expedientes de **subdivisión de predios rústicos** antes de enviarlos a terceros autorizados. Funciona **localmente**: la base de datos y los archivos quedan en el mismo computador.

- Checklist por expediente con los 13 requisitos (editables en *Plantilla*).
- Código automático por año: EXP-001-2026, EXP-002-2026…
- Contador para los 7 planos firmados y un carnet por cada dueño.
- Vigencia de certificados: con la fecha de emisión avisa "por vencer" o "vencido".
- "Listo para enviar" solo se habilita con todo completo y vigente.
- Archivos adjuntos por requisito (PDF, imágenes, KMZ).
- El carnet y el título del profesional se cargan una vez en *Mi perfil* y se adjuntan solos en los expedientes que crea.
- Seguimiento del envío, historial de cambios con autor y carátula imprimible.
- Usuarios con contraseña; el equipo se administra desde *Mi perfil*.

Stack: Next.js 15 + Tailwind 4 + SQLite (el módulo `node:sqlite` incluido en Node.js, sin instalar nada aparte).

## Requisitos
- **Node.js 22.13 o superior** (recomendado: la versión LTS más reciente).

## Uso

```bash
npm install
npm run build
npm start          # http://localhost:3000
```

La primera vez, la app pide crear el **usuario administrador**. Después, desde *Mi perfil → Equipo*, se agregan las demás personas.

Para desarrollo (más lento, recarga al editar código): `npm run dev`.

## Datos y respaldo
Todo queda en la carpeta `datos/` del proyecto:
- `datos/expedientes.db`: la base de datos.
- `datos/archivos/`: los documentos adjuntos.

**Respaldar = copiar la carpeta `datos/`** (con la app detenida, o copiando también los archivos `-wal` y `-shm`). Para usar otra ubicación, define la variable `DATOS_DIR`.

## App de escritorio para Windows (.exe)

```bash
npm run app:windows
```

Genera `dist-app/Expedientes-SPR-<versión>.exe` (~107 MB): un solo archivo **portable** que se abre con doble clic, sin instalar. Por dentro levanta el servidor y muestra la app en su propia ventana.

- Los datos de la app de escritorio quedan en `%APPDATA%\Expedientes SPR\datos` (base y adjuntos), separados de la carpeta del proyecto. Respaldar = copiar esa carpeta.
- Cada computador que use el `.exe` tiene sus propios datos.
- Windows SmartScreen puede advertir que la app "no es reconocida" porque no está firmada digitalmente: *Más información → Ejecutar de todas formas*.
- Para probar la ventana de escritorio en el propio equipo de desarrollo: `npm run app:probar`.

## Red local (más adelante)
Para que otros computadores de la oficina entren:

```bash
npm run build
npm run red        # escucha en todas las interfaces, puerto 3000
```

Luego, desde otro equipo, abre `http://<IP-de-este-PC>:3000`. Es posible que el firewall de Windows pida permitir Node.js en redes privadas.

## Desarrollo
```bash
npm test        # lógica del checklist y de la base de datos
npm run lint
npm run build
```

El estilo es "liquid glass" con la paleta de Sánchez Paz (dorado champaña), en tema oscuro (por defecto), claro o automático. Los colores están en `app/globals.css` (`:root` y `[data-theme="dark"]`).
