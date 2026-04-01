"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Wrench,
  Search,
  Check,
  X,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Activity,
  ArrowRight,
  FileText,
  User,
  Smartphone,
  Box,
  Plus,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type RepairStatus = "PENDING" | "DIAGNOSED" | "IN_PROGRESS" | "READY" | "DELIVERED";

type SparePartInfo = {
  id: string;
  brand: string;
  model: string;
  name: string;
  costPrice: number;
  sellPrice: number | null;
};

type Repair = {
  id: string;
  number: number;
  deviceBrand: string;
  deviceModel: string;
  problem: string;
  diagnosis: string | null;
  customerName: string;
  customerPhone: string;
  laborCost: number;
  sparePartCost: number;
  total: number;
  notes: string | null;
  status: RepairStatus;
  sparePartId: string | null;
  sparePart?: SparePartInfo | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
};

type RepairStats = {
  enteredToday: number;
  ready: number;
  projectedIncome: number;
};

// ── Configuración Visual Kanban ──────────────────────────────────────────────

const STATUS_CONFIG: Record<RepairStatus, { label: string; color: string; rgb: string; nextStatus?: RepairStatus }> = {
  PENDING:     { label: "Pendiente",     color: "#facc15", rgb: "250,204,21", nextStatus: "DIAGNOSED" },
  DIAGNOSED:   { label: "Diagnosticado", color: "#60a5fa", rgb: "96,165,250", nextStatus: "IN_PROGRESS" },
  IN_PROGRESS: { label: "En Progreso",   color: "#c084fc", rgb: "192,132,252", nextStatus: "READY" },
  READY:       { label: "Listo",         color: "#4ade80", rgb: "74,222,128", nextStatus: "DELIVERED" },
  DELIVERED:   { label: "Entregado",     color: "#94a3b8", rgb: "148,163,184" },
};

const KANBAN_ORDER: RepairStatus[] = ["PENDING", "DIAGNOSED", "IN_PROGRESS", "READY", "DELIVERED"];

// ── Estilos compartidos ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "42px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "0 14px",
  color: "white",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const onInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = "rgba(124,58,237,0.5)";
  e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
};
const onInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = "rgba(255,255,255,0.08)";
  e.target.style.boxShadow = "none";
};

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

