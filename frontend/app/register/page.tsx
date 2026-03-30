"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";
import { api } from "@/lib/api";
import { ArrowLeft, ArrowRight, Zap, Check, Loader2, Wifi, CheckCircle2 } from "lucide-react";

// ─── Rubros ──────────────────────────────────────────────────────────────────
const RUBROS = [
  { id: "consultorio", icon: "🩺", label: "Salud / Consultorio",      desc: "Médicos, psicólogos, odontólogos",   color: "59,130,246",  mods: ["turnos","atencion"] },
  { id: "peluqueria",  icon: "✂️", label: "Peluquería / Salón",        desc: "Cortes, tintes, estética",           color: "139,92,246",  mods: ["turnos","fidelizacion","resenas"] },
  { id: "salon",       icon: "💅", label: "Salón de belleza",          desc: "Manicura, spa, tratamientos",        color: "236,72,153",  mods: ["turnos","ventas","fidelizacion"] },
  { id: "tecnico",     icon: "🛠️", label: "Servicio Técnico",          desc: "Reparaciones y presupuestos",        color: "20,184,166",  mods: ["reparaciones","atencion","resenas"] },
  { id: "gastronomia", icon: "🍔", label: "Gastronomía",               desc: "Restaurantes, pizzerías, cafés",     color: "249,115,22",  mods: ["delivery","ventas","marketing"] },
  { id: "cancha",      icon: "⚽", label: "Deportes / Canchas",        desc: "Reservas de canchas y kiosco",       color: "34,197,94",   mods: ["turnos","ventas","cobros","eventos"] },
  { id: "kiosco",      icon: "🛒", label: "Comercio / Kiosco",         desc: "Ventas, stock y delivery",           color: "234,179,8",   mods: ["ventas","delivery","marketing","fidelizacion"] },
  { id: "gimnasio",    icon: "🏋️", label: "Gimnasio / Fitness",        desc: "Membresías, clases y reservas",      color: "239,68,68",   mods: ["turnos","cobros","marketing"] },
  { id: "otro",        icon: "📋", label: "Otro rubro",                desc: "Configuración personalizada",        color: "100,116,139", mods: ["atencion"] },
];

// ─── Módulos ──────────────────────────────────────────────────────────────────
const MODULOS = [
  { id: "turnos",       icon: "📅", label: "Gestión de Turnos",   desc: "Calendario y reservas automáticas." },
  { id: "ventas",       icon: "🛒", label: "Ventas y Stock",       desc: "Catálogo, inventario y pedidos." },
  { id: "reparaciones", icon: "🛠️", label: "Reparaciones",         desc: "Ingreso de equipos y presupuestos." },
  { id: "delivery",     icon: "🛵", label: "Delivery",             desc: "Pedidos con envío y seguimiento." },
  { id: "cobros",       icon: "💳", label: "Cobros y Cuotas",      desc: "Recordatorios de pago automáticos." },
  { id: "atencion",     icon: "🎧", label: "Atención al cliente",  desc: "Preguntas frecuentes y soporte." },
  { id: "fidelizacion", icon: "🎁", label: "Fidelización",         desc: "Puntos y promociones automáticas." },
  { id: "marketing",    icon: "📢", label: "Marketing Masivo",     desc: "Campañas y difusión por WhatsApp." },
  { id: "resenas",      icon: "⭐", label: "Reseñas",              desc: "Calificación y feedback post-servicio." },
  { id: "eventos",      icon: "🎟️", label: "Eventos",              desc: "Venta de tickets con QR." },
];

const DAYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"] as const;
const DAY_LABELS: Record<string, string> = { lunes:"Lun", martes:"Mar", miercoles:"Mié", jueves:"Jue", viernes:"Vie", sabado:"Sáb", domingo:"Dom" };

