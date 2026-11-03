"use client";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";
import { crearMapa, deAPocos, descargarKmz, dibujarKmz, escaparHtml } from "@/lib/mapaBase";
import type { KmzExpediente } from "@/lib/repo";
import { ESTADOS, ETIQUETA_ESTADO, type EstadoExpediente } from "@/lib/types";

/** Color de cada estado en el mapa (se distinguen sobre el satélite) */
export const COLOR_ESTADO: Record<EstadoExpediente, string> = {
  borrador: "#b8b0a4",
  en_revision: "#e2c27f",
  listo_para_enviar: "#7fd1a0",
  enviado: "#6fb2ec",
  observado: "#f08a5d",
  aprobado: "#3fbf6e",
};

/**
 * Todos los predios con KMZ en un solo mapa, coloreados por el estado del expediente.
 * La leyenda muestra u oculta cada estado; clic en un predio abre su expediente.
 */
export function MapaGeneral({ kmz }: { kmz: KmzExpediente[] }) {
  const router = useRouter();
  const contenedor = useRef<HTMLDivElement>(null);
  const grupos = useRef<Map<EstadoExpediente, L.FeatureGroup>>(new Map());
  const mapa = useRef<L.Map | null>(null);
  const [cargados, setCargados] = useState(0);
  const [fallidos, setFallidos] = useState<string[]>([]);
  const [ocultos, setOcultos] = useState<Set<EstadoExpediente>>(new Set());

  const porEstado = ESTADOS.map((e) => ({ estado: e, n: kmz.filter((k) => k.estado === e).length })).filter((x) => x.n > 0);

  useEffect(() => {
    let cancelado = false;
    const gs = grupos.current;
    (async () => {
      const Lf = (await import("leaflet")).default;
      if (cancelado || !contenedor.current) return;
      const m = crearMapa(Lf, contenedor.current);
      mapa.current = m;
      // Vista inicial: Chile centro-sur, hasta que carguen los predios
      m.setView([-39.5, -72.5], 6);
      for (const e of ESTADOS) gs.set(e, Lf.featureGroup().addTo(m));
      let todos: L.LatLngBounds | null = null;

      await deAPocos(kmz, 4, async (k) => {
        try {
          const el = await descargarKmz(k.ruta);
          if (cancelado) return;
          const g = dibujarKmz(Lf, el, COLOR_ESTADO[k.estado], 0.22);
          g.bindTooltip(`<b>${escaparHtml(k.predio)}</b><br>${escaparHtml(k.codigo)} · ${ETIQUETA_ESTADO[k.estado]}`, { sticky: true });
          g.on("click", () => router.push(`/expedientes/${k.expedienteId}`));
          g.on("mouseover", () => g.setStyle({ weight: 4, fillOpacity: 0.4 }));
          g.on("mouseout", () => g.setStyle({ weight: 2, fillOpacity: 0.22 }));
          g.addTo(gs.get(k.estado)!);
          // El primero encuadra el mapa de inmediato; al final se encuadran todos
          if (!todos) m.fitBounds(g.getBounds(), { padding: [30, 30], maxZoom: 15 });
          todos = todos ? todos.extend(g.getBounds()) : Lf.latLngBounds(g.getBounds().getSouthWest(), g.getBounds().getNorthEast());
        } catch {
          if (!cancelado) setFallidos((f) => [...f, k.codigo]);
        } finally {
          if (!cancelado) setCargados((n) => n + 1);
        }
      });
      if (!cancelado && todos) m.fitBounds(todos, { padding: [30, 30], maxZoom: 15 });
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      gs.clear();
    };
    // kmz llega del servidor y no cambia mientras se ve la página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mostrar u ocultar estados
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    grupos.current.forEach((g, e) => {
      if (ocultos.has(e)) m.removeLayer(g);
      else if (!m.hasLayer(g)) g.addTo(m);
    });
  }, [ocultos]);

  const alternar = (e: EstadoExpediente) =>
    setOcultos((o) => {
      const n = new Set(o);
      if (n.has(e)) n.delete(e);
      else n.add(e);
      return n;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {porEstado.map(({ estado, n }) => {
          const visible = !ocultos.has(estado);
          return (
            <button
              key={estado}
              type="button"
              onClick={() => alternar(estado)}
              aria-pressed={visible}
              className={`glass flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-opacity ${visible ? "" : "opacity-45"}`}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: COLOR_ESTADO[estado], boxShadow: `0 0 0 2px ${COLOR_ESTADO[estado]}40` }} />
              {ETIQUETA_ESTADO[estado]}
              <span className="text-muted tabular-nums">{n}</span>
            </button>
          );
        })}
        {cargados < kmz.length && (
          <span className="text-sm text-muted">
            Cargando predios… {cargados}/{kmz.length}
          </span>
        )}
      </div>
      <div ref={contenedor} className="mapa-kmz card h-[calc(100vh-11rem)] min-h-96 overflow-hidden" aria-label="Mapa de todos los predios" />
      {fallidos.length > 0 && <p className="text-sm text-danger">No se pudo leer el KMZ de: {fallidos.join(", ")}.</p>}
    </div>
  );
}
