"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  Zap, 
  ArrowUpRight,
  CheckCircle2,
  Clock
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

const STATS = [
  { label: "Ingresos (Hoy)", value: "$450.000", change: "+12.5%", icon: DollarSign, color: "#00f5a0" },
  { label: "Ventas Cerradas", value: "34", change: "+8.2%", icon: TrendingUp, color: "#00d4ff" },
  { label: "Chats Activos", value: "12", change: "En vivo", icon: MessageSquare, color: "#a78bfa" },
  { label: "Tasa de Conversión", value: "68%", change: "+4.1%", icon: Zap, color: "#f59e0b" },
];

const RECENT_ACTIVITY = [
  { id: 1, customer: "Marcos V.", action: "Venta Cerrada", amount: "$45.000", time: "Hace 2 min", status: "success" },
  { id: 2, customer: "Luciana G.", action: "Presupuesto Enviado", amount: "$12.500", time: "Hace 5 min", status: "pending" },
  { id: 3, customer: "Agencia XYZ", action: "Venta Cerrada", amount: "$150.000", time: "Hace 14 min", status: "success" },
  { id: 4, customer: "Tomás R.", action: "Lead Calificado", amount: "-", time: "Hace 22 min", status: "info" },
  { id: 5, customer: "Sofía M.", action: "Venta Cerrada", amount: "$28.000", time: "Hace 1 hora", status: "success" },
];

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Animación de entrada de las tarjetas de métricas
    tl.fromTo(
      ".stat-card",
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }
    );

    // Animación de la tabla de actividad
    tl.fromTo(
      ".activity-section",
      { autoAlpha: 0, y: 40 },
      { autoAlpha: 1, y: 0, duration: 0.8 },
      "-=0.4"
    );

    // Pequeño pulso en las filas de la tabla
    gsap.fromTo(
      ".activity-row",
      { autoAlpha: 0, x: -20 },
      { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.08, delay: 0.5, ease: "power2.out" }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="flex flex-col gap-8 max-w-7xl mx-auto">
      
      {/* Header del Dashboard */}
      <div>
        <h1 className="text-3xl font-bold text-[#f1f5f9] mb-2" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          Resumen General
        </h1>
        <p className="text-[#64748b] text-sm">
          Monitoreá el rendimiento de tu IA y las ventas en tiempo real.
        </p>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className="stat-card invisible bg-[#0d1b2a]/50 backdrop-blur-md border border-[#ffffff0a] p-6 rounded-2xl relative overflow-hidden group hover:border-[#ffffff22] transition-colors"
            >
              {/* Resplandor de fondo según el color */}
              <div 
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
                style={{ backgroundColor: stat.color }}
              />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#ffffff11] bg-[#020412]/50"
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-[#ffffff05] text-[#94a3b8]">
                  {stat.change} <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="text-[#64748b] text-sm font-medium mb-1 uppercase tracking-wider text-[10px]">
                  {stat.label}
                </div>
                <div className="text-3xl font-bold text-[#f1f5f9]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  {stat.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección de Actividad Reciente */}
      <div className="activity-section invisible bg-[#0d1b2a]/50 backdrop-blur-md border border-[#ffffff0a] rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#ffffff0a] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#f1f5f9]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Actividad en Vivo
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium text-[#00f5a0]">
            <span className="w-2 h-2 rounded-full bg-[#00f5a0] animate-pulse" />
            Sincronizado
          </div>
        </div>
        
        <div className="p-0">
          {RECENT_ACTIVITY.map((activity, i) => (
            <div 
              key={activity.id} 
              className="activity-row invisible flex items-center justify-between px-6 py-4 border-b border-[#ffffff05] hover:bg-[#ffffff03] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  activity.status === 'success' ? 'bg-[#00f5a011] border-[#00f5a033] text-[#00f5a0]' :
                  activity.status === 'pending' ? 'bg-[#f59e0b11] border-[#f59e0b33] text-[#f59e0b]' :
                  'bg-[#00d4ff11] border-[#00d4ff33] text-[#00d4ff]'
                }`}>
                  {activity.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : 
                   activity.status === 'pending' ? <Clock className="w-4 h-4" /> : 
                   <Zap className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#f1f5f9]">{activity.customer}</div>
                  <div className="text-xs text-[#64748b]">{activity.action}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-bold text-[#f1f5f9]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  {activity.amount}
                </div>
                <div className="text-xs text-[#64748b]">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}