const DEFAULT_HOURS = {
  lunes:     { activo: true,  apertura: "09:00", cierre: "18:00" },
  martes:    { activo: true,  apertura: "09:00", cierre: "18:00" },
  miercoles: { activo: true,  apertura: "09:00", cierre: "18:00" },
  jueves:    { activo: true,  apertura: "09:00", cierre: "18:00" },
  viernes:   { activo: true,  apertura: "09:00", cierre: "18:00" },
  sabado:    { activo: false, apertura: "10:00", cierre: "14:00" },
  domingo:   { activo: false, apertura: "00:00", cierre: "00:00" },
};

// ─── Helpers de estilo ────────────────────────────────────────────────────────
const input = {
  width: "100%", height: "42px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px", padding: "0 14px",
  color: "white", fontSize: "14px",
  outline: "none", boxSizing: "border-box" as const,
};

export default function RegisterPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(1);

  // Paso 1 – rubro
  const [rubro, setRubro] = useState<typeof RUBROS[0] | null>(null);

  // Paso 2 – módulos
  const [modulos, setModulos] = useState<Record<string, boolean>>({});

  // Paso 3 – datos
  const [businessName, setBusinessName] = useState("");
  const [desc, setDesc]                 = useState("");
  const [name, setName]                 = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [horarios, setHorarios]         = useState<any>({ ...DEFAULT_HOURS });

  // Paso 4 – WhatsApp QR
  const [qrImg, setQrImg]               = useState<string | null>(null);
  const [waStatus, setWaStatus]         = useState<"waiting" | "scanning" | "connected">("waiting");
  const pollRef                         = useRef<any>(null);

  // Global
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // ── Seleccionar rubro → preseleccionar módulos ──────────────────────────────
  const selectRubro = (r: typeof RUBROS[0]) => {
    setRubro(r);
    const mods: Record<string, boolean> = {};
    MODULOS.forEach((m) => { mods[m.id] = r.mods.includes(m.id); });
    setModulos(mods);
    setPaso(2);
  };

  const toggleMod = (id: string) => setModulos((p) => ({ ...p, [id]: !p[id] }));

  const updateHour = (dia: string, campo: string, valor: any) =>
    setHorarios((p: any) => ({ ...p, [dia]: { ...p[dia], [campo]: valor } }));

  // ── Registro + arrancar polling QR ─────────────────────────────────────────
  const handleRegistrar = async (skipWhatsapp = false) => {
    if (!businessName.trim() || !email.trim() || !password.trim()) {
      setError("Completá todos los campos obligatorios"); return;
    }
    setError(""); setLoading(true);
    try {
      // Mapear business type
      const businessType = rubro?.id === "gastronomia" ? "restaurante"
        : rubro?.id === "cancha" ? "cancha"
        : rubro?.id === "salon"  ? "salon"
        : rubro?.id === "kiosco" ? "kiosco"
        : rubro?.id === "gimnasio" ? "gimnasio"
        : rubro?.id ?? "otro";

      await register({ businessName, businessType, name, email, password });

      // Guardar horarios en el backend
      const hoursPayload = DAYS.map((dia) => ({
        dayOfWeek: DAYS.indexOf(dia) === 6 ? 0 : DAYS.indexOf(dia) + 1,
        openTime: horarios[dia].apertura,
        closeTime: horarios[dia].cierre,
        isOpen: horarios[dia].activo,
        slotMin: 30,
      }));
      // domingo = 0, lunes = 1, ...
      const dayMap: Record<string, number> = { lunes:1, martes:2, miercoles:3, jueves:4, viernes:5, sabado:6, domingo:0 };
      const hours = DAYS.map((dia) => ({
        dayOfWeek: dayMap[dia],
        openTime: horarios[dia].apertura,
        closeTime: horarios[dia].cierre,
        isOpen: horarios[dia].activo,
        slotMin: 30,
      }));
      await api.patch("/settings/hours", { hours });

      // Guardar descripción en settings si la pusieron
      if (desc.trim()) {
        await api.patch("/settings", { botConfig: { greeting: desc.trim() } });
      }

      if (skipWhatsapp) {
        router.push("/dashboard");
        return;
      }
      setPaso(4);
      startQrPolling();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  // ── Polling QR y estado WhatsApp ────────────────────────────────────────────
  const startQrPolling = () => {
    // Fetch QR inmediatamente
    fetchQr();
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get("/whatsapp/status");
        if (r.data.connected) {
          clearInterval(pollRef.current);
          setWaStatus("connected");
          setTimeout(() => router.push("/dashboard"), 1800);
        } else {
          fetchQr();
        }
      } catch { /* silenciar */ }
    }, 3000);
  };

  const fetchQr = async () => {
    try {
      const r = await api.get("/whatsapp/qr");
      if (r.data?.qr) { setQrImg(r.data.qr); setWaStatus("waiting"); }
    } catch { /* sin QR todavía */ }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const color = rubro?.color ?? "99,102,241";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a14", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", position: "relative", overflowX: "hidden" }}>

      {/* Grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "-15%", left: "-10%", width: "500px", height: "500px", background: `radial-gradient(circle, rgba(${color},0.1) 0%, transparent 70%)`, pointerEvents: "none", transition: "background 0.6s" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "-5%",  width: "400px", height: "400px", background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)",  pointerEvents: "none" }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", zIndex: 1 }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={16} color="white" />
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>FlashBot</span>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "36px", zIndex: 1 }}>
        {[1,2,3,4].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "14px",
              background: paso >= n ? `rgba(${color},0.8)` : "rgba(255,255,255,0.06)",
              color: paso >= n ? "white" : "#475569",
              boxShadow: paso >= n ? `0 0 12px rgba(${color},0.4)` : "none",
              transition: "all 0.3s",
            }}>{paso > n ? <Check size={16} /> : n}</div>
            {n < 4 && <div style={{ width: "40px", height: "2px", borderRadius: "2px", background: paso > n ? `rgba(${color},0.7)` : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />}
          </div>
        ))}
      </div>

      {/* ════════════════════════════ PASO 1: RUBRO ════════════════════════════ */}
      {paso === 1 && (
        <div style={{ width: "100%", maxWidth: "820px", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h1 style={{ color: "white", fontSize: "26px", fontWeight: 700, margin: 0 }}>¿A qué se dedica tu negocio?</h1>
            <p style={{ color: "#64748b", fontSize: "14px", marginTop: "8px" }}>Preconfiguraremos el sistema automáticamente</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
            {RUBROS.map((r) => (
              <button key={r.id} onClick={() => selectRubro(r)}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px", padding: "20px 16px", textAlign: "left", cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = `rgba(${r.color},0.08)`; el.style.borderColor = `rgba(${r.color},0.4)`; el.style.boxShadow = `0 0 16px rgba(${r.color},0.15)`; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "rgba(255,255,255,0.03)"; el.style.borderColor = "rgba(255,255,255,0.07)"; el.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>{r.icon}</div>
                <p style={{ color: "white", fontWeight: 600, fontSize: "13px", margin: "0 0 4px" }}>{r.label}</p>
                <p style={{ color: "#64748b", fontSize: "11px", margin: 0, lineHeight: 1.4 }}>{r.desc}</p>
              </button>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            <Link href="/login" style={{ color: "#475569", fontSize: "13px", textDecoration: "none" }}>¿Ya tenés cuenta? Entrar →</Link>
          </p>
        </div>
      )}

      {/* ════════════════════════════ PASO 2: MÓDULOS ════════════════════════════ */}
      {paso === 2 && rubro && (
        <div style={{ width: "100%", maxWidth: "640px", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{rubro.icon}</div>
            <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Activá tus herramientas</h1>
            <p style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>Preseleccionamos lo mejor para {rubro.label}. Podés personalizar.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", maxHeight: "55vh", overflowY: "auto", paddingRight: "4px" }}>
            {MODULOS.map((m) => {
              const on = !!modulos[m.id];
              return (
                <div key={m.id} onClick={() => toggleMod(m.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 16px", borderRadius: "14px", cursor: "pointer",
                    border: `1.5px solid ${on ? `rgba(${color},0.4)` : "rgba(255,255,255,0.07)"}`,
                    background: on ? `rgba(${color},0.08)` : "rgba(255,255,255,0.03)",
                    transition: "all 0.2s", gap: "10px",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "22px" }}>{m.icon}</span>
                    <div>
                      <p style={{ color: "white", fontWeight: 600, fontSize: "12px", margin: 0 }}>{m.label}</p>
                      <p style={{ color: "#64748b", fontSize: "10px", margin: "2px 0 0", lineHeight: 1.3 }}>{m.desc}</p>
                    </div>
                  </div>
                  {/* Toggle */}
                  <div style={{ minWidth: "40px", height: "22px", borderRadius: "11px", background: on ? `rgba(${color},0.9)` : "rgba(255,255,255,0.1)", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", top: "3px", left: on ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
            <button onClick={() => setPaso(1)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px" }}>
              <ArrowLeft size={14} /> Volver
            </button>
            <button onClick={() => setPaso(3)}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: `rgba(${color},0.9)`, color: "white", border: "none", borderRadius: "12px", padding: "10px 24px", fontSize: "14px", fontWeight: 600, cursor: "pointer", boxShadow: `0 0 16px rgba(${color},0.3)` }}>
              Siguiente <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════ PASO 3: DATOS ════════════════════════════ */}
      {paso === 3 && rubro && (
        <div style={{ width: "100%", maxWidth: "820px", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: 0 }}>Configurá tu negocio</h1>
            <p style={{ color: "#64748b", fontSize: "13px", marginTop: "6px" }}>Esta info la usará la IA para atender a tus clientes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Columna izquierda: datos */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <h3 style={{ color: "white", fontWeight: 600, fontSize: "13px", margin: 0, paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Datos del negocio</h3>
              {[
                { label: "Nombre comercial *", value: businessName, set: setBusinessName, ph: "Ej: Peluquería El Estilo" },
                { label: "Tu nombre *",         value: name,         set: setName,         ph: "Juan García" },
                { label: "Email *",             value: email,        set: setEmail,         ph: "tu@email.com", type: "email" },
                { label: "Contraseña *",        value: password,     set: setPassword,      ph: "Mínimo 6 caracteres", type: "password" },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "11px", marginBottom: "5px", fontWeight: 500 }}>{f.label}</label>
                  <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.ph} type={(f as any).type ?? "text"} style={input}
                    onFocus={(e) => (e.target.style.borderColor = `rgba(${color},0.6)`)}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "11px", marginBottom: "5px" }}>¿Qué hace tu negocio? <span style={{ color: "#475569" }}>(opcional)</span></label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  placeholder="Ej: Somos una peluquería unisex en el centro, atendemos sin turno previo..."
                  style={{ ...input, height: "auto", padding: "10px 14px", resize: "none" as const }}
                  onFocus={(e) => (e.target.style.borderColor = `rgba(${color},0.6)`)}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              </div>
            </div>

            {/* Columna derecha: horarios */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px" }}>
              <h3 style={{ color: "white", fontWeight: 600, fontSize: "13px", margin: "0 0 14px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>Horarios de atención</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {DAYS.map((dia) => {
                  const h = horarios[dia];
                  return (
                    <div key={dia} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", borderRadius: "10px",
                      background: h.activo ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.01)",
                      border: `1px solid ${h.activo ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)"}`,
                      opacity: h.activo ? 1 : 0.5,
                    }}>
                      {/* Toggle día */}
                      <div onClick={() => updateHour(dia, "activo", !h.activo)}
                        style={{ minWidth: "32px", height: "18px", borderRadius: "9px", background: h.activo ? `rgba(${color},0.8)` : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: "2px", left: h.activo ? "16px" : "2px", width: "14px", height: "14px", borderRadius: "50%", background: "white", transition: "left 0.15s" }} />
                      </div>
                      <span style={{ color: "white", fontWeight: 600, fontSize: "11px", width: "28px", flexShrink: 0 }}>{DAY_LABELS[dia]}</span>
                      {h.activo ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                          <input type="time" value={h.apertura} onChange={(e) => updateHour(dia, "apertura", e.target.value)}
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "7px", padding: "2px 6px", color: "white", fontSize: "11px", flex: 1 }} />
                          <span style={{ color: "#475569", fontSize: "10px" }}>—</span>
                          <input type="time" value={h.cierre} onChange={(e) => updateHour(dia, "cierre", e.target.value)}
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "7px", padding: "2px 6px", color: "white", fontSize: "11px", flex: 1 }} />
                        </div>
                      ) : (
                        <span style={{ color: "#475569", fontSize: "11px", flex: 1 }}>Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: "14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <button onClick={() => setPaso(2)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px" }}>
              <ArrowLeft size={14} /> Volver
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
              <button onClick={() => handleRegistrar()} disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: "8px", background: loading ? "rgba(99,102,241,0.4)" : `rgba(${color},0.9)`, color: "white", border: "none", borderRadius: "12px", padding: "10px 24px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", boxShadow: `0 0 16px rgba(${color},0.3)` }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Creando...</> : <>Conectar WhatsApp <ArrowRight size={15} /></>}
              </button>
              <button onClick={async () => { await handleRegistrar(true); }} disabled={loading}
                style={{ background: "none", border: "none", color: "#475569", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>
                Saltar WhatsApp → ir al panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════ PASO 4: QR WHATSAPP ════════════════════════ */}
      {paso === 4 && (
        <div style={{ width: "100%", maxWidth: "440px", zIndex: 1, textAlign: "center" }}>
          <h1 style={{ color: "white", fontSize: "24px", fontWeight: 700, margin: "0 0 8px" }}>Conectá tu asistente</h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "28px" }}>
            Escaneá el código QR desde WhatsApp en tu celular para activar el bot
          </p>

          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(${color},0.2)`, borderRadius: "20px", padding: "32px", position: "relative", overflow: "hidden" }}>

            {/* Barra superior animada */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "3px",
              background: waStatus === "connected"
                ? "linear-gradient(90deg, #22c55e, #4ade80)"
                : `linear-gradient(90deg, rgba(${color},0.8), rgba(${color},0.3))`,
              animation: waStatus !== "connected" ? "pulse 2s infinite" : "none",
            }} />

            {waStatus === "connected" ? (
              /* Conectado */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", boxShadow: "0 0 30px rgba(34,197,94,0.3)" }}>
                  <CheckCircle2 size={36} color="#22c55e" />
                </div>
                <h3 style={{ color: "white", fontWeight: 700, fontSize: "18px", margin: "0 0 8px" }}>¡Bot conectado!</h3>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Redirigiendo al panel...</p>
              </div>
            ) : qrImg ? (
              /* QR disponible */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ background: "white", padding: "12px", borderRadius: "14px", marginBottom: "16px", boxShadow: "0 0 30px rgba(255,255,255,0.1)" }}>
                  <img src={qrImg} alt="QR WhatsApp" width={200} height={200} style={{ display: "block" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "12px" }}>
                  <Wifi size={13} />
                  Esperando escaneo...
                </div>
              </div>
            ) : (
              /* Cargando QR */
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" }}>
                <Loader2 size={32} color={`rgb(${color})`} className="animate-spin" style={{ marginBottom: "16px" }} />
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Generando código QR...</p>
              </div>
            )}
          </div>

          {waStatus !== "connected" && (
            <div style={{ marginTop: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px 18px", textAlign: "left" }}>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 8px", fontWeight: 600 }}>Cómo conectarse:</p>
              {["Abrí WhatsApp en tu celular", "Tocá los 3 puntos → Dispositivos vinculados", "Tocá 'Vincular dispositivo'", "Escaneá el código QR de arriba"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ color: `rgb(${color})`, fontWeight: 700, fontSize: "11px", minWidth: "14px" }}>{i + 1}.</span>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {waStatus !== "connected" && (
            <button onClick={() => router.push("/dashboard")}
              style={{ marginTop: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#94a3b8", fontSize: "13px", cursor: "pointer", padding: "10px 24px", width: "100%" }}>
              Saltar por ahora → ir al panel
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