// ── Componente principal ───────────────────────────────────────────────────────

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [stats, setStats] = useState<RepairStats>({ enteredToday: 0, ready: 0, projectedIncome: 0 });
  const [search, setSearch] = useState("");

  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // Modal nueva reparación
  const [showNewRepair, setShowNewRepair] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [problem, setProblem] = useState("");
  const [laborCost, setLaborCost] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Cargar datos ─────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      const [repairsRes, statsRes] = await Promise.all([
        api.get("/repairs"),
        api.get("/repairs/stats"),
      ]);
      setRepairs(repairsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Error al cargar datos de reparaciones", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAdvanceStatus = async (id: string, currentStatus: RepairStatus) => {
    const nextStatus = STATUS_CONFIG[currentStatus].nextStatus;
    if (!nextStatus) return;

    setAdvancingId(id);
    try {
      await api.patch(`/repairs/${id}/status`, { status: nextStatus });
      await loadData();
      if (selectedRepair?.id === id) {
        setSelectedRepair(prev => prev ? { ...prev, status: nextStatus } : null);
      }
    } catch (err) {
      console.error("Error avanzando estado", err);
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCreateRepair = async () => {
    setSaveError("");
    if (!custName.trim()) { setSaveError("El nombre del cliente es obligatorio"); return; }
    if (!deviceBrand.trim() || !deviceModel.trim()) { setSaveError("Marca y modelo del equipo son obligatorios"); return; }
    if (!problem.trim()) { setSaveError("Descripción del problema es obligatoria"); return; }

    setSaving(true);
    try {
      await api.post("/repairs", {
        customerName: custName.trim(),
        customerPhone: custPhone.trim() || undefined,
        deviceBrand: deviceBrand.trim(),
        deviceModel: deviceModel.trim(),
        problem: problem.trim(),
        laborCost: laborCost === "" ? 0 : Number(laborCost),
        notes: notes.trim() || undefined,
      });
      setCustName(""); setCustPhone(""); setDeviceBrand(""); setDeviceModel(""); setProblem(""); setLaborCost(""); setNotes("");
      setShowNewRepair(false);
      await loadData();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Error al crear la reparación");
    } finally {
      setSaving(false);
    }
  };

  // ── Filtrado y agrupación ────────────────────────────────────────────────────

  const filtered = repairs.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerPhone.includes(search) ||
      r.deviceBrand.toLowerCase().includes(search.toLowerCase()) ||
      r.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
      r.problem.toLowerCase().includes(search.toLowerCase()) ||
      r.number.toString().includes(search)
  );

  const grouped = KANBAN_ORDER.reduce((acc, status) => {
    acc[status] = filtered.filter(r => r.status === status);
    return acc;
  }, {} as Record<RepairStatus, Repair[]>);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "inherit" }}
      className="px-4 md:px-7 py-8 pb-24"
    >
      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "-10%", left: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-5%", right: "0", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1600px", margin: "0 auto" }}>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.1))", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.2)" }}>
              <Wrench size={20} color="#a855f7" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                Servicio Técnico
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#475569" }}>
                Gestión de reparaciones, ingresos y estados.
              </p>
            </div>
          </div>
          <button onClick={() => setShowNewRepair(true)} style={{ height: "38px", padding: "0 16px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
            onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}>
            <Plus size={15} /> Nueva Orden
          </button>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(59,130,246,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(59,130,246,0.8), transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Entradas Hoy</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Activity size={13} color="#3b82f6" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl" style={{ fontWeight: 800, color: "#3b82f6", lineHeight: 1, textShadow: "0 0 20px rgba(59,130,246,0.4)" }}>{stats.enteredToday}</div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>nuevos equipos recibidos</p>
          </div>

          <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(168,85,247,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(168,85,247,0.8), transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ingresos Proyectados</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(168,85,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DollarSign size={13} color="#a855f7" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl" style={{ fontWeight: 800, color: "#a855f7", lineHeight: 1, textShadow: "0 0 20px rgba(168,85,247,0.4)" }}>{fmt(stats.projectedIncome)}</div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>en equipos no entregados</p>
          </div>

          <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(74,222,128,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(74,222,128,0.8), transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Equipos Listos</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={13} color="#4ade80" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl" style={{ fontWeight: 800, color: "#4ade80", lineHeight: 1, textShadow: "0 0 20px rgba(74,222,128,0.4)" }}>
              {stats.ready}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>
              esperando recolección
            </p>
          </div>
        </div>

        {/* ── Búsqueda ──────────────────────────────────────────────────────── */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search size={15} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por equipo, cliente, teléfono, número de orden o problema..."
            style={{ ...inputStyle, paddingLeft: "40px", height: "44px", fontSize: "14px" }}
            onFocus={onInputFocus as any}
            onBlur={onInputBlur as any}
          />
        </div>

        {/* ── Kanban Board ──────────────────────────────────────────────────── */}
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          {KANBAN_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const columnRepairs = grouped[status];
            
            return (
              <div key={status} className="flex-none w-[320px] snap-center flex flex-col" style={{ minHeight: "500px" }}>
                {/* Cabecera Columna */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: config.color, boxShadow: `0 0 10px ${config.color}` }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>{config.label}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "10px" }}>
                    {columnRepairs.length}
                  </span>
                </div>

                {/* Lista de Cards */}
                <div className="flex flex-col gap-3 flex-1" style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "16px", padding: "12px" }}>
                  {columnRepairs.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#475569", fontSize: "12px", marginTop: "30px" }}>
                      Vacío
                    </div>
                  ) : (
                    columnRepairs.map((r) => (
                      <div key={r.id} style={{
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid rgba(255,255,255,0.08)`,
                        borderRadius: "14px",
                        padding: "16px",
                        position: "relative",
                        transition: "all 0.2s",
                        borderTop: `3px solid rgba(${config.rgb}, 0.5)`
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 800, color: config.color, letterSpacing: "0.05em" }}>
                            # {r.number.toString().padStart(5, '0')}
                          </span>
                          <span style={{ fontSize: "10px", color: "#64748b" }}>
                            {new Date(r.createdAt).toLocaleDateString("es-AR")}
                          </span>
                        </div>
                        
                        <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "white" }}>
                          {r.deviceBrand} {r.deviceModel}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                          <User size={12} color="#94a3b8" />
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{r.customerName}</span>
                        </div>
                        
                        <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "8px", fontSize: "11px", color: "#cbd5e1", marginBottom: "14px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {r.problem}
                        </div>

                        {(r.total > 0 || r.sparePartId) && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>Total Ref:</span>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#4ade80" }}>{fmt(r.total)}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => setSelectedRepair(r)}
                            style={{ flex: 1, height: "32px", fontSize: "11px", fontWeight: 600, color: "white", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                          >
                            Detalle
                          </button>
                          {config.nextStatus && (
                            <button
                              disabled={advancingId === r.id}
                              onClick={() => handleAdvanceStatus(r.id, r.status)}
                              style={{ height: "32px", padding: "0 12px", fontSize: "11px", fontWeight: 600, color: "white", background: `rgba(${STATUS_CONFIG[config.nextStatus].rgb},0.15)`, border: `1px solid rgba(${STATUS_CONFIG[config.nextStatus].rgb},0.3)`, borderRadius: "8px", cursor: advancingId === r.id ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s" }}
                              onMouseEnter={e => { if (advancingId !== r.id) e.currentTarget.style.background = `rgba(${STATUS_CONFIG[config.nextStatus!].rgb},0.25)`; }}
                              onMouseLeave={e => { if (advancingId !== r.id) e.currentTarget.style.background = `rgba(${STATUS_CONFIG[config.nextStatus!].rgb},0.15)`; }}
                              title={`Avanzar a ${STATUS_CONFIG[config.nextStatus].label}`}
                            >
                              {advancingId === r.id ? "..." : <><ArrowRight size={12} /> Adelante</>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal Nueva Reparación ───────────────────────────────────────── */}
      {showNewRepair && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
             onClick={e => { if (e.target === e.currentTarget) setShowNewRepair(false); }}>
          <div style={{ width: "100%", maxWidth: "520px", background: "#0f0f1a", borderRadius: "20px 20px 0 0", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Nueva Orden de Reparación</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>Registrá un nuevo equipo</p>
              </div>
              <button onClick={() => setShowNewRepair(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Cliente */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Nombre Cliente *</label>
                  <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Juan García" style={{ ...inputStyle, height: "42px" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Teléfono</label>
                  <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="11 1234-5678" style={{ ...inputStyle, height: "42px" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
                </div>
              </div>

              {/* Equipo */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Marca *</label>
                  <input value={deviceBrand} onChange={e => setDeviceBrand(e.target.value)} placeholder="Samsung" style={{ ...inputStyle, height: "42px" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Modelo *</label>
                  <input value={deviceModel} onChange={e => setDeviceModel(e.target.value)} placeholder="A54" style={{ ...inputStyle, height: "42px" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
                </div>
              </div>

              {/* Problema */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Problema *</label>
                <input value={problem} onChange={e => setProblem(e.target.value)} placeholder="Pantalla rota, batería muerta, etc." style={{ ...inputStyle, height: "42px" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
              </div>

              {/* Mano de obra */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Mano de Obra ($)</label>
                <input type="number" value={laborCost} onChange={e => setLaborCost(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" min="0" style={{ ...inputStyle, height: "42px" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
              </div>

              {/* Notas */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Notas Internas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones del técnico..." rows={3} style={{ ...inputStyle, padding: "10px 14px", resize: "none", height: "auto" }} onFocus={onInputFocus as any} onBlur={onInputBlur as any} />
              </div>
            </div>

            {/* Footer */}
            <div className="pb-[88px] md:pb-5" style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {saveError && (
                <div style={{ marginBottom: "10px", padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "12px" }}>
                  {saveError}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setShowNewRepair(false); setSaveError(""); }} style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleCreateRepair} disabled={saving} style={{ flex: 2, height: "42px", borderRadius: "10px", background: saving ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Guardando..." : "Crear Orden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer Detalle Reparación ─────────────────────────────────────── */}
      {selectedRepair && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedRepair(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 40 }}
          />

          {/* Drawer */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "460px", maxWidth: "100vw", background: "#0d0d14", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

            {/* Header */}
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: `rgba(${STATUS_CONFIG[selectedRepair.status].rgb},0.15)`, border: `1px solid rgba(${STATUS_CONFIG[selectedRepair.status].rgb},0.25)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wrench size={16} color={STATUS_CONFIG[selectedRepair.status].color} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>
                    Orden #{selectedRepair.number.toString().padStart(5, '0')}
                  </h2>
                  <p style={{ margin: 0, fontSize: "12px", color: STATUS_CONFIG[selectedRepair.status].color, fontWeight: 600 }}>
                    {STATUS_CONFIG[selectedRepair.status].label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRepair(null)}
                style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Info Cliente */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "16px" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}><User size={12} /> Cliente</h4>
                  <p style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: "white" }}>{selectedRepair.customerName}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}><Phone size={11} /> {selectedRepair.customerPhone}</p>
                </div>

                {/* Info Equipo & Falla */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "16px" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}><Smartphone size={12} /> Equipo</h4>
                  <p style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 600, color: "white" }}>{selectedRepair.deviceBrand} {selectedRepair.deviceModel}</p>
                  
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Falla reportada:</span>
                    <p style={{ margin: 0, fontSize: "13px", color: "#f1f5f9" }}>{selectedRepair.problem}</p>
                  </div>

                  {selectedRepair.diagnosis && (
                    <div style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "10px", padding: "12px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Diagnóstico Técnico:</span>
                      <p style={{ margin: 0, fontSize: "13px", color: "#e2e8f0" }}>{selectedRepair.diagnosis}</p>
                    </div>
                  )}
                </div>

                {/* Desglose de Costos */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "14px", padding: "16px" }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}><DollarSign size={12} /> Presupuesto</h4>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "#94a3b8" }}>Mano de Obra</span>
                      <span style={{ color: "white", fontWeight: 500 }}>{fmt(selectedRepair.laborCost)}</span>
                    </div>
                    
                    {selectedRepair.sparePart && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}> <Box size={11} /> Repuesto ({selectedRepair.sparePart.name})</span>
                        <span style={{ color: "white", fontWeight: 500 }}>{fmt(selectedRepair.sparePartCost)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Aproximado</span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "#4ade80" }}>{fmt(selectedRepair.total)}</span>
                  </div>
                </div>

                {/* Notas Internas */}
                {selectedRepair.notes && (
                  <div style={{ background: "rgba(24acc15,0.05)", border: "1px dashed rgba(250,204,21,0.2)", borderRadius: "10px", padding: "14px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#facc15", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>Notas Internas (No visibles para el cliente)</span>
                    <p style={{ margin: 0, fontSize: "12px", color: "#fef08a", whiteSpace: "pre-wrap" }}>{selectedRepair.notes}</p>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="pb-[88px] md:pb-5" style={{ paddingTop: "20px", paddingLeft: "24px", paddingRight: "24px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setSelectedRepair(null)}
                  style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  Cerrar panel
                </button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
