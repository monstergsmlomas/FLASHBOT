"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, refreshAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    refreshAuth();
  }, [router]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar: solo visible en desktop (md+) */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        {/* pb-24 en móvil para dejar espacio al bottom nav */}
        <div className="p-4 md:p-6 pb-24 md:pb-6 h-full">
          {children}
        </div>
      </main>

      {/* Bottom nav: solo en móvil */}
      <BottomNav />
    </div>
  );
}
