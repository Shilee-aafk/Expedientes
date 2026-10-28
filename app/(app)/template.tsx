/** Se vuelve a montar en cada navegación: el contenido entra con fundido y leve desplazamiento. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animar-entrada">{children}</div>;
}
