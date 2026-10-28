import { Header } from "@/components/Header";
import { MenuInferior } from "@/components/MenuInferior";
import { requireUser } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();

  return (
    <>
      <Header nombre={user.nombre || user.usuario} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-32 print:pb-0">{children}</main>
      <MenuInferior />
    </>
  );
}
