"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, refreshAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    // Refresca user + tenant para corregir cualquier encoding corrupto en localStorage
    refreshAuth();
  }, [router]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 h-full">{children}</div>
      </main>
    </div>
  );
}
