"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Wifi, WifiOff, Loader2, LogOut, RefreshCw,
  Smartphone, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Panel de estado / QR ─────────────────────────────────────────────────────

function ConnectionPanel() {
  const [status, setStatus]   = useState<{ connected: boolean; connecting: boolean; hasQr: boolean } | null>(null);
  const [qrImg, setQrImg]     = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [qrExpired, setQrExpired]   = useState(false);
  const [pausedCount, setPausedCount] = useState(0);
  const [resumingAll, setResumingAll] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get("/whatsapp/status");
      setStatus(r.data);
      if (r.data.connected) {
        const p = await api.get("/whatsapp/paused").catch(() => ({ data: { count: 0 } }));
        setPausedCount(p.data.count ?? 0);
      }
    } catch { setStatus({ connected: false, connecting: false, hasQr: false }); }
  }, []);

  const handleResumeAll = async () => {
    setResumingAll(true);
    try {
      await api.delete("/whatsapp/paused");
      setPausedCount(0);
    } finally {
      setResumingAll(false);
    }
  };

  const fetchQr = useCallback(async () => {
    try {
      const r = await api.get("/whatsapp/qr");
      if (r.status === 204) {
        setQrImg(null);
      } else {
        setQrImg(r.data.qr);
        setQrExpired(false);
        // QR de WhatsApp expira en 60s
        setTimeout(() => setQrExpired(true), 60000);
      }
    } catch { setQrImg(null); }
  }, []);

  // Polling: estado cada 3s, QR cada 4s mientras no conectado
  useEffect(() => {
    fetchStatus();
    const statusIv = setInterval(fetchStatus, 3000);
    return () => clearInterval(statusIv);
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.connected) { setQrImg(null); return; }
    if (status?.hasQr) fetchQr();
    const qrIv = setInterval(() => {
      if (!status?.connected && status?.hasQr) fetchQr();
    }, 4000);
    return () => clearInterval(qrIv);
  }, [status, fetchQr]);

  const handleLogout = async () => {
    if (!confirm("¿Cerrar la sesión de WhatsApp? Tendrás que escanear el QR nuevamente.")) return;
    setLoggingOut(true);
    try {
      await api.post("/whatsapp/logout");
      setQrImg(null);
      setStatus(null);
    } finally {
      setLoggingOut(false);
    }
  };

  // ── CONECTADO ─────────────────────────────────────────────────────────────
  if (status?.connected) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        {/* Ícono de éxito */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, oklch(0.25 0.10 155) 0%, oklch(0.18 0.07 145) 100%)" }}>
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-background animate-pulse" />
        </div>

        {/* Texto */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground">WhatsApp Conectado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            El bot está activo y respondiendo mensajes automáticamente
          </p>
        </div>

        {/* Stats rápidas */}
        <div className="flex gap-3 w-full max-w-xs">
          {[
            { label: "Estado", value: "Activo", color: "text-emerald-400" },
            { label: "Sesión", value: "Guardada", color: "text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-xl p-3 text-center border border-border/30"
              style={{ background: "linear-gradient(145deg, oklch(0.16 0.03 260) 0%, oklch(0.12 0.02 248) 100%)" }}>
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Human Takeover status */}
        <div className="w-full max-w-xs rounded-xl border p-3 flex items-center justify-between gap-3"
          style={{
            background: pausedCount > 0 ? "rgba(251,191,36,0.06)" : "rgba(16,185,129,0.06)",
            borderColor: pausedCount > 0 ? "rgba(251,191,36,0.25)" : "rgba(16,185,129,0.2)",
          }}>
          <div className="flex items-center gap-2">
            <span className="text-base">{pausedCount > 0 ? "🙋" : "🤖"}</span>
            <div>
              <p className="text-xs font-semibold text-foreground leading-tight">
                {pausedCount > 0 ? `${pausedCount} conversación${pausedCount > 1 ? "es" : ""} en pausa` : "Bot activo para todos"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pausedCount > 0 ? "El médico tomó control manualmente" : "Respondiendo automáticamente"}
              </p>
            </div>
          </div>
          {pausedCount > 0 && (
            <button onClick={handleResumeAll} disabled={resumingAll}
              className="btn-glass btn-glass-sm shrink-0"
              style={{ fontSize: "10px", padding: "0.3rem 0.7rem" }}>
              {resumingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : "▶ Reactivar bot"}
            </button>
          )}
        </div>

        {/* Botón cerrar sesión */}
        <button onClick={handleLogout} disabled={loggingOut}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-destructive/30 text-destructive bg-black/30 hover:bg-destructive/10 backdrop-blur-sm transition-all text-sm font-medium disabled:opacity-60">
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loggingOut ? "Cerrando sesión..." : "Cerrar sesión de WhatsApp"}
        </button>
        <p className="text-[10px] text-muted-foreground text-center max-w-xs">
          Al cerrar sesión, el bot dejará de responder y deberás escanear el QR nuevamente con el celular del negocio.
        </p>
      </div>
    );
  }

  // ── QR disponible ─────────────────────────────────────────────────────────
  if (qrImg) {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Escanear con WhatsApp</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Abrí WhatsApp en tu celular → Dispositivos vinculados → Vincular dispositivo
          </p>
        </div>

        {/* QR Image */}
        <div className="relative">
          <div className={cn(
            "p-3 rounded-2xl border-2 transition-all",
            qrExpired ? "border-red-400/50 opacity-50" : "border-primary/30"
          )} style={{ background: "#fff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImg} alt="WhatsApp QR" width={240} height={240} className="block" />
          </div>

          {/* Overlay si expiró */}
          {qrExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
              style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">QR expirado</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Generando uno nuevo...</p>
                </div>
                <button onClick={fetchQr}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid color-mix(in oklch, var(--primary) 40%, transparent)",
                    color: "var(--primary)",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.5)")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualizar QR
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pasos simplificados */}
        <ol className="space-y-1.5 w-full max-w-xs">
          {[
            "Abrí WhatsApp en el celular del negocio",
            "Tocá los tres puntos → Dispositivos vinculados",
            "Tocá Vincular dispositivo y apuntá la cámara",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <span className="w-4 h-4 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <p className="text-[10px] text-muted-foreground">
          El QR expira en 60 segundos. Si expira, se actualiza automáticamente.
        </p>
      </div>
    );
  }

  // ── Conectando / sin QR ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "linear-gradient(145deg, oklch(0.18 0.04 260) 0%, oklch(0.13 0.02 250) 100%)" }}>
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">Iniciando conexión...</p>
        <p className="text-xs text-muted-foreground mt-1">El QR aparecerá en unos segundos</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function WhatsappPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Bot</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Conexión y mensajes automáticos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Panel principal QR / estado */}
          <section className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <h2 className="font-semibold text-foreground text-sm">Estado de conexión</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Actualizando automáticamente
              </div>
            </div>
            <div className="p-5">
              <ConnectionPanel />
            </div>
          </section>

          {/* Info lateral */}
          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="font-semibold text-foreground text-sm">¿Cómo funciona?</h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  icon: "📱",
                  title: "Usá tu número actual",
                  body: "El bot se conecta como dispositivo vinculado (igual que WhatsApp Web). Tu celular sigue funcionando normal con el mismo número.",
                },
                {
                  icon: "🤖",
                  title: "El bot responde solo",
                  body: "Cada mensaje de paciente es procesado y respondido automáticamente por la IA.",
                },
                {
                  icon: "🙋",
                  title: "Human takeover automático",
                  body: "Si respondés manualmente desde tu celular, el bot se pausa 60 min para ese paciente y vos tomás el control.",
                },
                {
                  icon: "🔒",
                  title: "Sesión persistente",
                  body: "Si el servidor reinicia, se reconecta solo sin pedir QR de nuevo.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}

              <div className="mt-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex gap-2">
                <span className="text-emerald-400 text-sm shrink-0">✅</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Un solo número para todo.</strong> Los pacientes hablan siempre con el mismo número. El bot gestiona turnos y vos podés responder consultas médicas directamente desde tu celular.
                </p>
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}
