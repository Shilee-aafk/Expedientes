/**
 * Nombre de una opción de la barra lateral. La forma de vidrio que lo rodea la dibuja
 * BarraLateral (es la misma barra estirándose); aquí solo va el texto, que aparece al
 * pasar el mouse (o con el foco del teclado). Va dentro de un elemento con `group`.
 */
export function EtiquetaBarra({ texto }: { texto: string }) {
  return (
    <span aria-hidden className="etiqueta-barra pointer-events-none absolute top-1/2 left-12 flex h-10 -translate-y-1/2 items-center whitespace-nowrap">
      <span className="etiqueta-texto relative pr-5 pl-6 text-[0.95rem] font-medium text-text">{texto}</span>
    </span>
  );
}
