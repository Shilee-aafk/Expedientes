/**
 * Nombre de una opción de la barra lateral. Al pasar el mouse (o con el foco del
 * teclado) solo por esa opción, sale de la misma barra hacia la derecha como una
 * masa pegajosa (ver .etiqueta-* en globals.css). Va dentro de un elemento con `group`.
 */
export function EtiquetaBarra({ texto }: { texto: string }) {
  return (
    <span aria-hidden className="etiqueta-barra pointer-events-none absolute top-1/2 left-10 flex h-9 -translate-y-1/2 items-center whitespace-nowrap">
      <span className="etiqueta-forma absolute inset-0">
        <span className="etiqueta-fondo" />
        <span className="etiqueta-borde" />
        <span className="etiqueta-union arriba" />
        <span className="etiqueta-union abajo" />
      </span>
      <span className="etiqueta-texto relative pr-4 pl-6 text-sm font-medium text-text">{texto}</span>
    </span>
  );
}
