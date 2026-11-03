import { Header } from "@/components/Header";
import { requireUser } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl pt-8 pr-4 pb-16 pl-24 sm:pt-10 xl:px-4 print:p-0">{children}</main>
    </>
  );
}
