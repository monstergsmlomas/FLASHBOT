"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getStoredUser, getStoredTenant } from "@/lib/auth";
import Link from "next/link";
import { CalendarDays, Users, CheckCircle2, Clock, ArrowRight, Zap } from "lucide-react";

interface DashboardData {
  today: { total: number; confirmed: number; pending: number };
  totalCustomers: number;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmado", CANCELLED: "Cancelado", COMPLETED: "Completado",
};

export default function DashboardPage() {
  const user = getStoredUser();
  const tenant = getStoredTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [todayAppts, setTodayAppts] = useState<any[]>([]);

  useEffect(() => {
    api.get("/settings/dashboard").then((r) => setData(r.data));
    api.get("/appointments/today").then((r) => setTodayAppts(r.data));
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const stats = [
    { label: "Turnos hoy",    value: data?.today.total,     icon: CalendarDays,  grad: "card-stat-blue",   iconBox: "icon-box-blue" },
    { label: "Confirmados",   value: data?.today.confirmed, icon: CheckCircle2,  grad: "card-stat-green",  iconBox: "icon-box-green" },
    { label: "Pendientes",    value: data?.today.pending,   icon: Clock,         grad: "card-stat-yellow", iconBox: "icon-box-yellow" },
    { label: "Pacientes",     value: data?.totalCustomers,  icon: Users,         grad: "card-stat-purple", iconBox: "icon-box-purple" },
  ];

  return (
    <div className="h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            {tenant && ` · ${tenant.name}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-full shrink-0">
          <Zap className="h-3 w-3" />
          {tenant?.businessType ?? "negocio"}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.grad} rounded-2xl p-4 md:p-5 hover:scale-[1.02] transition-all duration-200`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center ${s.iconBox}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs md:text-sm font-medium text-foreground/60 text-right">{s.label}</p>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-foreground">
                {s.value ?? <span className="text-2xl text-muted-foreground">—</span>}
              </p>
            </div>
          );
        })}
      </div>

      {/* Turnos de hoy - ocupa el espacio restante */}
      <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">Turnos de hoy</h2>
          <Link href="/dashboard/appointments" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex-1 overflow-auto">
          {todayAppts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <CalendarDays className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-medium text-muted-foreground">Sin turnos para hoy</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Los pacientes reservan por WhatsApp automáticamente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayAppts.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                      {(appt.customer?.name ?? appt.customer?.phone ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground leading-tight">
                        {appt.customer?.name || appt.customer?.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appt.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs · {appt.durationMin} min
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[appt.status] ?? STATUS_STYLE.PENDING}`}>
                    {STATUS_LABEL[appt.status] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
