// Plugin de AutoCAD / Civil 3D: la app lo trae dentro (resources/plugin) y lo copia a
// %APPDATA%\Autodesk\ApplicationPlugins, desde donde AutoCAD lo carga solo al abrir.
const fs = require("node:fs");
const path = require("node:path");

const NOMBRE_BUNDLE = "ExpedientesSPR.bundle";

function rutas(app) {
  const incluido = app.isPackaged
    ? path.join(process.resourcesPath, "plugin", NOMBRE_BUNDLE)
    : path.join(__dirname, "..", "plugin", "dist", NOMBRE_BUNDLE);
  const destino = path.join(app.getPath("appData"), "Autodesk", "ApplicationPlugins", NOMBRE_BUNDLE);
  return { incluido, destino };
}

const leerVersion = (bundle) => {
  try {
    return fs.readFileSync(path.join(bundle, "Contents", "version.txt"), "utf8").trim();
  } catch {
    return null;
  }
};

function estado(app) {
  const { incluido, destino } = rutas(app);
  return { disponible: fs.existsSync(incluido), version: leerVersion(incluido), instalada: leerVersion(destino) };
}

/**
 * Copia el plugin y escribe Contents/config.json con la dirección y la clave pública
 * de Supabase (las mismas que usa la app). Si no se pasan, conserva las que ya había.
 */
function instalar(app, config) {
  const { incluido, destino } = rutas(app);
  if (!fs.existsSync(incluido)) throw new Error("Esta versión de la app no trae el plugin.");
  const archivoConfig = path.join(destino, "Contents", "config.json");
  let anterior = null;
  try {
    anterior = JSON.parse(fs.readFileSync(archivoConfig, "utf8"));
  } catch {
    /* primera instalación */
  }
  const cfg = config?.url && config?.anonKey ? { url: config.url, anonKey: config.anonKey } : anterior;
  if (!cfg) throw new Error("Falta la configuración de Supabase.");
  // Se arma la carpeta nueva al lado y se cambia de una vez: si AutoCAD tiene la DLL
  // abierta, Windows no deja mover la carpeta anterior y queda todo como estaba.
  const nueva = `${destino}.nueva`;
  const vieja = `${destino}.vieja`;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.rmSync(nueva, { recursive: true, force: true });
  fs.rmSync(vieja, { recursive: true, force: true });
  fs.cpSync(incluido, nueva, { recursive: true });
  fs.writeFileSync(path.join(nueva, "Contents", "config.json"), JSON.stringify(cfg, null, 2));
  try {
    if (fs.existsSync(destino)) fs.renameSync(destino, vieja);
  } catch (e) {
    fs.rmSync(nueva, { recursive: true, force: true });
    if (["EBUSY", "EPERM", "EACCES"].includes(e.code)) {
      throw new Error("AutoCAD o Civil 3D tiene el plugin abierto. Ciérralos y vuelve a intentar.");
    }
    throw e;
  }
  fs.renameSync(nueva, destino);
  try {
    fs.rmSync(vieja, { recursive: true, force: true });
  } catch {
    /* se borra en la próxima instalación */
  }
  return estado(app);
}

/** Al abrir la app: si el plugin ya está instalado y la app trae uno más nuevo, lo actualiza. */
function actualizarSiCorresponde(app, registrar) {
  const e = estado(app);
  if (!e.disponible || !e.instalada || e.instalada === e.version) return;
  try {
    instalar(app, null);
    registrar(`Plugin actualizado de ${e.instalada} a ${e.version}`);
  } catch (err) {
    registrar(`No se pudo actualizar el plugin: ${err.message}`);
  }
}

module.exports = { estado, instalar, actualizarSiCorresponde };
