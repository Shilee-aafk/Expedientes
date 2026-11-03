import type * as L from "leaflet";
import { leerArchivoMapa, type Elemento } from "./kmz";

/** Mapa de Leaflet con fondo satelital o de calles, escala y control de capas. */
export function crearMapa(Lf: typeof L, contenedor: HTMLElement, extras?: Record<string, L.Layer>) {
  const m = Lf.map(contenedor, { zoomControl: true, attributionControl: true });
  const satelite = Lf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: "Imágenes © Esri, Maxar, Earthstar Geographics",
  }).addTo(m);
  const calles = Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: "© colaboradores de OpenStreetMap",
  });
  Lf.control.layers({ Satélite: satelite, Calles: calles }, extras, { position: "topright" }).addTo(m);
  Lf.control.scale({ imperial: false }).addTo(m);
  return m;
}

/** Descarga un adjunto (KMZ/KML) del expediente y lo lee. */
export async function descargarKmz(ruta: string): Promise<Elemento[]> {
  const r = await fetch(`/archivo?path=${encodeURIComponent(ruta)}`);
  if (!r.ok) throw new Error("No se pudo descargar el archivo.");
  return leerArchivoMapa(new Uint8Array(await r.arrayBuffer()));
}

/** Dibuja los elementos de un KMZ con un color (polígonos, líneas y puntos) en un grupo nuevo. */
export function dibujarKmz(Lf: typeof L, elementos: Elemento[], color: string, relleno = 0.2): L.FeatureGroup {
  const g = Lf.featureGroup();
  for (const e of elementos) {
    const c =
      e.tipo === "poligono"
        ? Lf.polygon(e.anillo, { color, weight: 2, fillColor: color, fillOpacity: relleno })
        : e.tipo === "linea"
          ? Lf.polyline(e.puntos, { color, weight: 1.5, opacity: 0.8, dashArray: "4 6" })
          : Lf.circleMarker(e.punto, { radius: 4, color, weight: 1, fillColor: color, fillOpacity: 0.8 });
    c.addTo(g);
  }
  return g;
}

/** Hace `trabajo` con todos los elementos, de a `n` a la vez. */
export async function deAPocos<T>(lista: T[], n: number, trabajo: (x: T) => Promise<void>) {
  const pendientes = [...lista];
  const uno = async () => {
    for (let x = pendientes.shift(); x !== undefined; x = pendientes.shift()) await trabajo(x);
  };
  await Promise.all(Array.from({ length: Math.min(n, lista.length) }, uno));
}

export const escaparHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
