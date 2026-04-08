"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Package,
  Archive,
  Users, 
  Settings, 
  LogOut, 
  Zap,
  Bell
} from "lucide-react";

const MENU_ITEMS = [
  { name: "Métricas", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Conversaciones", icon: MessageSquare, href: "/dashboard/chats" },
  { name: "Catálogo", icon: Package, href: "/dashboard/catalogo" },
  { name: "Stock Propio", icon: Archive, href: "/dashboard/stock" },
  { name: "Clientes", icon: Users, href: "/dashboard/customers" },
  { name: "Configuración IA", icon: Settings, href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#020412] text-[#e2e8f0] font-sans flex overflow-hidden">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-[280px] bg-[#0d1b2a]/80 backdrop-blur-xl border-r border-[#ffffff0a] flex flex-col shrink-0 relative z-20">
        
        {/* Logo */}
        <div className="h-[80px] px-6 flex items-center gap-3 border-b border-[#ffffff0a]">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#00f5a0] to-[#00d4ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,245,160,0.3)]">
            <Zap className="text-[#020412] h-4 w-4" fill="currentColor" />
          </div>
          <span className="font-bold text-xl tracking-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            FASTBOT
          </span>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 px-4 py-8 flex flex-col gap-2">
          <div className="text-xs font-bold text-[#64748b] tracking-widest uppercase mb-4 px-2">Menu Principal</div>
          
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? "bg-linear-to-r from-[#00f5a015] to-transparent text-[#00f5a0] border-l-2 border-[#00f5a0]" 
                    : "text-[#94a3b8] hover:bg-[#ffffff05] hover:text-[#f1f5f9] border-l-2 border-transparent"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(0,245,160,0.8)]" : ""}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-[#ffffff0a]">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#94a3b8] hover:bg-[#ef444415] hover:text-[#ef4444] transition-colors group">
            <LogOut className="h-5 w-5 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Efecto de luz de fondo sutil para toda el área principal */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00f5a0] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />

        {/* Topbar */}
        <header className="h-[80px] px-8 flex items-center justify-between border-b border-[#ffffff0a] bg-[#020412]/50 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-[#f1f5f9] tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              Panel de Control
            </h2>
            <div className="px-3 py-1 rounded-full bg-[#00f5a015] border border-[#00f5a033] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f5a0] animate-pulse" />
              <span className="text-xs font-bold text-[#00f5a0] tracking-wider">IA EN LÍNEA</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-[#94a3b8] hover:text-[#00f5a0] transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ef4444] border-2 border-[#020412]" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-[#ffffff15]">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-[#f1f5f9]">Mi Empresa</div>
                <div className="text-xs text-[#64748b]">Plan Pro</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#1e293b] to-[#0f172a] border border-[#ffffff15] flex items-center justify-center text-sm font-bold text-[#f1f5f9]">
                ME
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content (Acá van a renderizarse las páginas) */}
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          {children}
        </main>
      </div>
      
    </div>
  );
}