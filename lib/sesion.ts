import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { DURACION_SESION_DIAS, borrarSesion, crearSesion, usuarioDeSesion } from "./repo";

export const COOKIE_SESION = "sesion";

/** Usuario con sesión válida, o redirige al login. Una sola consulta por petición. */
export const requireUser = cache(async () => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const user = token ? usuarioDeSesion(token) : null;
  if (!user) redirect("/login");
  return { user };
});

export async function usuarioActual() {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  return token ? usuarioDeSesion(token) : null;
}

export async function iniciarSesion(usuarioId: number) {
  (await cookies()).set(COOKIE_SESION, crearSesion(usuarioId), {
    httpOnly: true,
    sameSite: "lax",
    // En la red local se entra por http; "secure" solo si se publica con https
    secure: process.env.SESION_SEGURA === "1",
    path: "/",
    maxAge: DURACION_SESION_DIAS * 86_400,
  });
}

export async function cerrarSesion() {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_SESION)?.value;
  if (token) borrarSesion(token);
  almacen.delete(COOKIE_SESION);
}
