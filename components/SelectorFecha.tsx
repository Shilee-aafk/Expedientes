"use client";

import { useEffect, useId, useRef, useState } from "react";
import { hoyChile } from "@/lib/checklist";

type Props = {
  /** Nombre del campo: se envía en el formulario mediante un input oculto (AAAA-MM-DD). */
  name?: string;
  id?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (fecha: string | null) => void;
  /** Fechas límite en formato AAAA-MM-DD. */
  min?: string;
  max?: string;
  placeholder?: string;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

// Fechas como texto AAAA-MM-DD, calculadas en UTC para no depender de la zona horaria
const aTexto = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d)).toISOString().slice(0, 10);
const partes = (f: string) => f.split("-").map(Number) as [number, number, number];
const sumarDias = (f: string, n: number) => {
  const [a, m, d] = partes(f);
  return aTexto(a, m - 1, d + n);
};
const sumarMeses = (f: string, n: number) => {
  const [a, m, d] = partes(f);
  const ultimo = new Date(Date.UTC(a, m - 1 + n + 1, 0)).getUTCDate();
  return aTexto(a, m - 1 + n, Math.min(d, ultimo));
};
const formatear = (f: string) => {
  const [a, m, d] = partes(f);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};
const formatearCorto = (f: string) => {
  const [a, m, d] = partes(f);
  return `${d} ${MESES[m - 1].slice(0, 3)} ${a}`;
};

/** Selector de fecha con calendario propio (vidrio, en español, semanas de lunes a domingo). */
export function SelectorFecha({ name, id, value, defaultValue, onChange, min, max, placeholder = "Elegir fecha" }: Props) {
  const [interno, setInterno] = useState<string | null>(defaultValue || null);
  const actual = value !== undefined ? value || null : interno;
  const hoy = hoyChile();
  const [abierto, setAbierto] = useState(false);
  const [haciaArriba, setHaciaArriba] = useState(false);
  const [aLaDerecha, setALaDerecha] = useState(false);
  const [enfocado, setEnfocado] = useState(actual ?? hoy);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const grilla = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const fuera = (f: string) => (min !== undefined && f < min) || (max !== undefined && f > max);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAbierto(false);
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [abierto]);

  // El día enfocado recibe el foco real del teclado
  useEffect(() => {
    if (abierto) grilla.current?.querySelector<HTMLButtonElement>(`[data-fecha="${enfocado}"]`)?.focus();
  }, [abierto, enfocado]);

  function abrir() {
    const r = boton.current!.getBoundingClientRect();
    setHaciaArriba(window.innerHeight - r.bottom < 380 && r.top > 380);
    // Si el panel (19rem ≈ 304px) no cabe hacia la derecha, se alinea al borde derecho del campo
    setALaDerecha(r.left + 312 > window.innerWidth);
    setEnfocado(actual ?? (max && hoy > max ? max : hoy));
    setAbierto(true);
  }

  function elegir(f: string | null) {
    if (f && fuera(f)) return;
    setAbierto(false);
    boton.current?.focus();
    if (f === actual) return;
    if (value === undefined) setInterno(f);
    onChange?.(f);
  }

  function teclado(e: React.KeyboardEvent) {
    const mover: Record<string, () => string> = {
      ArrowLeft: () => sumarDias(enfocado, -1),
      ArrowRight: () => sumarDias(enfocado, 1),
      ArrowUp: () => sumarDias(enfocado, -7),
      ArrowDown: () => sumarDias(enfocado, 7),
      PageUp: () => sumarMeses(enfocado, -1),
      PageDown: () => sumarMeses(enfocado, 1),
    };
    if (mover[e.key]) {
      e.preventDefault();
      setEnfocado(mover[e.key]());
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAbierto(false);
      boton.current?.focus();
    }
  }

  // Grilla fija de 6 semanas (42 días) para que el panel no cambie de alto entre meses
  const [anio, mes] = partes(enfocado);
  const desfase = (new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay() + 6) % 7;
  const dias = Array.from({ length: 42 }, (_, i) => aTexto(anio, mes - 1, 1 - desfase + i));

  return (
    <div ref={raiz} className="relative">
      {name && <input type="hidden" name={name} value={actual ?? ""} />}
      <button
        ref={boton}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        className="input flex cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${actual ? "" : "text-muted/80"}`} aria-label={actual ? formatear(actual) : undefined}>
          {actual ? formatearCorto(actual) : placeholder}
        </span>
        <svg viewBox="0 0 256 256" fill="currentColor" className="h-4 w-4 shrink-0 text-muted" aria-hidden>
          <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,48H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24Z" />
        </svg>
      </button>

      <div
        id={panelId}
        role="dialog"
        aria-label="Elegir fecha"
        onKeyDown={teclado}
        className={`glass absolute z-30 w-[19rem] rounded-2xl p-3 ${aLaDerecha ? "right-0" : "left-0"} ${haciaArriba ? "bottom-full mb-2" : "top-full mt-2"} ${
          haciaArriba ? (aLaDerecha ? "origin-bottom-right" : "origin-bottom-left") : aLaDerecha ? "origin-top-right" : "origin-top-left"
        } ${
          abierto ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
        style={{
          background: "var(--glass-menu)",
          // Al abrir se hace visible de inmediato (si no, el día no puede recibir el foco del teclado);
          // al cerrar se oculta recién al terminar el fundido
          transition: `opacity 200ms var(--ease-out-expo), transform 200ms var(--ease-out-expo), visibility 0s linear ${abierto ? "0s" : "200ms"}`,
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <button type="button" tabIndex={-1} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand" onClick={() => setEnfocado(sumarMeses(enfocado, -1))} aria-label="Mes anterior">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <span key={`${anio}-${mes}`} className="animar-entrada text-sm font-semibold capitalize" aria-live="polite">
            {MESES[mes - 1]} {anio}
          </span>
          <button type="button" tabIndex={-1} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand" onClick={() => setEnfocado(sumarMeses(enfocado, 1))} aria-label="Mes siguiente">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
          {DIAS.map((d) => (
            <span key={d} className="py-1">{d}</span>
          ))}
        </div>
        <div ref={grilla} role="grid" className="grid grid-cols-7 gap-0.5">
          {dias.map((f) => {
            const delMes = partes(f)[1] === mes;
            const elegido = f === actual;
            const esHoy = f === hoy;
            const deshabilitado = fuera(f);
            return (
              <button
                key={f}
                type="button"
                role="gridcell"
                data-fecha={f}
                tabIndex={f === enfocado ? 0 : -1}
                aria-selected={elegido}
                aria-label={formatear(f)}
                disabled={deshabilitado}
                onClick={() => elegir(f)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), elegir(f))}
                className={`relative flex h-9 cursor-pointer items-center justify-center rounded-full text-sm tabular-nums outline-none transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-25 ${
                  elegido
                    ? "liquido font-semibold text-on-oro"
                    : `${delMes ? "text-text" : "text-muted/50"} hover:bg-brand-soft focus-visible:bg-brand-soft ${esHoy ? "font-semibold text-brand" : ""}`
                } ${f === enfocado && !elegido ? "ring-1 ring-brand/40" : ""}`}
              >
                {partes(f)[2]}
                {esHoy && !elegido && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand" aria-hidden />}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <button type="button" className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40" onClick={() => elegir(null)} disabled={!actual}>
            Borrar
          </button>
          <button type="button" className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-soft disabled:opacity-40" onClick={() => elegir(hoy)} disabled={fuera(hoy)}>
            Hoy
          </button>
        </div>
      </div>
    </div>
  );
}
