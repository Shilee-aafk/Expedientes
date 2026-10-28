export function formatoFecha(fecha: string | null) {
  if (!fecha) return "—";
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}

export function formatoFechaHora(ts: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}
