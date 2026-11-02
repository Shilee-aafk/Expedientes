import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Páginas que no requieren sesión. */
const PUBLICAS = ["/login", "/migrar"];

/** Renueva la sesión de Supabase y manda al login a quien no la tenga. */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publica = PUBLICAS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!url || !clave) return publica ? respuesta : NextResponse.redirect(new URL("/login", request.url));

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(aGuardar) {
        aGuardar.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        aGuardar.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub && !publica) return NextResponse.redirect(new URL("/login", request.url));
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
