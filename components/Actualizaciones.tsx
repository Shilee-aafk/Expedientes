"use client";

import { useEffect, useState } from "react";
import { apiEscritorio, type EstadoActualizacion } from "@/lib/escritorio";

/** Estado del actualizador, sincronizado con la app de escritorio (null en el navegador). */
function useActualizacion() {
  const [estado, setEstado] = useState<EstadoActualizacion | null>(null);
  useEffect(() => {
    const api = apiEscritorio();
    if (!api) return;
    api.estadoActualizacion().then(setEstado);
    return api.alCambiarActualizacion(setEstado);
  }, []);
  return estado;
}

/** Aviso flotante cuando hay una versión nueva descargada y lista para instalar. */
export function AvisoActualizacion() {
  const estado = useActualizacion();
  const [descartada, setDescartada] = useState<string | null>(null);
  const [instalando, setInstalando] = useState(false);

  if (estado?.estado !== "lista" || descartada === estado.version) return null;

  return (
    <div role="status" className="no-print fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100%-2rem))]">
      <div className="glass flotar-entrada rounded-2xl p-4" style={{ background: "var(--glass-menu)" }}>
        <div className="flex items-start gap-3">
          <span className="liquido flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-oro">
            <svg viewBox="0 0 256 256" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,168,104H136V32a8,8,0,0,0-16,0v72H88a8,8,0,0,0-5.66,13.66Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Nueva versión {estado.version} lista</p>
            <p className="text-sm text-muted">Reinicia para actualizar. Si no, se instalará al cerrar la app.</p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-secondary px-4 py-1.5" onClick={() => setDescartada(estado.version)}>
            Más tarde
          </button>
          <button
            type="button"
            className="btn-primary px-4 py-1.5"
            disabled={instalando}
            onClick={() => {
              setInstalando(true);
              apiEscritorio()?.instalarActualizacion();
            }}
          >
            {instalando ? "Reiniciando…" : "Reiniciar y actualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TEXTO: Record<EstadoActualizacion["estado"], string> = {
  inactivo: "",
  buscando: "Buscando actualizaciones…",
  "al-dia": "Tienes la última versión.",
  "no-disponible": "Las actualizaciones funcionan solo en la app instalada.",
  descargando: "Descargando versión nueva…",
  lista: "",
  error: "No se pudo buscar actualizaciones.",
};

/** Versión instalada y botón para buscar actualizaciones (solo en la app de escritorio). */
export function VersionApp() {
  const estado = useActualizacion();
  const [version, setVersion] = useState<string | null>(null);
  const [paraTodos, setParaTodos] = useState(false);
  useEffect(() => {
    apiEscritorio()?.version().then(setVersion);
    apiEscritorio()?.instalacion?.().then((i) => setParaTodos(i.paraTodos));
  }, []);
  if (!version) return null;

  const ocupado = estado?.estado === "buscando" || estado?.estado === "descargando";
  let texto = estado ? TEXTO[estado.estado] : "";
  if (estado?.estado === "descargando") texto = `Descargando versión ${estado.version ?? "nueva"}… ${estado.porcentaje ?? 0}%`;
  if (estado?.estado === "lista") texto = `Versión ${estado.version} lista: reinicia para instalarla.`;

  return (
    <div className="card cascada space-y-3 p-6" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Aplicación</h2>
          <p className="text-sm text-muted">Versión {version}</p>
        </div>
        {estado?.estado === "lista" ? (
          <button type="button" className="btn-primary" onClick={() => apiEscritorio()?.instalarActualizacion()}>
            Reiniciar y actualizar
          </button>
        ) : (
          <button type="button" className="btn-secondary" disabled={ocupado} onClick={() => apiEscritorio()?.buscarActualizacion()}>
            Buscar actualizaciones
          </button>
        )}
      </div>
      {texto && (
        <p key={texto} className={`animar-entrada text-sm ${estado?.estado === "error" ? "text-danger" : "text-muted"}`}>
          {texto}
        </p>
      )}
      {paraTodos && (
        <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
          La app está instalada «para todos los usuarios», por eso Windows pide permiso en cada actualización. Para que se
          actualice sola: desinstálala (tus datos están en Supabase y no se pierden), vuelve a instalarla y elige{" "}
          <b>«Solo para mí»</b>.
        </p>
      )}
            {estado?.estado === "descargando" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${estado.porcentaje ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}
