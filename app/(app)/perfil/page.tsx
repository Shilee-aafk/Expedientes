import { VersionApp } from "@/components/Actualizaciones";
import { PluginAutocad } from "@/components/PluginAutocad";
import { configSupabase } from "@/lib/supabase/server";
import { listarUsuarios } from "@/lib/repo";
import { requireUser } from "@/lib/sesion";
import { Equipo } from "./Equipo";
import { PerfilForm } from "./PerfilForm";

export default async function PerfilPage() {
  const { user } = await requireUser();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
      <PerfilForm perfil={user} />
      <Equipo usuarios={await listarUsuarios()} yoId={user.id} />
      <VersionApp />
      <PluginAutocad url={configSupabase().url} anonKey={configSupabase().clave} />
    </div>
  );
}
