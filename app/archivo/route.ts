import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Abre un documento privado mediante un enlace firmado de corta duración. */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) return new NextResponse("Falta el archivo", { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 60);
  if (error || !data) return new NextResponse("Archivo no encontrado", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
