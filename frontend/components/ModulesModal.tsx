"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getStoredTenant } from "@/lib/auth";

const MODULOS = [
  { id: "appointments", icon: "📅", label: "Turnos",           desc: "Agenda y reservas automáticas" },
  { id: "sales",        icon: "💰", label: "Ventas y Stock",   desc: "Catálogo, inventario y caja" },
  { id: "delivery",     icon: "🛵", label: "Delivery",         desc: "Pedidos con envío y seguimiento" },
  { id: "repairs",      icon: "🔧", label: "Reparaciones",     desc: "Ingreso de equipos y presupuestos" },
  { id: "customers",    icon: "👥", label: "Clientes",         desc: "Base de datos de clientes" },
  { id: "employees",    icon: "👤", label: "Empleados",        desc: "Gestión de tu equipo" },
  { id: "cobros",       icon: "💳", label: "Cobros y Cuotas",  desc: "Recordatorios de pago automáticos" },
  { id: "fidelizacion", icon: "⭐", label: "Fidelización",     desc: "Puntos y promociones automáticas" },
  { id: "marketing",    icon: "📢", label: "Marketing",        desc: "Campañas y difusión por WhatsApp" },
  { id: "eventos",      icon: "🎟️", label: "Eventos",          desc: "Venta de tickets con QR" },
];

interface Props {
  onClose: () => void;
}

export function ModulesModal({ onClose }: Props) {
  const tenant = getStoredTenant();
  const [active, setActive] = useState<Record<string, boolean>>(() => {
    const current = tenant?.modules ?? [];
    return Object.fromEntries(MODULOS.map(m => [m.id, current.includes(m.id)]));
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const toggle = (id: string) => setActive(prev => ({ ...prev, [id]: !prev[id] }));

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const modules = MODULOS.filter(m => active[m.id]).map(m => m.id);
      await api.patch("/settings/modules", { modules });

      // Actualizar tenant en localStorage
      if (tenant) {
        const updated = { ...tenant, modules };
        localStorage.setItem("tenant", JSON.stringify(updated));
        window.dispatchEvent(new Event("auth-updated"));
      }

      onClose();
    } catch (err: any) {
      setError("Error al guardar los módulos. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: "520px", background: "#0f0f1a", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Módulos activos</p>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>Activá o desactivá las funciones de tu negocio</p>
          </div>
          <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>

        {/* Lista de módulos */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {MODULOS.map(mod => {
            const isOn = active[mod.id];
            return (
              <div
                key={mod.id}
                onClick={() => toggle(mod.id)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                  background: isOn ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
                  borderColor: isOn ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontSize: "22px", lineHeight: 1 }}>{mod.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: isOn ? "white" : "#94a3b8" }}>{mod.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569" }}>{mod.desc}</p>
                </div>
                {/* Toggle */}
                <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: isOn ? "#7c3aed" : "rgba(255,255,255,0.1)", position: "relative", flexShrink: 0, transition: "background 0.2s", boxShadow: isOn ? "0 0 10px rgba(124,58,237,0.4)" : "none" }}>
                  <div style={{ position: "absolute", top: "3px", left: isOn ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {error && (
            <div style={{ marginBottom: "10px", padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "12px" }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving} style={{ flex: 2, height: "42px", borderRadius: "10px", background: saving ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
