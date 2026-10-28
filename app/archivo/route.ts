import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { TIPOS, guardarArchivo, rutaSegura } from "@/lib/archivos";
import { usuarioActual } from "@/lib/sesion";

/** Muestra un documento adjunto (solo con sesión). */
export async function GET(request: NextRequest) {
  if (!(await usuarioActual())) return new NextResponse("Sin sesión", { status: 401 });
  const relativa = request.nextUrl.searchParams.get("path") ?? "";
  const abs = rutaSegura(relativa);
  if (!abs) return new NextResponse("Ruta inválida", { status: 400 });
  try {
    const contenido = await fs.readFile(abs);
    const nombre = path.basename(abs).replace(/^\d+-/, "");
    return new NextResponse(contenido, {
      headers: {
        "Content-Type": TIPOS[path.extname(abs).toLowerCase()] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }
}

/** Sube un archivo y devuelve su ruta relativa: { path }. */
export async function POST(request: NextRequest) {
  if (!(await usuarioActual())) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const datos = await request.formData();
  const archivo = datos.get("archivo");
  const carpeta = String(datos.get("carpeta") ?? "");
  if (!(archivo instanceof File) || archivo.size === 0) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  try {
    return NextResponse.json({ path: await guardarArchivo(carpeta, archivo) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
