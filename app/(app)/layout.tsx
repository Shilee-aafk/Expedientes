import { Header } from "@/components/Header";
import { MenuInferior } from "@/components/MenuInferior";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const { data: perfil } = await supabase.from("profiles").select("nombre").eq("id", user.id).single();

  return (
    <>
      <Header nombre={perfil?.nombre || user.email || ""} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-32 print:pb-0">{children}</main>
      <MenuInferior />
    </>
  );
}
