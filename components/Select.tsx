"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Opcion = { value: string; label: string };

type Props = {
  opciones: Opcion[];
  /** Nombre del campo: se envía en el formulario mediante un input oculto. */
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Envía el formulario contenedor al elegir una opción (filtros). */
  enviarAlCambiar?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/** Lista desplegable con estilo de vidrio, animada y accesible con teclado. */
export function Select({ opciones, name, id, value, defaultValue, onChange, enviarAlCambiar, disabled, className = "", ...aria }: Props) {
  const [interno, setInterno] = useState(defaultValue ?? opciones[0]?.value ?? "");
  const actual = value ?? interno;
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const [haciaArriba, setHaciaArriba] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const oculto = useRef<HTMLInputElement>(null);
  const listaId = useId();
  const seleccionada = opciones.find((o) => o.value === actual) ?? opciones[0];

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAbierto(false);
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [abierto]);

  function abrir() {
    if (disabled) return;
    const r = boton.current!.getBoundingClientRect();
    // Abrir hacia arriba si no cabe abajo (considerando el menú flotante inferior)
    const alto = Math.min(opciones.length * 40 + 12, 288);
    setHaciaArriba(window.innerHeight - r.bottom - 96 < alto && r.top > alto);
    setResaltado(Math.max(0, opciones.findIndex((o) => o.value === actual)));
    setAbierto(true);
  }

  function elegir(v: string) {
    setAbierto(false);
    boton.current?.focus();
    if (v === actual) return;
    if (value === undefined) setInterno(v);
    onChange?.(v);
    if (enviarAlCambiar && oculto.current) {
      oculto.current.value = v;
      oculto.current.form?.requestSubmit();
    }
  }

  function teclado(e: React.KeyboardEvent) {
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    const mover = (i: number) => {
      e.preventDefault();
      setResaltado((i + opciones.length) % opciones.length);
    };
    if (e.key === "ArrowDown") mover(resaltado + 1);
    else if (e.key === "ArrowUp") mover(resaltado - 1);
    else if (e.key === "Home") mover(0);
    else if (e.key === "End") mover(opciones.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elegir(opciones[resaltado].value);
    } else if (e.key === "Escape" || e.key === "Tab") setAbierto(false);
    else if (e.key.length === 1) {
      // Escribir una letra salta a la siguiente opción que empieza con ella
      const letra = e.key.toLowerCase();
      const desde = opciones.findIndex((o, i) => i > resaltado && o.label.toLowerCase().startsWith(letra));
      const i = desde >= 0 ? desde : opciones.findIndex((o) => o.label.toLowerCase().startsWith(letra));
      if (i >= 0) setResaltado(i);
    }
  }

  return (
    <div ref={raiz} className={`relative ${className}`}>
      {name && <input ref={oculto} type="hidden" name={name} value={actual} />}
      <button
        ref={boton}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-activedescendant={abierto ? `${listaId}-${resaltado}` : undefined}
        aria-label={aria["aria-label"]}
        disabled={disabled}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={teclado}
        className="input flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{seleccionada?.label}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <ul
        id={listaId}
        role="listbox"
        className={`glass absolute z-30 max-h-72 w-full min-w-max overflow-y-auto rounded-2xl p-1.5 ${haciaArriba ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"} ${
          abierto ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        } transition-[opacity,transform,visibility] duration-200 ease-[var(--ease-out-expo)]`}
        style={{ background: "var(--glass-menu)", backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)" }}
      >
        {opciones.map((o, i) => {
          const elegida = o.value === actual;
          return (
            <li
              key={o.value}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={elegida}
              onPointerEnter={() => setResaltado(i)}
              onClick={() => elegir(o.value)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                i === resaltado ? "bg-brand-soft text-text" : "text-text"
              } ${elegida ? "font-semibold text-brand" : ""}`}
            >
              {o.label}
              <svg viewBox="0 0 24 24" className={`h-4 w-4 text-brand transition-all duration-200 ${elegida ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
