import { Esqueleto } from "@/components/ui";

export default function Cargando() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Esqueleto className="h-4 w-24" />
        <Esqueleto className="h-8 w-64" />
        <Esqueleto className="h-4 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-2">
          <Esqueleto className="h-24" />
          {Array.from({ length: 8 }, (_, i) => (
            <Esqueleto key={i} className="h-16" />
          ))}
        </div>
        <div className="space-y-4">
          <Esqueleto className="h-48" />
          <Esqueleto className="h-40" />
        </div>
      </div>
    </div>
  );
}
