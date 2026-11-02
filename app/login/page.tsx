import { redirect } from "next/navigation";
import { resumenLocal } from "@/lib/migracion";
import { hayUsuarios } from "@/lib/repo";
import { usuarioActual } from "@/lib/sesion";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let primerUso = false;
  let errorConexion: string | null = null;
  try {
    if (await usuarioActual()) redirect("/expedientes");
    primerUso = !(await hayUsuarios());
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    errorConexion = (e as Error).message;
  }
  // Datos de la versión anterior (base local) que aún no se suben a Supabase
  const local = resumenLocal();
  return <LoginForm primerUso={primerUso} errorConexion={errorConexion} local={local} />;
}
