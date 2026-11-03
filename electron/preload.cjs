// Puente seguro entre la interfaz (web) y la app de escritorio: solo expone estas funciones.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("escritorio", {
  version: () => ipcRenderer.invoke("app:version"),
  estadoActualizacion: () => ipcRenderer.invoke("actualizacion:estado"),
  buscarActualizacion: () => ipcRenderer.invoke("actualizacion:buscar"),
  instalarActualizacion: () => ipcRenderer.invoke("actualizacion:instalar"),
  estadoPlugin: () => ipcRenderer.invoke("plugin:estado"),
  instalarPlugin: (config) => ipcRenderer.invoke("plugin:instalar", config),
  alCambiarActualizacion: (fn) => {
    const manejador = (_evento, estado) => fn(estado);
    ipcRenderer.on("actualizacion", manejador);
    return () => ipcRenderer.removeListener("actualizacion", manejador);
  },
});
