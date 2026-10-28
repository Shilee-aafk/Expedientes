"use client";

export function Imprimir() {
  return (
    <button className="btn-primary" onClick={() => window.print()}>
      Imprimir / guardar PDF
    </button>
  );
}
