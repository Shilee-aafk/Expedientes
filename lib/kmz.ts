/**
 * Lectura de KMZ / KML (Google Earth, Civil 3D, GPS) sin librerías: un KMZ es un .zip
 * con un doc.kml adentro. Devuelve los elementos con coordenadas [lat, lon] y, para los
 * polígonos, su superficie y perímetro.
 */

export type Coordenada = [lat: number, lon: number];

export type Elemento =
  | { tipo: "poligono"; nombre: string; anillo: Coordenada[]; superficie: number; perimetro: number }
  | { tipo: "linea"; nombre: string; puntos: Coordenada[]; largo: number }
  | { tipo: "punto"; nombre: string; punto: Coordenada };

/** Descomprime "deflate" crudo (el de los .zip). */
export type Inflar = (datos: Uint8Array) => Promise<Uint8Array>;

/** Con el navegador o Node 18+ (DecompressionStream). */
export const inflarNativo: Inflar = async (datos) => {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
};

/** Saca el primer .kml de un .zip (busca en el directorio central del archivo). */
export async function kmlDeKmz(zip: Uint8Array, inflar: Inflar = inflarNativo): Promise<string> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // Fin del directorio central: firma 0x06054b50, buscando desde el final (puede haber comentario)
  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("El archivo no es un KMZ válido (no es un .zip).");
  const total = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const decodificar = new TextDecoder();
  const candidatos: { nombre: string; metodo: number; tamano: number; local: number }[] = [];
  for (let n = 0; n < total; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo = v.getUint16(p + 10, true);
    const tamano = v.getUint32(p + 20, true);
    const largoNombre = v.getUint16(p + 28, true);
    const largoExtra = v.getUint16(p + 30, true);
    const largoComentario = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const nombre = decodificar.decode(zip.subarray(p + 46, p + 46 + largoNombre));
    if (/\.kml$/i.test(nombre)) candidatos.push({ nombre, metodo, tamano, local });
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  // doc.kml es el principal; si no, el que esté más arriba en las carpetas
  candidatos.sort((a, b) => Number(/(^|\/)doc\.kml$/i.test(b.nombre)) - Number(/(^|\/)doc\.kml$/i.test(a.nombre)) || a.nombre.split("/").length - b.nombre.split("/").length);
  const c = candidatos[0];
  if (!c) throw new Error("El KMZ no trae ningún archivo .kml.");
  const inicio = c.local + 30 + v.getUint16(c.local + 26, true) + v.getUint16(c.local + 28, true);
  const datos = zip.subarray(inicio, inicio + c.tamano);
  if (c.metodo === 0) return decodificar.decode(datos);
  if (c.metodo === 8) return decodificar.decode(await inflar(datos));
  throw new Error("El KMZ usa una compresión no soportada.");
}

const rad = (g: number) => (g * Math.PI) / 180;

// Elipsoide WGS84
const A = 6378137;
const E2 = 0.00669437999014;

/**
 * Superficie de un anillo en m², proyectándolo a un plano local sobre el elipsoide WGS84
 * (radios de curvatura en la latitud media). Para predios (hasta varios km) el error es
 * de centésimas de por mil; la fórmula esférica se equivoca en varias décimas.
 */
export function superficie(anillo: Coordenada[]): number {
  const n = anillo.length;
  if (n < 3) return 0;
  const lat0 = anillo.reduce((s, c) => s + c[0], 0) / n;
  const lon0 = anillo.reduce((s, c) => s + c[1], 0) / n;
  const sen = Math.sin(rad(lat0));
  const w = Math.sqrt(1 - E2 * sen * sen);
  const N = A / w; // radio en el primer vertical
  const M = (A * (1 - E2)) / (w * w * w); // radio meridiano
  const xy = anillo.map(([la, lo]) => [rad(lo - lon0) * N * Math.cos(rad(lat0)), rad(la - lat0) * M]);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % n];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

