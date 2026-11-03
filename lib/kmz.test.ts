import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { distancia, kmlDeKmz, leerArchivoMapa, leerKml, superficie, type Coordenada } from "./kmz";

/** UTM (WGS84) → [lat, lon]. Solo para armar datos de prueba. */
function utmALatLon(este: number, norte: number, huso: number, sur: boolean): Coordenada {
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const x = este - 500000, y = sur ? norte - 10000000 : norte;
  const m = y / k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const n1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2);
  const t1 = Math.tan(p1) ** 2, c1 = ep2 * Math.cos(p1) ** 2;
  const r1 = (a * (1 - e2)) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5;
  const d = x / (n1 * k0);
  const lat = p1 - ((n1 * Math.tan(p1)) / r1) * (d ** 2 / 2 - ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
    ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6) / 720);
  const lon = (d - ((1 + 2 * t1 + c1) * d ** 3) / 6 + ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) / Math.cos(p1);
  return [(lat * 180) / Math.PI, ((huso - 1) * 6 - 180 + 3) + (lon * 180) / Math.PI];
}

// Lote del plano de la sucesión Paredes (Civil 3D, UTM huso 18 sur): 36.490,8 m² en el dibujo
const LOTE_UTM: [number, number][] = [
  [629116.769, 5425518.24], [629104.994, 5425419.918], [629137.852, 5425408.581],
  [629268.793, 5425363.402], [629430.004, 5425308.312], [629441.923, 5425426.825],
];
const lote = LOTE_UTM.map(([e, n]) => utmALatLon(e, n, 18, true));
const coords = (pts: Coordenada[]) => pts.map(([la, lo]) => `${lo},${la},0`).join(" ");

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Predio</name>
  <Placemark><name>Lote 1 &amp; servidumbre</name><Style><LineStyle><color>ff0000ff</color></LineStyle></Style>
    <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords([...lote, lote[0]])}</coordinates></LinearRing></outerBoundaryIs></Polygon>
  </Placemark>
  <Placemark><name>Camino</name><LineString><coordinates>${coords(lote.slice(0, 2))}</coordinates></LineString></Placemark>
  <Placemark><name><![CDATA[Acceso]]></name><Point><coordinates>${coords([lote[0]])}</coordinates></Point></Placemark>
</Document></kml>`;

/** Arma un .zip mínimo (como un KMZ) con un archivo comprimido. */
function zip(nombre: string, contenido: string): Uint8Array {
  const datos = Buffer.from(contenido, "utf8");
  const comp = deflateRawSync(datos);
  const n = Buffer.from(nombre);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(datos.length, 22); local.writeUInt16LE(n.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(datos.length, 24); central.writeUInt16LE(n.length, 28);
  central.writeUInt32LE(0, 42);
  const inicioCentral = 30 + n.length + comp.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 8); fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(46 + n.length, 12); fin.writeUInt32LE(inicioCentral, 16);
  return new Uint8Array(Buffer.concat([local, n, comp, central, n, fin]));
}

describe("KMZ / KML", () => {
  it("la superficie coincide con la del dibujo de Civil 3D", () => {
    // En UTM la superficie se ve un poco reducida (factor de escala ~0,9998²): menos de 0,1 % de diferencia
    const m2 = superficie(lote);
    expect(Math.abs(m2 - 36490.8) / 36490.8).toBeLessThan(0.001);
  });

  it("mide distancias como el plano (337,8 m de un deslinde)", () => {
    const [e1, n1] = LOTE_UTM[4], [e2, n2] = LOTE_UTM[5];
    const enUtm = Math.hypot(e2 - e1, n2 - n1);
    expect(Math.abs(distancia(lote[4], lote[5]) - enUtm) / enUtm).toBeLessThan(0.001);
  });

  it("lee polígonos, líneas y puntos con sus nombres", () => {
    const el = leerKml(KML);
    expect(el.map((e) => [e.tipo, e.nombre])).toEqual([
      ["poligono", "Lote 1 & servidumbre"],
      ["linea", "Camino"],
      ["punto", "Acceso"],
    ]);
    const pol = el[0];
    expect(pol.tipo === "poligono" && pol.anillo).toHaveLength(6); // sin repetir el primer vértice
  });

  it("abre un KMZ (zip con doc.kml)", async () => {
    const k = zip("doc.kml", KML);
    expect(await kmlDeKmz(k)).toBe(KML);
    const el = await leerArchivoMapa(k);
    expect(el).toHaveLength(3);
  });

  it("explica los archivos que no sirven", async () => {
    await expect(leerArchivoMapa(new TextEncoder().encode("<kml></kml>"))).rejects.toThrow(/no tiene/);
    await expect(kmlDeKmz(new Uint8Array([0x50, 0x4b, 1, 2]))).rejects.toThrow(/no es un KMZ/);
  });
});
