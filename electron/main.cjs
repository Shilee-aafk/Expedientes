// App de escritorio: levanta el servidor de Next (standalone) en segundo plano
// y lo muestra en una ventana propia. Los datos quedan en la carpeta del usuario.
const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const NOMBRE = "Expedientes SPR";
app.setName(NOMBRE);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let ventana = null;
  let servidor = null;

  // Carpeta de datos persistente: %APPDATA%\Expedientes SPR\datos (sobrevive a actualizaciones)
  const DATOS_DIR = path.join(app.getPath("userData"), "datos");
  // En desarrollo: .next/standalone del proyecto; empaquetada: resources/standalone
  const DIR_SERVIDOR = app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");

  const puertoLibre = () =>
    new Promise((resolve, reject) => {
      const s = net.createServer();
      s.unref();
      s.on("error", reject);
      s.listen(0, "127.0.0.1", () => {
        const { port } = s.address();
        s.close(() => resolve(port));
      });
    });

  const esperarServidor = async (puerto, ms = 20000) => {
    const fin = Date.now() + ms;
    while (Date.now() < fin) {
      const ok = await new Promise((res) => {
        const c = net.connect(puerto, "127.0.0.1", () => {
          c.end();
          res(true);
        });
        c.on("error", () => res(false));
      });
      if (ok) return;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error("El servidor interno no respondió a tiempo.");
  };

  async function iniciarServidor() {
    const puerto = await puertoLibre();
    fs.mkdirSync(DATOS_DIR, { recursive: true });
    const registro = fs.createWriteStream(path.join(app.getPath("userData"), "servidor.log"), { flags: "a" });
    // El mismo ejecutable de Electron corre el servidor como Node puro. Un vigilante lo apaga
    // si la app principal desaparece (cierre forzado o fallo), para no dejarlo huérfano.
    const vigilante = `const padre = ${process.pid}; setInterval(() => { if (process.ppid !== padre) process.exit(0); try { process.kill(padre, 0) } catch { process.exit(0) } }, 1500); require(${JSON.stringify(path.join(DIR_SERVIDOR, "server.js"))});`;
    servidor = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "-e", vigilante], {
      cwd: DIR_SERVIDOR,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: "production",
        PORT: String(puerto),
        HOSTNAME: "127.0.0.1",
        DATOS_DIR,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    servidor.stdout.pipe(registro);
    servidor.stderr.pipe(registro);
    servidor.on("exit", (codigo) => {
      if (!app.isQuitting) {
        dialog.showErrorBox(NOMBRE, `El servidor interno se detuvo (código ${codigo}). Revisa servidor.log en ${app.getPath("userData")}.`);
        app.quit();
      }
    });
    await esperarServidor(puerto);
    return puerto;
  }

  // El servidor puede redirigir a "localhost" o a "127.0.0.1": lo propio se reconoce por el puerto
  let puertoServidor = 0;
  const esPropia = (destino) => {
    try {
      const u = new URL(destino);
      return ["127.0.0.1", "localhost"].includes(u.hostname) && Number(u.port) === puertoServidor;
    } catch {
      return false;
    }
  };

  function crearVentana() {
    ventana = new BrowserWindow({
      width: 1280,
      height: 860,
      minWidth: 380,
      minHeight: 560,
      title: NOMBRE,
      backgroundColor: "#0d0b09",
      autoHideMenuBar: true,
      show: false,
      icon: path.join(__dirname, "icono.png"),
      webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, "preload.cjs") },
    });
    ventana.removeMenu();
    ventana.once("ready-to-show", () => ventana.show());

    // Documentos adjuntos y carátula en ventanas propias; enlaces externos al navegador
    ventana.webContents.setWindowOpenHandler(({ url: destino }) => {
      if (esPropia(destino)) {
        return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: "#ffffff", icon: path.join(__dirname, "icono.png") } };
      }
      shell.openExternal(destino);
      return { action: "deny" };
    });
    ventana.webContents.on("will-navigate", (e, destino) => {
      if (!esPropia(destino)) {
        e.preventDefault();
        shell.openExternal(destino);
      }
    });
    ventana.loadURL(`http://127.0.0.1:${puertoServidor}`);
  }

  app.on("second-instance", () => {
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore();
      ventana.focus();
    }
  });

  const detenerServidor = () => {
    app.isQuitting = true;
    if (servidor && servidor.exitCode === null) servidor.kill();
  };
  app.on("before-quit", detenerServidor);
  process.on("exit", detenerServidor);

  app.on("window-all-closed", () => app.quit());

  /* ─── Actualizaciones (GitHub Releases, ver "publish" en electron-builder.yml) ───
     Al abrir y cada 4 horas busca una versión nueva y la descarga en segundo plano;
     la interfaz avisa y el usuario decide cuándo reiniciar. Si no lo hace, se
     instala sola al cerrar la app. */
  let estadoActualizacion = { estado: "inactivo" };
  ipcMain.handle("app:version", () => app.getVersion());

  /* ─── Plugin de AutoCAD / Civil 3D (electron/plugin.cjs) ─── */
  const plugin = require("./plugin.cjs");
  ipcMain.handle("plugin:estado", () => plugin.estado(app));
  ipcMain.handle("plugin:instalar", (_e, config) => plugin.instalar(app, config));
  app.whenReady().then(() =>
    plugin.actualizarSiCorresponde(app, (m) =>
      fs.appendFile(path.join(app.getPath("userData"), "plugin.log"), `${new Date().toISOString()} ${m}\n`, () => {}),
    ),
  );
  ipcMain.handle("actualizacion:estado", () => estadoActualizacion);

  function configurarActualizaciones() {
    let autoUpdater = null;
    if (app.isPackaged) {
      try {
        ({ autoUpdater } = require("electron-updater"));
      } catch {
        autoUpdater = null;
      }
    }
    const enviar = (estado) => {
      estadoActualizacion = estado;
      for (const v of BrowserWindow.getAllWindows()) v.webContents.send("actualizacion", estado);
    };
    if (!autoUpdater) {
      ipcMain.handle("actualizacion:buscar", () => enviar({ estado: "no-disponible" }));
      ipcMain.handle("actualizacion:instalar", () => {});
      return;
    }
    const registro = fs.createWriteStream(path.join(app.getPath("userData"), "actualizaciones.log"), { flags: "a" });
    const anotar = (nivel) => (...m) => registro.write(`${new Date().toISOString()} ${nivel} ${m.join(" ")}\n`);
    autoUpdater.logger = { info: anotar("INFO"), warn: anotar("WARN"), error: anotar("ERROR"), debug: () => {} };
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => enviar({ estado: "buscando" }));
    autoUpdater.on("update-not-available", () => enviar({ estado: "al-dia" }));
    autoUpdater.on("update-available", (info) => enviar({ estado: "descargando", version: info.version, porcentaje: 0 }));
    autoUpdater.on("download-progress", (p) =>
      enviar({ estado: "descargando", version: estadoActualizacion.version, porcentaje: Math.round(p.percent) }),
    );
    autoUpdater.on("update-downloaded", (info) => enviar({ estado: "lista", version: info.version }));
    autoUpdater.on("error", (e) => enviar({ estado: "error", mensaje: String(e?.message ?? e).split("\n")[0] }));

    const buscar = () => autoUpdater.checkForUpdates().catch(() => {});
    ipcMain.handle("actualizacion:buscar", buscar);
    ipcMain.handle("actualizacion:instalar", () => {
      // Detiene el servidor interno antes de que el instalador reemplace sus archivos
      detenerServidor();
      autoUpdater.quitAndInstall(false, true);
    });
    setTimeout(buscar, 5000);
    setInterval(buscar, 4 * 60 * 60 * 1000);
  }

  app.whenReady().then(async () => {
    try {
      puertoServidor = await iniciarServidor();
      crearVentana();
      configurarActualizaciones();
    } catch (e) {
      dialog.showErrorBox(NOMBRE, `No se pudo iniciar la aplicación.\n\n${e.message}`);
      app.quit();
    }
  });
}
