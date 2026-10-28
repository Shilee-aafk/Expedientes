import { NextResponse, type NextRequest } from "next/server";
import { cerrarSesion } from "@/lib/sesion";

export async function POST(request: NextRequest) {
  await cerrarSesion();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
