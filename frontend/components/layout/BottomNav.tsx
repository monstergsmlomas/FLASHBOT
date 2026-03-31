"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredTenant, type Tenant } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, CalendarDays, Users,
  ShoppingCart, Smartphone, Settings, Package, Wrench, UserCog,
  Truck, UtensilsCrossed,
} from "lucide-react";

const ALL_NAV = [
  { href: "/dashboard",              label: "Inicio",      icon: LayoutDashboard, module: null,           exact: true },
  { href: "/dashboard/appointments", label: "Turnos",      icon: CalendarDays,    module: "appointments", exact: false },
  { href: "/dashboard/customers",    label: "Clientes",    icon: Users,           module: "customers",    exact: false },
  { href: "/dashboard/employees",    label: "Empleados",   icon: UserCog,         module: "employees",    exact: false },
  { href: "/dashboard/sales",        label: "Ventas",      icon: ShoppingCart,    module: "sales",        exact: false },
  { href: "/dashboard/inventory",    label: "Stock",       icon: Package,         module: "sales",        exact: false },
  { href: "/dashboard/orders",       label: "Pedidos",     icon: Truck,           module: "delivery",     exact: false },
  { href: "/dashboard/menu",         label: "Menú",        icon: UtensilsCrossed, module: "delivery",     exact: false },
  { href: "/dashboard/repairs",      label: "Reparac.",    icon: Wrench,          module: "repairs",      exact: false },
  { href: "/dashboard/whatsapp",     label: "WhatsApp",    icon: Smartphone,      module: null,           exact: false },
  { href: "/dashboard/settings",     label: "Config.",     icon: Settings,        module: null,           exact: false },
];

export function BottomNav() {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    setTenant(getStoredTenant());
    const refresh = () => setTenant(getStoredTenant());
    window.addEventListener("auth-updated", refresh);
    return () => window.removeEventListener("auth-updated", refresh);
  }, []);

  const activeModules = tenant?.modules ?? [];
  const allItems = ALL_NAV.filter(
    (item) => item.module === null || activeModules.includes(item.module)
  );

  // Mostrar máximo 5 items en el bottom nav
  const items = allItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden border-t"
      style={{
        background: "rgba(10, 10, 18, 0.75)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderColor: "rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -1px 0 rgba(255,255,255,0.05), 0 -8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.8px]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
