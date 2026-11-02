import { NextResponse, type NextRequest } from "next/server";
import { enlaceArchivo, guardarArchivo } from "@/lib/archivos";
import { usuarioActual } from "@/lib/sesion";

/** Abre un documento adjunto (privado) mediante un enlace temporal de Supabase Storage. */
export async function GET(request: NextRequest) {
  if (!(await usuarioActual())) return new NextResponse("Sin sesión", { status: 401 });
  const ruta = request.nextUrl.searchParams.get("path") ?? "";
  const enlace = ruta ? await enlaceArchivo(ruta) : null;
  if (!enlace) return new NextResponse("Archivo no encontrado", { status: 404 });
  return NextResponse.redirect(enlace);
}

/** Sube un archivo y devuelve su ruta: { path }. */
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
