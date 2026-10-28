import { redirect } from "next/navigation";
import { contarUsuarios } from "@/lib/repo";
import { usuarioActual } from "@/lib/sesion";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await usuarioActual()) redirect("/expedientes");
  return <LoginForm primerUso={contarUsuarios() === 0} />;
}