/** Distancia entre dos puntos cercanos en metros (plano local sobre el elipsoide). */
export function distancia(a: Coordenada, b: Coordenada): number {
  const lat = (a[0] + b[0]) / 2;
  const sen = Math.sin(rad(lat));
  const w = Math.sqrt(1 - E2 * sen * sen);
  const dx = rad(b[1] - a[1]) * (A / w) * Math.cos(rad(lat));
  const dy = rad(b[0] - a[0]) * ((A * (1 - E2)) / (w * w * w));
  return Math.hypot(dx, dy);
}

const largoDe = (pts: Coordenada[], cerrar: boolean) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += distancia(pts[i - 1], pts[i]);
  if (cerrar && pts.length > 2) d += distancia(pts[pts.length - 1], pts[0]);
  return d;
};

const sinEntidades = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

/** "lon,lat[,alt] lon,lat…" → [[lat, lon], …] */
function leerCoordenadas(texto: string): Coordenada[] {
  const r: Coordenada[] = [];
  for (const t of texto.trim().split(/\s+/)) {
    const [lon, lat] = t.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) r.push([lat, lon]);
  }
  return r;
}

const bloques = (xml: string, etiqueta: string) =>
  [...xml.matchAll(new RegExp(`<(?:\\w+:)?${etiqueta}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${etiqueta}>`, "g"))].map((m) => m[1]);

const primero = (xml: string, etiqueta: string) => bloques(xml, etiqueta)[0];

/** Lee los Placemark del KML: polígonos (borde exterior), líneas y puntos. */
export function leerKml(kml: string): Elemento[] {
  const elementos: Elemento[] = [];
  let sinNombre = 0;
  for (const pm of bloques(kml, "Placemark")) {
    // El nombre propio del Placemark (no el de un elemento anidado)
    const nombreXml = pm.replace(/<(Polygon|LineString|Point|MultiGeometry)\b[\s\S]*$/, "");
    const nombre = sinEntidades(primero(nombreXml, "name") ?? "") || `Elemento ${++sinNombre}`;
    const poligonos = bloques(pm, "Polygon");
    poligonos.forEach((pol, i) => {
      const exterior = primero(pol, "outerBoundaryIs") ?? pol;
      let anillo = leerCoordenadas(primero(exterior, "coordinates") ?? "");
      if (anillo.length > 1) {
        const [a, b] = [anillo[0], anillo[anillo.length - 1]];
        if (a[0] === b[0] && a[1] === b[1]) anillo = anillo.slice(0, -1);
      }
      if (anillo.length >= 3)
        elementos.push({
          tipo: "poligono",
          nombre: poligonos.length > 1 ? `${nombre} (${i + 1})` : nombre,
          anillo,
          superficie: superficie(anillo),
          perimetro: largoDe(anillo, true),
        });
    });
    for (const linea of bloques(pm, "LineString")) {
      const puntos = leerCoordenadas(primero(linea, "coordinates") ?? "");
      if (puntos.length >= 2) elementos.push({ tipo: "linea", nombre, puntos, largo: largoDe(puntos, false) });
    }
    for (const punto of bloques(pm, "Point")) {
      const [c] = leerCoordenadas(primero(punto, "coordinates") ?? "");
      if (c) elementos.push({ tipo: "punto", nombre, punto: c });
    }
  }
  return elementos;
}

/** Lee un .kmz o .kml (según su contenido). */
export async function leerArchivoMapa(datos: Uint8Array, inflar: Inflar = inflarNativo): Promise<Elemento[]> {
  const esZip = datos[0] === 0x50 && datos[1] === 0x4b;
  const kml = esZip ? await kmlDeKmz(datos, inflar) : new TextDecoder().decode(datos);
  const elementos = leerKml(kml);
  if (elementos.length === 0) throw new Error("El archivo no tiene polígonos, líneas ni puntos para mostrar.");
  return elementos;
}

/** 36150.5 m² → "3,6151 ha" */
export const formatoHa = (m2: number) => `${(m2 / 10000).toLocaleString("es-CL", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ha`;
export const formatoM = (m: number) => `${m.toLocaleString("es-CL", { maximumFractionDigits: 1 })} m`;
