"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, getStoredTenant, getStoredUser, type Tenant, type User } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Users, Settings, LogOut,
  LayoutDashboard, MessageCircle,
  Smartphone, ShoppingCart, Wrench, Package, UserCog, LayoutGrid,
  Truck, UtensilsCrossed,
} from "lucide-react";
import { ModulesModal } from "@/components/ModulesModal";

const ALL_NAV_ITEMS = [
  { href: "/dashboard",              label: "Dashboard",      icon: LayoutDashboard, module: null,           exact: true },
  { href: "/dashboard/appointments", label: "Turnos",         icon: CalendarDays,    module: "appointments", exact: false },
  { href: "/dashboard/customers",    label: "Clientes",       icon: Users,           module: "customers",    exact: false },
  { href: "/dashboard/employees",    label: "Empleados",      icon: UserCog,         module: "employees",    exact: false },
  { href: "/dashboard/sales",        label: "Ventas",         icon: ShoppingCart,    module: "sales",        exact: false },
  { href: "/dashboard/inventory",    label: "Inventario",     icon: Package,         module: "sales",        exact: false },
  { href: "/dashboard/orders",       label: "Pedidos",        icon: Truck,           module: "delivery",     exact: false },
  { href: "/dashboard/menu",         label: "Menú",           icon: UtensilsCrossed, module: "delivery",     exact: false },
  { href: "/dashboard/repairs",      label: "Reparaciones",   icon: Wrench,          module: "repairs",      exact: false },
  { href: "/dashboard/whatsapp",     label: "WhatsApp Bot",   icon: Smartphone,      module: null,           exact: false },
  { href: "/dashboard/settings",     label: "Configuración",  icon: Settings,        module: null,           exact: false },
];

export function Sidebar() {
  const pathname = usePathname();

  // Estado reactivo — se actualiza cuando settings guarda un nombre nuevo
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [user, setUser]     = useState<User | null>(null);
  const [showModules, setShowModules] = useState(false);

  // Estado de conexión WhatsApp para el dot indicador
  const [waConnected, setWaConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Carga inicial
    setTenant(getStoredTenant());
    setUser(getStoredUser());

    // Escucha el evento custom que lanza settings al guardar
    const refresh = () => {
      setTenant(getStoredTenant());
      setUser(getStoredUser());
    };
    window.addEventListener("auth-updated", refresh);
    return () => window.removeEventListener("auth-updated", refresh);
  }, []);

  // Polling de estado WhatsApp cada 12 segundos
  useEffect(() => {
    const fetchWaStatus = () => {
      api.get("/whatsapp/status")
        .then((r) => setWaConnected(r.data.connected))
        .catch(() => setWaConnected(false));
    };
    fetchWaStatus();
    const iv = setInterval(fetchWaStatus, 12000);
    return () => clearInterval(iv);
  }, []);

  const activeModules = tenant?.modules ?? [];
  const navItems = ALL_NAV_ITEMS.filter(
    (item) => item.module === null || activeModules.includes(item.module)
  );

  return (
    <aside className="w-60 flex flex-col h-screen sticky top-0 shrink-0 glass-sidebar">

      {/* Logo / negocio */}
      <div className="p-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <MessageCircle className="h-4 w-4" style={{ color: "var(--primary-foreground)" }} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none" style={{ color: "var(--sidebar-foreground)" }}>
              FlashBot
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--sidebar-accent-foreground)" }}>
              {tenant?.name ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 py-2"
          style={{ color: "var(--sidebar-accent-foreground)" }}>
          Menú
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive ? "rounded-full" : "rounded-xl"
              )}
              style={
                isActive
                  ? {
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid color-mix(in oklch, var(--sidebar-primary) 45%, transparent)",
                      color: "var(--sidebar-primary)",
                      backdropFilter: "blur(8px)",
                    }
                  : { color: "var(--sidebar-foreground)" }
              }
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              {item.href === "/dashboard/whatsapp" && (
                <span
                  className={cn(
                    "ml-auto w-2 h-2 rounded-full animate-pulse",
                    waConnected === true  ? "bg-emerald-400" :
                    waConnected === false ? "bg-red-500" :
                    "bg-muted-foreground opacity-40"
                  )}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer usuario */}
      <div className="p-2 border-t space-y-0.5" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="px-3 py-2 rounded-xl" style={{ background: "var(--sidebar-accent)" }}>
          <p className="text-xs font-semibold truncate" style={{ color: "var(--sidebar-foreground)" }}>
            {user?.name ?? "Usuario"}
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--sidebar-accent-foreground)" }}>
            {user?.email}
          </p>
        </div>

        <button
          onClick={() => setShowModules(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium w-full transition-all"
          style={{ color: "var(--sidebar-accent-foreground)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)";
            (e.currentTarget as HTMLElement).style.color = "var(--sidebar-foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--sidebar-accent-foreground)";
          }}
        >
          <LayoutGrid className="h-4 w-4" />
          Gestionar módulos
        </button>

        {showModules && <ModulesModal onClose={() => setShowModules(false)} />}

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium w-full transition-all"
          style={{ color: "var(--sidebar-foreground)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)";
            (e.currentTarget as HTMLElement).style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--sidebar-foreground)";
          }}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
