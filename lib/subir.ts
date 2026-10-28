/** Sube un archivo desde el navegador a la carpeta indicada y devuelve su ruta guardada. */
export async function subirArchivo(carpeta: string, archivo: File): Promise<string> {
  const datos = new FormData();
  datos.set("carpeta", carpeta);
  datos.set("archivo", archivo);
  const res = await fetch("/archivo", { method: "POST", body: datos });
  const json = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
  if (!res.ok || !json.path) throw new Error(json.error ?? "No se pudo subir el archivo");
  return json.path;
}
