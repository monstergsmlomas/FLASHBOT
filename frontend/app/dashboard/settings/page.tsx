"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getStoredTenant, getStoredUser } from "@/lib/auth";
import { Save, Clock, Bot, X, Plus, Scissors, Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Actualiza tenant y/o user en localStorage y notifica a la sidebar
function syncLocalStorage(tenantName?: string, userName?: string) {
  if (tenantName) {
    const t = getStoredTenant();
    if (t) localStorage.setItem("tenant", JSON.stringify({ ...t, name: tenantName }));
  }
  if (userName) {
    const u = getStoredUser();
    if (u) localStorage.setItem("user", JSON.stringify({ ...u, name: userName }));
  }
  window.dispatchEvent(new Event("auth-updated"));
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Orden visual: Lun→Dom (0=Dom va al final)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const APPOINTMENT_LABELS = [
  { value: "turno",    plural: "turnos",    example: "Médicos, psicólogos" },
  { value: "reserva",  plural: "reservas",  example: "Peluquerías, spa" },
  { value: "cita",     plural: "citas",     example: "Odontólogos" },
  { value: "sesión",   plural: "sesiones",  example: "Psicopedagogos, kine" },
  { value: "análisis", plural: "análisis",  example: "Laboratorios" },
  { value: "consulta", plural: "consultas", example: "Veterinarias" },
];

const inputCls =
  "bg-background border border-border/60 rounded-lg px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";

export default function SettingsPage() {
  const tenant = getStoredTenant();
  const hasEmployeesModule = tenant?.modules?.includes("employees") ?? false;

  // ── Negocio ──────────────────────────────────────────────────────────────
  const [settings, setSettings]           = useState<any>(null);
  const [businessName, setBusinessName]   = useState("");
  const [userName, setUserName]           = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [hours, setHours]                 = useState<any[]>([]);
  const [savedBasic, setSavedBasic]       = useState(false);
  const [savedHours, setSavedHours]       = useState(false);

  // ── Servicios (peluquería, spa, etc.) ────────────────────────────────────
  const [dbServices, setDbServices]       = useState<any[]>([]);
  const [newSvcName, setNewSvcName]       = useState("");
  const [newSvcDuration, setNewSvcDuration] = useState(30);
  const [editingSvc, setEditingSvc]       = useState<string | null>(null);
  const [editSvcName, setEditSvcName]     = useState("");
  const [editSvcDuration, setEditSvcDuration] = useState(30);

  // ── Bot config ────────────────────────────────────────────────────────────
  const [appointmentLabel, setAppointmentLabel]             = useState("turno");
  const [appointmentLabelPlural, setAppointmentLabelPlural] = useState("turnos");
  const [services, setServices]       = useState<string[]>([]);
  const [newService, setNewService]   = useState("");
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword]   = useState("");
  const [savedBot, setSavedBot]       = useState(false);

  useEffect(() => {
    // Cargar nombre del profesional desde localStorage
    const storedUser = getStoredUser();
    if (storedUser?.name) setUserName(storedUser.name);

    api.get("/settings").then((r) => {
      const d = r.data;
      setSettings(d);
      setBusinessName(d.name);
      setWhatsappPhone(d.whatsappPhone || "");
      setHours(d.businessHours || []);
      const cfg = d.botConfig ?? {};
      setAppointmentLabel(cfg.appointmentLabel ?? "turno");
      setAppointmentLabelPlural(cfg.appointmentLabelPlural ?? "turnos");
      setServices(cfg.services ?? []);
      setCustomKeywords(cfg.requestKeywords ?? []);
    });

    api.get("/services").then((r) => setDbServices(r.data)).catch(() => {});

  }, []);

  const loadServices = () => api.get("/services").then((r) => setDbServices(r.data)).catch(() => {});

  const handleAddService = async () => {
    if (!newSvcName.trim()) return;
    await api.post("/services", { name: newSvcName.trim(), durationMin: newSvcDuration });
    setNewSvcName(""); setNewSvcDuration(30);
    loadServices();
  };

  const handleDeleteService = async (id: string) => {
    await api.delete(`/services/${id}`);
    loadServices();
  };

  const handleSaveEditService = async (id: string) => {
    await api.patch(`/services/${id}`, { name: editSvcName.trim(), durationMin: editSvcDuration });
    setEditingSvc(null);
    loadServices();
  };

  const doSave = (set: (v: boolean) => void, fn: () => Promise<any>) => async () => {
    await fn(); set(true); setTimeout(() => set(false), 2000);
  };

  const updateHour = (dayOfWeek: number, field: string, value: any) =>
    setHours((prev) => prev.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));

  function SaveBtn({ saved, onClick, label = "Guardar", disabled = false }: {
    saved: boolean; onClick: () => void; label?: string; disabled?: boolean;
  }) {
    return (
      <button onClick={onClick} disabled={disabled}
        className={`btn-glass ${saved ? "btn-glass-saved" : ""}`}>
        <Save className="h-4 w-4" />
        {saved ? "Guardado ✓" : label}
      </button>
    );
  }

  if (!settings) return <div className="text-muted-foreground py-10 text-center">Cargando...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Configuración</h1>

      {/* ── Fila 1: Datos + Horarios (misma altura) ──────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">

        {/* Datos del negocio */}
        <section className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-border/40 shrink-0">
            <h2 className="font-semibold text-foreground text-sm">Datos del negocio</h2>
          </div>
          <div className="p-5 flex flex-col flex-1 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del negocio</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del profesional</Label>
              <Input value={userName} onChange={(e) => setUserName(e.target.value)} className="h-8 text-sm" placeholder="Dr. García" />
              <p className="text-[11px] text-muted-foreground">Se muestra en el panel lateral</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Número de WhatsApp</Label>
              <Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="5491123456789" className="h-8 text-sm" />
              <p className="text-[11px] text-muted-foreground">Con código de país, sin +</p>
            </div>
            <div className="flex gap-5">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Tipo</p>
                <Badge variant="secondary" className="text-xs">{settings.businessType}</Badge>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Módulos activos</p>
                <div className="flex gap-1 flex-wrap">
                  {settings.modules?.map((m: string) => (
                    <Badge key={m} className="bg-primary/10 text-primary border-primary/20 text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <SaveBtn saved={savedBasic}
              onClick={doSave(setSavedBasic, async () => {
                await api.patch("/settings", { name: businessName, whatsappPhone, userName });
                syncLocalStorage(businessName, userName);
              })}
              label="Guardar datos" />
          </div>
        </section>

        {/* Horarios de atención */}
        <section className="glass rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 shrink-0">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Horarios de atención</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Turno partido = mañana + tarde</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-4 flex flex-col flex-1 gap-1.5">
            <div className="space-y-1.5 flex-1">
              {DAY_ORDER.map(dow => hours.find(h => h.dayOfWeek === dow)).filter(Boolean).map((h) => (
                <div key={h.dayOfWeek}
                  className={`rounded-xl border transition-colors overflow-hidden ${h.isOpen ? "border-border/50 bg-muted/20" : "border-border/20 bg-muted/10 opacity-50"}`}>

                  {/* ── Fila principal (mañana) ── */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    {/* Toggle */}
                    <div onClick={() => updateHour(h.dayOfWeek, "isOpen", !h.isOpen)}
                      className={`relative w-8 h-4 rounded-full cursor-pointer transition-colors shrink-0 ${h.isOpen ? "bg-primary" : "bg-muted-foreground/30"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${h.isOpen ? "translate-x-4" : ""}`} />
                    </div>
                    {/* Día */}
                    <span className="text-xs font-bold text-foreground w-8 shrink-0">{DAY_NAMES[h.dayOfWeek]}</span>

                    {h.isOpen ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        {/* Horario mañana */}
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wide w-10 shrink-0">Mañana</span>
                        <input type="time" value={h.openTime} onChange={(e) => updateHour(h.dayOfWeek, "openTime", e.target.value)} className={`${inputCls} w-[72px]`} />
                        <span className="text-[10px] text-muted-foreground">—</span>
                        <input type="time" value={h.closeTime} onChange={(e) => updateHour(h.dayOfWeek, "closeTime", e.target.value)} className={`${inputCls} w-[72px]`} />
                        {/* Duración + botón tarde al extremo derecho */}
                        <div className="ml-auto flex items-center gap-1.5">
                          <select value={h.slotMin} onChange={(e) => updateHour(h.dayOfWeek, "slotMin", Number(e.target.value))} className={inputCls}>
                            {[15,20,30,45,60,90].map((m) => <option key={m} value={m}>{m}min</option>)}
                          </select>
                          <button
                            onClick={() => { updateHour(h.dayOfWeek, "openTime2", h.openTime2 ? null : "16:00"); updateHour(h.dayOfWeek, "closeTime2", h.openTime2 ? null : "20:00"); }}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${h.openTime2 ? "border-primary/50 text-primary bg-primary/10" : "border-border/40 text-muted-foreground hover:border-border"}`}>
                            {h.openTime2 ? "− tarde" : "+ tarde"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Cerrado</span>
                    )}
                  </div>

                  {/* ── Sub-fila tarde (solo si está activo) ── */}
                  {h.isOpen && h.openTime2 && (
                    <div className="flex items-center gap-2 px-3 pb-2 border-t border-border/20 pt-1.5 bg-muted/10">
                      {/* Espacio del toggle + día para alinear */}
                      <div className="w-8 shrink-0" />
                      <div className="w-8 shrink-0" />
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[9px] text-primary/60 uppercase tracking-wide w-10 shrink-0 font-semibold">Tarde</span>
                        <input type="time" value={h.openTime2} onChange={(e) => updateHour(h.dayOfWeek, "openTime2", e.target.value)} className={`${inputCls} w-[72px] border-primary/20`} />
                        <span className="text-[10px] text-muted-foreground">—</span>
                        <input type="time" value={h.closeTime2 ?? ""} onChange={(e) => updateHour(h.dayOfWeek, "closeTime2", e.target.value)} className={`${inputCls} w-[72px] border-primary/20`} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <SaveBtn saved={savedHours}
              onClick={doSave(setSavedHours, () => api.patch("/settings/hours", { hours }))}
              label="Guardar horarios" />
          </div>
        </section>
      </div>

      {/* ── Fila 2: Servicios del negocio (solo rubros con módulo employees) */}
      {hasEmployeesModule && <section className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground text-sm">Servicios del negocio</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">El bot preguntará qué servicio quiere el cliente antes de mostrar horarios</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Lista de servicios */}
          {dbServices.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay servicios configurados. Si no cargás servicios el bot gestiona turnos genéricos.</p>
          ) : (
            <div className="space-y-2">
              {dbServices.map((svc) => (
                <div key={svc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/10">
                  {editingSvc === svc.id ? (
                    <>
                      <input value={editSvcName} onChange={(e) => setEditSvcName(e.target.value)}
                        className="flex-1 h-7 text-xs bg-background border border-border/60 rounded-lg px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                      <select value={editSvcDuration} onChange={(e) => setEditSvcDuration(Number(e.target.value))}
                        className="h-7 text-xs bg-background border border-border/60 rounded-lg px-2 text-foreground focus:outline-none">
                        {[15,20,30,45,60,90,120].map((m) => <option key={m} value={m}>{m} min</option>)}
                      </select>
                      <button onClick={() => handleSaveEditService(svc.id)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditingSvc(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-foreground font-medium">{svc.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{svc.durationMin} min</span>
                      <button onClick={() => { setEditingSvc(svc.id); setEditSvcName(svc.name); setEditSvcDuration(svc.durationMin); }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDeleteService(svc.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar servicio */}
          <div className="flex gap-2 items-center">
            <input value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddService(); }}
              placeholder="Nombre del servicio (ej: Corte, Tinte...)"
              className="flex-1 h-8 text-xs bg-background border border-border/60 rounded-lg px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
            <select value={newSvcDuration} onChange={(e) => setNewSvcDuration(Number(e.target.value))}
              className="h-8 text-xs bg-background border border-border/60 rounded-lg px-2 text-foreground focus:outline-none">
              {[15,20,30,45,60,90,120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
            <button onClick={handleAddService}
              className="h-8 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" /> Agregar
            </button>
          </div>
        </div>
      </section>}

      {/* ── Fila 3: Bot config full ancho ────────────────────────────────── */}
      <section className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40">
          <Bot className="h-4 w-4 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground text-sm">Configuración del Bot</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Vocabulario y comportamiento según tu tipo de negocio</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Col 1: tipo de reserva */}
          <div className="space-y-2">
            <Label className="text-xs">¿Cómo llaman a lo que reservan?</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {APPOINTMENT_LABELS.map((opt) => (
                <button key={opt.value}
                  onClick={() => { setAppointmentLabel(opt.value); setAppointmentLabelPlural(opt.plural); }}
                  className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                    appointmentLabel === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 hover:border-border text-muted-foreground"}`}>
                  <p className="font-semibold capitalize">{opt.value}</p>
                  <p className="text-[10px] opacity-60 mt-0.5 leading-tight">{opt.example}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Col 2: servicios + keywords */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Servicios <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <p className="text-[10px] text-muted-foreground">Si los cargás el bot pregunta para cuál servicio primero.</p>
              <div className="flex gap-2">
                <Input value={newService} onChange={(e) => setNewService(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newService.trim()) { setServices(s => [...s, newService.trim()]); setNewService(""); }}}
                  placeholder="Consulta, Análisis..." className="h-8 text-xs flex-1" />
                <button onClick={() => { if (newService.trim()) { setServices(s => [...s, newService.trim()]); setNewService(""); }}}
                  className="px-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {services.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full text-foreground">
                      {s}
                      <button onClick={() => setServices(p => p.filter((_,j)=>j!==i))}><X className="h-2.5 w-2.5 text-muted-foreground" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Palabras clave extra <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <p className="text-[10px] text-muted-foreground">Por defecto entiende "quiero", "reservar", "sacar", etc.</p>
              <div className="flex gap-2">
                <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newKeyword.trim()) { setCustomKeywords(k => [...k, newKeyword.trim().toLowerCase()]); setNewKeyword(""); }}}
                  placeholder="pedir, me anotas..." className="h-8 text-xs flex-1" />
                <button onClick={() => { if (newKeyword.trim()) { setCustomKeywords(k => [...k, newKeyword.trim().toLowerCase()]); setNewKeyword(""); }}}
                  className="px-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {customKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {customKeywords.map((k, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full font-mono text-foreground">
                      {k}
                      <button onClick={() => setCustomKeywords(p => p.filter((_,j)=>j!==i))}><X className="h-2.5 w-2.5 text-muted-foreground" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 3: preview + guardar */}
          <div className="flex flex-col gap-3">
            <Label className="text-xs">Preview del bot</Label>
            <div className="bg-[#0d1117] rounded-xl p-4 space-y-2 border border-white/5 flex-1">
              {[
                { msg: "¡Hola! ¿En qué te puedo ayudar? 👋", out: false },
                { msg: `¿Para qué día querés el *${appointmentLabel}*? 📅`, out: true },
                { msg: "El martes", out: false },
                { msg: `¡*${appointmentLabel.charAt(0).toUpperCase()+appointmentLabel.slice(1)}* reservado! 👋`, out: true },
              ].map((m, i) => (
                <div key={i} className={`flex ${m.out ? "justify-end" : "justify-start"}`}>
                  <div className={`text-white text-[10px] px-3 py-1.5 rounded-2xl max-w-[90%] ${m.out ? "bg-[#005c4b] rounded-br-sm" : "bg-[#202c33] rounded-bl-sm"}`}>{m.msg}</div>
                </div>
              ))}
            </div>
            <SaveBtn saved={savedBot}
              onClick={doSave(setSavedBot, () => api.patch("/settings", {
                botConfig: {
                  appointmentLabel, appointmentLabelPlural, services,
                  requestKeywords: customKeywords.length > 0 ? customKeywords
                    : ["turno","cita","reservar","quiero","necesito","agendar","sacar", appointmentLabel],
                },
              }))}
              label="Guardar configuración" />
          </div>
        </div>
      </section>

    </div>
  );
}
