import { requireUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { PerfilForm } from "./PerfilForm";

export default async function PerfilPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>
      <PerfilForm perfil={data as Profile} email={user.email ?? ""} />
    </div>
  );
}
