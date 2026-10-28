import { Header } from "@/components/Header";
import { requireUser } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 print:pt-0 print:pb-0">{children}</main>
    </>
  );
}
