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

## App de escritorio para Windows (.exe) y actualizaciones

La app de escritorio se distribuye con un **instalador** (`Expedientes-SPR-Instalador-X.Y.Z.exe`). Una vez instalada, **se actualiza sola**: al abrir (y cada 4 horas) busca una versión nueva, la descarga en segundo plano y avisa "Nueva versión lista — Reiniciar y actualizar". Si el usuario elige "Más tarde", se instala al cerrar la app. En *Mi perfil → Aplicación* se ve la versión y se puede buscar manualmente.

- Los datos quedan en `%APPDATA%\Expedientes SPR\datos` (base y adjuntos) y **no se tocan** al actualizar ni al desinstalar. Respaldar = copiar esa carpeta.
- Windows SmartScreen puede advertir que la app "no es reconocida" porque no está firmada: *Más información → Ejecutar de todas formas*.

### Configuración inicial (una sola vez)
1. Crear en GitHub el repositorio **público** `Shilee-aafk/Expedientes-releases` (vacío, sin código: solo guarda los instaladores; el del código sigue privado).
2. Crear un token *fine-grained* en GitHub (*Settings → Developer settings → Personal access tokens*) con acceso solo a `Expedientes-releases` y permiso **Contents: Read and write**.
3. En el repositorio del código: *Settings → Secrets and variables → Actions → New repository secret*, nombre `RELEASES_TOKEN`, valor: el token.

### Publicar una versión nueva
```bash
npm run publicar -- 0.2.0
git push --follow-tags
```
GitHub Actions (`.github/workflows/publicar-app.yml`) corre las pruebas, compila el instalador en Windows y lo publica en `Expedientes-releases`. Las apps instaladas lo detectan solas. El instalador de cada versión queda en la página *Releases* de ese repositorio, para instalar en PCs nuevos.

### Compilar localmente
- `npm run app:carpeta`: la app sin instalador en `dist-app/win-unpacked/` (para revisar el contenido).
- `npm run app:probar`: abre la ventana de escritorio en el equipo de desarrollo.
- El instalador completo se genera en GitHub (en Linux necesitaría Wine).

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
