import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro rápido: sin cookie de sesión, al login. La validez real de la sesión
 * la comprueba requireUser contra la base de datos.
 */
export function middleware(request: NextRequest) {
  const enLogin = request.nextUrl.pathname.startsWith("/login");
  if (!enLogin && !request.cookies.has("sesion")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
