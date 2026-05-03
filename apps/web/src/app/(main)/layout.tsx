import { BottomNav, DesktopRail } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { MascotFAB } from "@/components/MascotFAB";

export default function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surfaceLight">
      <DesktopRail />
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-2 lg:max-w-5xl lg:pl-72 lg:pr-8 lg:pt-8">
        {children}
      </main>
      <BottomNav />
      <MascotFAB />
    </div>
  );
}
