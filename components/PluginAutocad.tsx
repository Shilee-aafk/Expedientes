"use client";

import { useEffect, useState } from "react";
import { apiEscritorio, type EstadoPlugin } from "@/lib/escritorio";

/** Instala o actualiza el plugin de AutoCAD / Civil 3D (solo en la app de escritorio). */
export function PluginAutocad({ url, anonKey }: { url: string; anonKey: string }) {
  const [estado, setEstado] = useState<EstadoPlugin | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    apiEscritorio()?.estadoPlugin?.().then(setEstado);
  }, []);
  if (!estado?.disponible) return null;

  const instalar = async () => {
    setOcupado(true);
    setMensaje(null);
    try {
      const e = await apiEscritorio()!.instalarPlugin({ url, anonKey });
      setEstado(e);
      setMensaje({ ok: true, texto: "Listo. Abre (o reinicia) AutoCAD o Civil 3D y escribe SPR_VINETA." });
    } catch (err) {
      // Electron antepone "Error invoking remote method…: Error:" al mensaje
      setMensaje({ ok: false, texto: String((err as Error).message).replace(/^.*?Error: /, "") });
    } finally {
      setOcupado(false);
    }
  };

  const alDia = estado.instalada === estado.version;
  return (
    <div className="card cascada space-y-3 p-6" style={{ "--i": 5 } as React.CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Plugin para AutoCAD / Civil 3D</h2>
          <p className="text-sm text-muted">
            {estado.instalada ? `Instalado: versión ${estado.instalada}` : "No instalado en este equipo"}
            {!alDia && estado.instalada ? ` · disponible ${estado.version}` : ""}
          </p>
        </div>
        <button type="button" className={alDia ? "btn-secondary" : "btn-primary"} disabled={ocupado} onClick={instalar}>
          {estado.instalada ? (alDia ? "Reinstalar" : "Actualizar") : "Instalar"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Sirve para AutoCAD y Civil 3D 2021 a 2027. Dentro del programa: <b>SPR_INGRESAR</b> (con tu usuario de la app),{" "}
        <b>SPR_EXPEDIENTE</b> y <b>SPR_VINETA</b>.
      </p>
      {mensaje && <p className={`animar-entrada text-sm ${mensaje.ok ? "text-ok" : "text-danger"}`}>{mensaje.texto}</p>}
    </div>
  );
}
