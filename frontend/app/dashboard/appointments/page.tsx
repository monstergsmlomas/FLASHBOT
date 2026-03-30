"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays, List, Plus, X, Search, User, Phone,
  Clock, ChevronRight, CheckCircle2, Loader2, Zap,
  RotateCcw, Trash2, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Pendiente",  color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  CONFIRMED: { label: "Confirmado", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "Cancelado",  color: "bg-red-500/10 text-red-400 border-red-500/20" },
  COMPLETED: { label: "Completado", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

// ─── Modal para crear turno manualmente ──────────────────────────────────────

function NewAppointmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<"customer" | "datetime" | "confirm">("customer");

  // Customer step
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // DateTime step
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<{ time: string; datetime: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; datetime: string } | null>(null);

  // Saving
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Buscar clientes mientras escribe
  useEffect(() => {
    if (isNewCustomer) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (search.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const r = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      setSearchResults(r.data.slice(0, 5));
    }, 300);
  }, [search, isNewCustomer]);

  // Cargar slots cuando cambia la fecha
  useEffect(() => {
    if (!selectedDate) return;
    setSlots([]);
    setSelectedSlot(null);
    setLoadingSlots(true);
    api.get(`/appointments/slots?date=${selectedDate}`)
      .then((r) => setSlots(r.data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const canGoToDatetime = isNewCustomer
    ? newPhone.trim().length >= 6
    : selectedCustomer !== null;

  const handleCreate = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    try {
      let customerId = selectedCustomer?.id;

      if (isNewCustomer) {
        const r = await api.post("/customers", {
          phone: newPhone.trim(),
          name: newName.trim() || undefined,
        });
        customerId = r.data.id;
      }

      await api.post("/appointments", {
        date: selectedSlot.datetime,
        customerId,
      });

      setDone(true);
      setTimeout(() => { onCreated(); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  // Nombre para mostrar en resumen
  const displayName = isNewCustomer
    ? (newName.trim() || newPhone.trim())
    : (selectedCustomer?.name || selectedCustomer?.phone || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-border/60"
        style={{ background: "linear-gradient(145deg, oklch(0.18 0.04 260) 0%, oklch(0.13 0.02 250) 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="font-bold text-foreground">Nuevo turno manual</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {step === "customer" ? "1 / 3 — ¿Para quién?" : step === "datetime" ? "2 / 3 — ¿Cuándo?" : "3 / 3 — Confirmar"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex px-5 pt-4 gap-2">
          {(["customer", "datetime", "confirm"] as const).map((s, i) => (
            <div key={s} className={cn(
              "h-1 rounded-full flex-1 transition-all duration-300",
              step === s ? "bg-primary" : i < ["customer","datetime","confirm"].indexOf(step) ? "bg-primary/40" : "bg-muted"
            )} />
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* ── STEP 1: Cliente ───────────────────────────────────── */}
          {step === "customer" && (
            <div className="space-y-4">
              {!isNewCustomer ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Buscar paciente por nombre o teléfono</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setSelectedCustomer(null); }}
                        placeholder="Nombre o número de teléfono..."
                        className="pl-9 h-9 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Resultados */}
                  {searchResults.length > 0 && !selectedCustomer && (
                    <div className="space-y-1">
                      {searchResults.map((c) => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setSearch(c.name || c.phone); setSearchResults([]); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left border border-border/30 hover:border-primary/30">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {(c.name || c.phone)?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name || "Sin nombre"}</p>
                            <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                          </div>
                          {selectedCustomer?.id === c.id && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cliente seleccionado */}
                  {selectedCustomer && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/30">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {(selectedCustomer.name || selectedCustomer.phone)?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{selectedCustomer.name || "Sin nombre"}</p>
                        <p className="text-[11px] text-muted-foreground">{selectedCustomer.phone}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[11px] text-muted-foreground">o</span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <button onClick={() => setIsNewCustomer(true)} className="btn-glass btn-glass-secondary btn-glass-full justify-center">
                    <User className="h-4 w-4" />
                    Registrar paciente nuevo
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" />Teléfono / WhatsApp *</Label>
                      <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="1123456789" className="h-9 text-sm" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5"><User className="h-3 w-3" />Nombre <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nombre del paciente" className="h-9 text-sm" />
                    </div>
                  </div>
                  <button onClick={() => setIsNewCustomer(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    ← Buscar paciente existente
                  </button>
                </>
              )}

              <button
                onClick={() => setStep("datetime")}
                disabled={!canGoToDatetime}
                className="btn-glass w-full justify-center">
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Fecha y horario ───────────────────────────── */}
          {step === "datetime" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Seleccioná la fecha</Label>
                <input
                  type="date"
                  value={selectedDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Horarios disponibles
                  </Label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando horarios...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-xl border border-border/30">
                      Sin horarios disponibles para ese día
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {slots.map((s) => (
                        <button key={s.datetime} onClick={() => setSelectedSlot(s)}
                          className={cn(
                            "py-2 rounded-xl text-xs font-semibold border transition-all",
                            selectedSlot?.datetime === s.datetime
                              ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
                              : "border-border/50 text-foreground hover:border-primary/50 hover:bg-primary/10"
                          )}>
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep("customer")} className="btn-glass btn-glass-secondary flex-1 justify-center">
                  Atrás
                </button>
                <button onClick={() => setStep("confirm")} disabled={!selectedSlot} className="btn-glass flex-1 justify-center">
                  Continuar <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirmar ─────────────────────────────────── */}
          {step === "confirm" && (
            <div className="space-y-4">
              {done ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-bold text-foreground">¡Turno creado!</p>
                </div>
              ) : (
                <>
                  {/* Resumen */}
                  <div className="rounded-2xl border border-border/40 overflow-hidden"
                    style={{ background: "linear-gradient(145deg, oklch(0.16 0.03 260) 0%, oklch(0.12 0.02 248) 100%)" }}>
                    <div className="px-4 py-3 border-b border-border/30">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resumen del turno</p>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-white font-bold text-sm">
                          {displayName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{displayName}</p>
                          {isNewCustomer && <span className="text-[10px] text-primary/70 font-medium">Paciente nuevo</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Fecha</p>
                          <p className="text-sm font-semibold text-foreground capitalize">
                            {selectedDate ? format(new Date(selectedDate + "T12:00:00"), "EEE d MMM", { locale: es }) : ""}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Hora</p>
                          <p className="text-sm font-semibold text-foreground">{selectedSlot?.time} hs</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep("datetime")} className="btn-glass btn-glass-secondary flex-1 justify-center">
                      Atrás
                    </button>
                    <button onClick={handleCreate} disabled={saving} className="btn-glass flex-1 justify-center">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      {saving ? "Guardando..." : "Confirmar turno"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [selectedDay, setSelectedDay] = useState<{ date: Date; appts: any[] } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchAppointments = () => {
    setLoading(true);
    api.get("/appointments").then((r) => {
      setAppointments(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("¿Cancelar este turno?")) return;
    await api.patch(`/appointments/${id}/cancel`);
    fetchAppointments();
    setSelectedDay(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este turno cancelado? Esta acción no se puede deshacer.")) return;
    await api.delete(`/appointments/${id}`);
    fetchAppointments();
    setSelectedDay(prev => prev ? { ...prev, appts: prev.appts.filter(a => a.id !== id) } : null);
  };

  const handleReschedule = async (appt: any) => {
    const name = appt.customer?.name ?? "el paciente";
    if (!confirm(`¿Reprogramar el turno de ${name}?\n\nSe cancelará el turno actual y se le enviará un mensaje de WhatsApp para que elija una nueva fecha.`)) return;
    const r = await api.post("/whatsapp/reschedule-appointment", { appointmentId: appt.id });
    if (r.data.notified) {
      alert(`✅ Turno cancelado y mensaje enviado a ${name} por WhatsApp.`);
    } else {
      alert(`Turno cancelado. No se pudo enviar WhatsApp (bot desconectado).`);
    }
    fetchAppointments();
    setSelectedDay(null);
  };

  const handleCloseDay = async (date: Date) => {
    const dateStr = format(date, "EEEE d 'de' MMMM", { locale: es });
    const appts = selectedDay?.appts.filter(a => a.status === "PENDING" || a.status === "CONFIRMED") ?? [];
    if (appts.length === 0) { alert("No hay turnos activos para este día."); return; }
    if (!confirm(`¿Cerrar el día ${dateStr}?\n\nSe cancelarán ${appts.length} turno(s) y se notificará a cada paciente por WhatsApp para reprogramar.`)) return;
    const r = await api.post("/whatsapp/close-day", { date: format(date, "yyyy-MM-dd") });
    alert(`✅ Día cerrado. ${r.data.cancelled} turno(s) cancelados${r.data.notified ? " y pacientes notificados por WhatsApp." : "."}`);
    fetchAppointments();
    setSelectedDay(null);
  };

  const handleConfirm = async (id: string) => {
    await api.patch(`/appointments/${id}/status`, { status: "CONFIRMED" });
    fetchAppointments();
  };

  const handleComplete = async (id: string) => {
    await api.patch(`/appointments/${id}/status`, { status: "COMPLETED" });
    fetchAppointments();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Turnos</h1>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex gap-1 bg-muted p-1 rounded-xl">
            <button onClick={() => setView("calendar")}
              className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                view === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <CalendarDays className="h-4 w-4" /> Calendario
            </button>
            <button onClick={() => setView("list")}
              className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-4 w-4" /> Lista
            </button>
          </div>

          {/* Botón nuevo turno */}
          <button onClick={() => setShowNewModal(true)} className="btn-glass">
            <Zap className="h-4 w-4" />
            Nuevo turno
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-4">
          <MonthCalendar
            appointments={appointments}
            onDayClick={(date, appts) => setSelectedDay({ date, appts })}
          />

          {selectedDay && selectedDay.appts.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h3 className="font-semibold text-foreground capitalize">
                  {format(selectedDay.date, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedDay.appts.length} turno{selectedDay.appts.length !== 1 ? "s" : ""}
                  </span>
                  {/* Cerrar día completo */}
                  <button
                    onClick={() => handleCloseDay(selectedDay.date)}
                    title="Cerrar este día y notificar a todos los pacientes"
                    className="btn-glass btn-glass-sm btn-glass-danger"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Cerrar día
                  </button>
                  <button onClick={() => setSelectedDay(null)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border/30">
                {selectedDay.appts
                  .slice()
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((appt) => {
                    const status = STATUS_MAP[appt.status] ?? STATUS_MAP.PENDING;
                    const isActive = appt.status === "PENDING" || appt.status === "CONFIRMED";
                    return (
                      <div key={appt.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-white font-bold text-sm">
                            {(appt.customer?.name ?? appt.customer?.phone)?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {appt.customer?.name || appt.customer?.phone}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(appt.date), "HH:mm")} hs · {appt.durationMin} min
                            </p>
                            {(appt.service || appt.employee) && (
                              <div className="flex gap-1.5 mt-1">
                                {appt.service && (
                                  <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                    {appt.service.name}
                                  </span>
                                )}
                                {appt.employee && (
                                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                    {appt.employee.name}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                          {appt.status === "PENDING" && (
                            <button onClick={() => handleConfirm(appt.id)}
                              className="text-xs text-emerald-400 hover:underline font-medium">Confirmar</button>
                          )}
                          {appt.status === "CONFIRMED" && (
                            <button onClick={() => handleComplete(appt.id)}
                              className="text-xs text-blue-400 hover:underline font-medium">Completado</button>
                          )}
                          {/* Reprogramar — solo activos */}
                          {isActive && (
                            <button
                              onClick={() => handleReschedule(appt)}
                              title="Reprogramar — el bot notifica al paciente por WhatsApp"
                              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" /> Reprogramar
                            </button>
                          )}
                          {isActive && (
                            <button onClick={() => handleCancel(appt.id)}
                              className="text-xs text-red-400 hover:underline font-medium">Cancelar</button>
                          )}
                          {/* Eliminar — solo cancelados */}
                          {appt.status === "CANCELLED" && (
                            <button
                              onClick={() => handleDelete(appt.id)}
                              title="Eliminar turno cancelado"
                              className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 font-medium transition-colors"
                            >
                              <Trash2 className="h-3 w-3" /> Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          {appointments.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No hay turnos aún</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Los pacientes reservan por WhatsApp o usá el botón "+ Nuevo turno"</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {appointments
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((appt) => {
                  const status = STATUS_MAP[appt.status] ?? STATUS_MAP.PENDING;
                  return (
                    <div key={appt.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-white font-bold text-sm">
                          {(appt.customer?.name ?? appt.customer?.phone)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {appt.customer?.name || appt.customer?.phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(appt.date), "EEEE d MMM · HH:mm", { locale: es })} hs · {appt.durationMin} min
                          </p>
                          {(appt.service || appt.employee) && (
                            <div className="flex gap-1.5 mt-1">
                              {appt.service && (
                                <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                                  {appt.service.name}
                                </span>
                              )}
                              {appt.employee && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                  {appt.employee.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                        {appt.status === "PENDING" && (
                          <button onClick={() => handleConfirm(appt.id)} className="text-xs text-emerald-400 hover:underline font-medium">Confirmar</button>
                        )}
                        {appt.status === "CONFIRMED" && (
                          <button onClick={() => handleComplete(appt.id)} className="text-xs text-blue-400 hover:underline font-medium">Completado</button>
                        )}
                        {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
                          <button onClick={() => handleCancel(appt.id)} className="text-xs text-red-400 hover:underline font-medium">Cancelar</button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Modal nuevo turno */}
      {showNewModal && (
        <NewAppointmentModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => { fetchAppointments(); setShowNewModal(false); }}
        />
      )}
    </div>
  );
}
