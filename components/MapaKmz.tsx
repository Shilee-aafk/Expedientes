"use client";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";
import { formatoHa, formatoM, leerArchivoMapa, type Elemento } from "@/lib/kmz";
import type { KmzExpediente } from "@/lib/repo";

const ORO = "#d6b582";
/** Los KMZ de otros expedientes: claros y discretos, para no competir con el propio */
const OTRO = "#e9e4da";

async function descargar(ruta: string) {
  const r = await fetch(`/archivo?path=${encodeURIComponent(ruta)}`);
  if (!r.ok) throw new Error("No se pudo descargar el archivo.");
  return leerArchivoMapa(new Uint8Array(await r.arrayBuffer()));
}

/** Polígono, línea o punto dibujado en el mapa */
type Capa = L.Path & { getBounds?: () => L.LatLngBounds; getLatLng?: () => L.LatLng };

/**
 * Muestra en un mapa (satelital o calles) el KMZ/KML adjunto al expediente, con la
 * superficie y el perímetro de cada polígono. De fondo se ven los KMZ de los demás
 * expedientes (capa "Otros expedientes"), pero el mapa se centra en el propio.
 * Leaflet se carga solo en el navegador.
 */
export function MapaKmz({ ruta, otros = [] }: { ruta: string; otros?: KmzExpediente[] }) {
  const router = useRouter();
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capas = useRef<Map<number, Capa>>(new Map());
  const [elementos, setElementos] = useState<Elemento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const nombreArchivo = ruta.split("/").pop()?.replace(/^\d+-/, "") ?? "archivo";

  useEffect(() => {
    let cancelado = false;
    const dibujadas = capas.current;
    (async () => {
      try {
        const el = await descargar(ruta);
        if (cancelado) return;
        setElementos(el);

        const Lf = (await import("leaflet")).default;
        if (cancelado || !contenedor.current) return;
        const m = Lf.map(contenedor.current, { zoomControl: true, attributionControl: true });
        mapa.current = m;
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
        const capaOtros = Lf.featureGroup().addTo(m);
        Lf.control
          .layers({ Satélite: satelite, Calles: calles }, otros.length ? { "Otros expedientes": capaOtros } : undefined, { position: "topright" })
          .addTo(m);
        Lf.control.scale({ imperial: false }).addTo(m);

        const grupo = Lf.featureGroup().addTo(m);
        el.forEach((e, i) => {
          let capa: Capa;
          if (e.tipo === "poligono") {
            capa = Lf.polygon(e.anillo, { color: ORO, weight: 2.5, fillColor: ORO, fillOpacity: 0.18 });
            capa.bindTooltip(`<b>${escapar(e.nombre)}</b><br>${formatoHa(e.superficie)}`, { sticky: true });
          } else if (e.tipo === "linea") {
            capa = Lf.polyline(e.puntos, { color: "#fff", weight: 2, dashArray: "6 6", opacity: 0.9 });
            capa.bindTooltip(`<b>${escapar(e.nombre)}</b><br>${formatoM(e.largo)}`, { sticky: true });
          } else {
            capa = Lf.circleMarker(e.punto, { radius: 6, color: "#fff", weight: 2, fillColor: ORO, fillOpacity: 1 });
            capa.bindTooltip(escapar(e.nombre));
          }
          capa.on("click", () => setElegido(i));
          capa.addTo(grupo);
          capas.current.set(i, capa);
        });
        m.fitBounds(grupo.getBounds(), { padding: [24, 24], maxZoom: 18 });
        grupo.bringToFront();

        // Los demás expedientes, de a pocos a la vez (sin mover el foco del mapa)
        const pendientes = [...otros];
        const trabajar = async () => {
          for (let o = pendientes.shift(); o && !cancelado; o = pendientes.shift()) {
            try {
              const eo = await descargar(o.ruta);
              if (cancelado) return;
              const g = Lf.featureGroup();
              for (const e of eo) {
                const c =
                  e.tipo === "poligono"
                    ? Lf.polygon(e.anillo, { color: OTRO, weight: 1.5, opacity: 0.8, fillColor: OTRO, fillOpacity: 0.08 })
                    : e.tipo === "linea"
                      ? Lf.polyline(e.puntos, { color: OTRO, weight: 1, opacity: 0.6, dashArray: "4 6" })
                      : Lf.circleMarker(e.punto, { radius: 4, color: OTRO, weight: 1, fillColor: OTRO, fillOpacity: 0.7 });
                c.addTo(g);
              }
              g.bindTooltip(`<b>${escapar(o.predio)}</b><br>${escapar(o.codigo)} · clic para abrir`, { sticky: true });
              g.on("click", () => router.push(`/expedientes/${o.expedienteId}`));
              g.on("mouseover", () => g.setStyle({ weight: 3, fillOpacity: 0.16 }));
              g.on("mouseout", () => g.setStyle({ weight: 1.5, fillOpacity: 0.08 }));
              g.addTo(capaOtros);
              grupo.bringToFront();
            } catch {
              /* un KMZ ajeno dañado no impide ver el resto */
            }
          }
        };
        void Promise.all([trabajar(), trabajar(), trabajar()]);
      } catch (e) {
        if (!cancelado) setError((e as Error).message);
      }
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      dibujadas.clear();
    };
    // otros llega del servidor y no cambia mientras se ve el mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta]);

  // Resalta el elemento elegido en la lista o en el mapa
  useEffect(() => {
    capas.current.forEach((capa, i) => {
      if (capa.getBounds) capa.setStyle({ weight: i === elegido ? 4.5 : 2.5 });
    });
    const c = elegido === null ? null : capas.current.get(elegido);
    if (c && mapa.current) {
      if (c.getBounds) mapa.current.flyToBounds(c.getBounds(), { padding: [40, 40], maxZoom: 18, duration: 0.6 });
      else if (c.getLatLng) mapa.current.flyTo(c.getLatLng(), 18, { duration: 0.6 });
    }
  }, [elegido]);

  const poligonos = (elementos ?? []).map((e, i) => ({ e, i })).filter((x) => x.e.tipo === "poligono");
  const sups = poligonos.map((x) => (x.e.tipo === "poligono" ? x.e.superficie : 0));
  const mayor = Math.max(0, ...sups);
  const resto = sups.reduce((a, b) => a + b, 0) - mayor;
  // Si el polígono más grande es el predio completo (≈ suma de los demás), el total es el de los lotes
  const conPredio = sups.length > 2 && Math.abs(mayor - resto) / mayor < 0.02;
  const total = conPredio ? resto : mayor + resto;

  return (
    <div className="card cascada space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Mapa del KMZ</h2>
        <a href={`/archivo?path=${encodeURIComponent(ruta)}`} className="truncate text-xs text-muted hover:text-brand" target="_blank" rel="noreferrer">
          {nombreArchivo}
        </a>
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <div ref={contenedor} className="mapa-kmz h-80 overflow-hidden rounded-xl bg-bg sm:h-96" aria-label="Mapa del predio">
          {!elementos && <p className="p-4 text-sm text-muted">Cargando mapa…</p>}
        </div>
      )}
      {poligonos.length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {poligonos.map(({ e, i }) =>
            e.tipo === "poligono" ? (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setElegido(i)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 py-1.5 text-left transition-colors hover:text-brand ${elegido === i ? "text-brand" : ""}`}
                >
                  <span className="truncate">{e.nombre}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatoHa(e.superficie)} · {formatoM(e.perimetro)}
                  </span>
                </button>
              </li>
            ) : null,
          )}
          {poligonos.length > 1 && (
            <li className="flex justify-between py-1.5 font-medium">
              <span>{conPredio ? "Suma de los lotes" : "Total"}</span>
              <span className="tabular-nums">{formatoHa(total)}</span>
            </li>
          )}
        </ul>
      )}
      <p className="text-xs text-muted">
        {otros.length > 0 && `En gris, ${otros.length === 1 ? "el KMZ de otro expediente" : `los KMZ de otros ${otros.length} expedientes`} (clic para abrirlo). `}
        Superficies calculadas sobre el elipsoide WGS84; pueden diferir levemente de las del plano en UTM.
      </p>
    </div>
  );
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
