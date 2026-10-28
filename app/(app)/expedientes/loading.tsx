import { Esqueleto } from "@/components/ui";

export default function Cargando() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <Esqueleto className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Esqueleto key={i} className="h-24" />
        ))}
      </div>
      <Esqueleto className="h-11 max-w-xl" />
      {Array.from({ length: 5 }, (_, i) => (
        <Esqueleto key={i} className="h-20" />
      ))}
    </div>
  );
}
