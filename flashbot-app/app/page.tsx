"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  from: "client" | "bot";
  text: string;
  time: string;
  delay: number;
}

interface Testimonial {
  name: string;
  company: string;
  role: string;
  text: string;
  revenue: string;
  avatar: string;
}

interface UseCase {
  industry: string;
  icon: string;
  metric: string;
  desc: string;
  color: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// CHANGE 2: multiple sale scenarios for the infinite loop
const SALE_SCENARIOS: ChatMessage[][] = [
  [
    { id: 1, from: "client", text: "Hola, quiero info sobre el producto premium", time: "9:01 AM", delay: 0 },
    { id: 2, from: "bot",    text: "¡Hola! 👋 Soy FASTBOT, tu asistente de ventas 24/7. Con gusto te ayudo. ¿Cuántas unidades necesitás?", time: "9:01 AM", delay: 1.2 },
    { id: 3, from: "client", text: "Necesito unas 50 unidades para mi empresa", time: "9:02 AM", delay: 2.6 },
    { id: 4, from: "bot",    text: "Perfecto 🔥 Para 50 unidades tenés acceso al plan corporativo con un 25% OFF. ¿Te mando la cotización ahora?", time: "9:02 AM", delay: 3.9 },
    { id: 5, from: "client", text: "Sí, mándame la cotización", time: "9:03 AM", delay: 5.1 },
    { id: 6, from: "bot",    text: "✅ Cotización enviada a tu email. Además te reservé stock por 48hs. ¿Preferís pago en cuotas o contado?", time: "9:03 AM", delay: 6.4 },
    { id: 7, from: "client", text: "En cuotas, 6 meses sin interés", time: "9:04 AM", delay: 7.8 },
    { id: 8, from: "bot",    text: "Genial 💳 Link de pago generado: pay.fastbot/corp-xyz — ¡Venta cerrada en minutos! Gracias por elegirnos 🚀", time: "9:04 AM", delay: 9.0 },
  ],
  [
    { id: 1, from: "client", text: "Buen día, ¿tienen plan para agencias?", time: "2:15 PM", delay: 0 },
    { id: 2, from: "bot",    text: "¡Buenas! 🤖 Claro que sí. Nuestro plan Agency permite gestionar múltiples clientes desde un solo panel. ¿Cuántos clientes maneja tu agencia?", time: "2:15 PM", delay: 1.4 },
    { id: 3, from: "client", text: "Tenemos 8 clientes activos, algunos de ecommerce", time: "2:16 PM", delay: 2.8 },
    { id: 4, from: "bot",    text: "Ideal para vos 🎯 Con 8 clientes el plan Agency Pro te sale $497/mes y tenés ROI desde el primer mes. ¿Arrancamos con una prueba gratuita?", time: "2:16 PM", delay: 4.2 },
    { id: 5, from: "client", text: "¿Qué incluye la prueba?", time: "2:17 PM", delay: 5.6 },
    { id: 6, from: "bot",    text: "14 días completos: todos los canales, IA sin límite, onboarding 1:1 con nuestro equipo ⚡ Sin tarjeta de crédito. ¿Activo tu cuenta ahora?", time: "2:17 PM", delay: 7.0 },
    { id: 7, from: "client", text: "Dale, activá la prueba", time: "2:18 PM", delay: 8.4 },
    { id: 8, from: "bot",    text: "🎉 ¡Cuenta activada! Te llega el acceso en 2 minutos. Ya vas a ver por qué somos el #1 en LATAM 🚀", time: "2:18 PM", delay: 9.8 },
  ],
  [
    { id: 1, from: "client", text: "Vi su publicidad, ¿es verdad que vende solo?", time: "11:30 PM", delay: 0 },
    { id: 2, from: "bot",    text: "100% real 🤖✨ Son las 11:30pm y estoy cerrando ventas mientras el dueño duerme. ¿Qué vendés vos?", time: "11:30 PM", delay: 1.3 },
    { id: 3, from: "client", text: "Ropa online, tengo una tienda en Instagram", time: "11:31 PM", delay: 2.5 },
    { id: 4, from: "bot",    text: "Perfecto para vos 👗 Conecto directo con tu Instagram, respondo mensajes, muestro catálogo y cobro sin que toques nada. ¿Lo probamos gratis?", time: "11:31 PM", delay: 3.8 },
    { id: 5, from: "client", text: "¿Cuánto cuesta después de la prueba?", time: "11:32 PM", delay: 5.2 },
    { id: 6, from: "bot",    text: "Plan Fashion: $97/mes. Si vendés 5 productos extra por semana ya lo pagás 💰 Y si no estás feliz, te devuelvo todo. ¿Empezamos?", time: "11:32 PM", delay: 6.6 },
    { id: 7, from: "client", text: "Bien, ¿cómo me registro?", time: "11:33 PM", delay: 8.0 },
    { id: 8, from: "bot",    text: "¡Excelente! 🔥 Registro aquí: fastbot.ai/start — En 5 minutos ya estás vendiendo. Bienvenida al futuro 🚀", time: "11:33 PM", delay: 9.2 },
  ],
];
const SALE_AMOUNTS   = ["$1.247 USD", "$2.380 USD", "$890 USD"];
const SALE_DURATIONS = ["3m 04s", "4m 22s", "2m 51s"];

// CHANGE 3: expanded testimonial list (8 cards) for the marquee
const TESTIMONIALS: Testimonial[] = [
  { name: "Rodrigo Villanueva", company: "TechStore MX",     role: "CEO",                  text: "FASTBOT transformó nuestro negocio por completo. Pasamos de 20 ventas diarias a más de 200. La IA maneja todo sin que yo esté presente.",              revenue: "+1.800% en ventas",  avatar: "RV" },
  { name: "Valentina Ríos",     company: "FashionHub AR",    role: "Directora Comercial",  text: "Antes perdíamos clientes fuera del horario laboral. FASTBOT cierra ventas a las 3am mientras dormimos. Increíble.",                                  revenue: "0 ventas perdidas",  avatar: "VR" },
  { name: "Martín Espada",      company: "Inmobiliaria Cima",role: "Fundador",              text: "Nunca pensé que una IA pudiera cerrar propiedades de alto valor. FASTBOT califica leads y agenda citas sola. Revolucionario.",                      revenue: "$2.4M cerrados",     avatar: "ME" },
  { name: "Camila Torres",      company: "SaludPlus",        role: "Gerente de Ventas",    text: "Nuestros pacientes ahora pueden consultar y contratar servicios a cualquier hora. FASTBOT es parte fundamental del equipo.",                          revenue: "340% más consultas", avatar: "CT" },
  { name: "Diego Ríos",         company: "AutoMax PE",       role: "Director General",     text: "Implementamos FASTBOT en nuestra concesionaria y las consultas se triplicaron. La IA agenda test drives sin que nadie intervenga.",                  revenue: "+280% test drives",  avatar: "DR" },
  { name: "Ana Suárez",         company: "EduOnline CO",     role: "Fundadora",            text: "Con FASTBOT aumentamos las matrículas un 60% sin contratar más personal. Se paga solo desde la primera semana.",                                     revenue: "60% más matrículas", avatar: "AS" },
  { name: "Lucas Pereyra",      company: "FoodBox CL",       role: "CEO",                  text: "Nuestra app de delivery pasó de 80 a 300 pedidos diarios en un mes. FASTBOT es el mejor vendedor que tuvimos.",                                     revenue: "3.7x más pedidos",   avatar: "LP" },
  { name: "Sofía Herrera",      company: "Beauty Pro BR",    role: "Dueña",                text: "Mis clientas reservan turnos a las 2am. FASTBOT las atiende, les muestra mis servicios y cobra el seña. Impresionante.",                             revenue: "100% turnos llenos", avatar: "SH" },
];

const USE_CASES: UseCase[] = [
  { industry: "E-Commerce",      icon: "🛒", metric: "3x más conversiones",    desc: "Recupera carritos abandonados, recomienda productos y cierra ventas automáticamente 24/7.", color: "#00f5a0" },
  { industry: "Inmobiliaria",    icon: "🏢", metric: "$5M+ cerrados/mes",       desc: "Califica compradores, programa visitas y negocia condiciones sin intervención humana.",     color: "#00d4ff" },
  { industry: "Servicios B2B",   icon: "⚡", metric: "90% leads calificados",   desc: "Detecta el pain point, presenta propuesta y agenda demo en minutos.",                       color: "#7c3aed" },
  { industry: "Salud & Bienestar",icon:"🏥", metric: "5x más citas agendadas",  desc: "Gestiona consultas, deriva al profesional correcto y coordina turnos automaticamente.",    color: "#f59e0b" },
  { industry: "Educación",       icon: "🎓", metric: "60% más matrículas",      desc: "Asesora alumnos potenciales, presenta planes de estudio y procesa inscripciones.",          color: "#ec4899" },
  { industry: "Restaurantes",    icon: "🍽️",metric: "2x más pedidos",          desc: "Gestiona reservas, pedidos a domicilio y fidelización de clientes 24 horas.",               color: "#10b981" },
];

const STATS = [
  { value: "98.7%", label: "Tasa de respuesta"  },
  { value: "< 1s",  label: "Tiempo de respuesta" },
  { value: "24/7",  label: "Disponibilidad total" },
  { value: "10x",   label: "ROI promedio"         },
];

// ─── CHANGE 5: Slowed StarField (speed 0.6 base, was 2) ──────────────────────
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width  = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let animId: number;

    interface Star { x: number; y: number; z: number; px: number; py: number }
    const stars: Star[] = Array.from({ length: 280 }, () => ({
      x: Math.random() * W - W / 2,
      y: Math.random() * H - H / 2,
      z: Math.random() * W,
      px: 0, py: 0,
    }));

    let speed = 0.6;           // was 2 — now 3x slower
    let targetSpeed = 0.6;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = e.clientX / W;
      targetSpeed = 0.6 + cx * 3.5; // max boost reduced too
    };
    window.addEventListener("mousemove", handleMouseMove);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "rgba(2, 4, 18, 0.25)";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);

      speed += (targetSpeed - speed) * 0.04;

      for (const s of stars) {
        s.px = (s.x / s.z) * W;
        s.py = (s.y / s.z) * H;
        s.z -= speed;

        if (s.z <= 0) {
          s.x  = Math.random() * W - W / 2;
          s.y  = Math.random() * H - H / 2;
          s.z  = W;
          s.px = (s.x / s.z) * W;
          s.py = (s.y / s.z) * H;
        }

        const nx         = (s.x / s.z) * W;
        const ny         = (s.y / s.z) * H;
        const size       = Math.max(0, (1 - s.z / W) * 3);
        const brightness = Math.min(1, (1 - s.z / W) * 1.4);
        const hue        = 180 + Math.sin(s.x * 0.01) * 40;

        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${brightness})`;
        ctx.lineWidth   = size;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(nx, ny, size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 95%, ${brightness})`;
        ctx.fill();
      }
      ctx.restore();
      animId = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ─── Floating Orb ─────────────────────────────────────────────────────────────
function FloatingOrb({ color, size, top, left, delay = 0 }: { color: string; size: number; top: string; left: string; delay?: number }) {
  const orbRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!orbRef.current) return;
    gsap.to(orbRef.current, { y: -40, duration: 4 + delay, repeat: -1, yoyo: true, ease: "sine.inOut", delay });
  }, []);
  return (
    <div ref={orbRef} style={{
      position: "absolute", top, left, width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${color}66, ${color}11)`,
      border: `1px solid ${color}33`,
      filter: `blur(${size > 200 ? 40 : 20}px)`,
      pointerEvents: "none", zIndex: 1,
    }} />
  );
}

// ─── CHANGE 2: WhatsApp looping multi-scenario simulator ─────────────────────
const SALE_PHASES = [
  { label: "Prospección", color: "#94a3b8", pct: 0   },
  { label: "Calificación",color: "#f59e0b", pct: 30  },
  { label: "Propuesta",   color: "#00d4ff", pct: 55  },
  { label: "Negociación", color: "#a78bfa", pct: 78  },
  { label: "CIERRE 🔥",  color: "#00f5a0", pct: 100 },
];

function WhatsAppSimulator() {
  const [scenarioIdx,     setScenarioIdx]     = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [typing,          setTyping]          = useState(false);
  const [phaseIdx,        setPhaseIdx]        = useState(0);
  const [saleComplete,    setSaleComplete]    = useState(false);
  const [confetti,        setConfetti]        = useState(false);
  const chatRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseBarRef  = useRef<HTMLDivElement>(null);
  const saleFlashRef = useRef<HTMLDivElement>(null);
  const timeoutsRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const currentMessages = SALE_SCENARIOS[scenarioIdx];

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current,
      { autoAlpha: 0, y: 60, scale: 0.92 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "back.out(1.4)",
        scrollTrigger: { trigger: containerRef.current, start: "top 75%" } }
    );
    gsap.to(".wa-phone-frame", {
      boxShadow: "0 0 100px #00f5a055, 0 30px 80px #00000088, inset 0 1px 0 #ffffff18",
      duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut",
    });
  }, []);

  useGSAP(() => {
    if (!phaseBarRef.current) return;
    const phase = SALE_PHASES[phaseIdx];
    gsap.to(phaseBarRef.current, {
      width: `${phase.pct}%`,
      background: `linear-gradient(90deg, #00f5a0, ${phase.color})`,
      boxShadow: `0 0 14px ${phase.color}99`,
      duration: 0.9, ease: "power2.out",
    });
  }, [phaseIdx]);

  useGSAP(() => {
    if (!saleComplete || !saleFlashRef.current) return;
    gsap.fromTo(saleFlashRef.current,
      { autoAlpha: 0, scale: 0.6, y: 16 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(2)" }
    );
    gsap.to(".sale-amount-txt", {
      textShadow: "0 0 40px #00f5a0, 0 0 80px #00f5a066",
      duration: 0.4, repeat: 3, yoyo: true,
    });
    setConfetti(true);
  }, [saleComplete]);

  const runScenario = (idx: number) => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    const msgs         = SALE_SCENARIOS[idx];
    const totalMs      = (msgs[msgs.length - 1].delay + 1.4) * 1000;

    msgs.forEach((msg) => {
      if (msg.from === "bot" && msg.id > 1)
        timeoutsRef.current.push(setTimeout(() => setTyping(true), msg.delay * 1000 - 800));
      timeoutsRef.current.push(setTimeout(() => {
        setTyping(false);
        setVisibleMessages((prev) => [...prev, msg.id]);
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
        const phaseMap: Record<number, number> = { 1: 0, 3: 1, 5: 2, 7: 3, 8: 4 };
        if (phaseMap[msg.id] !== undefined) setPhaseIdx(phaseMap[msg.id]);
        if (msg.id === 8) setTimeout(() => setSaleComplete(true), 600);
      }, msg.delay * 1000 + 600));
    });

    // 3s pause after sale closes then loop to next scenario
    timeoutsRef.current.push(setTimeout(() => {
      setVisibleMessages([]);
      setTyping(false);
      setPhaseIdx(0);
      setSaleComplete(false);
      setConfetti(false);
      setScenarioIdx((idx + 1) % SALE_SCENARIOS.length);
    }, totalMs + 3200));
  };

  useEffect(() => {
    runScenario(scenarioIdx);
    return () => { timeoutsRef.current.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioIdx]);

  return (
    <div ref={containerRef} style={{ maxWidth: 380, position: "relative", zIndex: 10 }}>

      {confetti && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30, overflow: "hidden", borderRadius: 36 }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const cols = ["#00f5a0","#00d4ff","#f59e0b","#a78bfa","#ec4899","#fff"];
            return (
              <div key={i} style={{
                position: "absolute", top: "30%",
                left: `${(i / 24) * 100}%`,
                width: 5 + (i % 5), height: 5 + (i % 5),
                background: cols[i % cols.length],
                borderRadius: i % 2 === 0 ? "50%" : "2px",
                animation: `confettiFall ${1.2 + (i % 7) * 0.14}s ${(i % 5) * 0.09}s ease-out forwards`,
              }} />
            );
          })}
        </div>
      )}

      <div style={{
        position: "absolute", top: -12, right: 16, zIndex: 20,
        background: "linear-gradient(135deg, #ef4444, #dc2626)",
        borderRadius: 20, padding: "4px 12px",
        display: "flex", alignItems: "center", gap: 6,
        boxShadow: "0 0 20px #ef444466",
        fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 1.5,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite", display: "inline-block" }} />
        EN VIVO
      </div>

      <div style={{
        position: "absolute", top: -12, left: 16, zIndex: 20,
        background: "linear-gradient(135deg, #00f5a018, #00d4ff11)",
        border: "1px solid #00f5a044",
        borderRadius: 20, padding: "4px 12px",
        fontSize: 10, fontWeight: 700, color: "#00f5a0", letterSpacing: 1,
      }}>
        VENTA #{scenarioIdx + 1}
      </div>

      <div className="wa-phone-frame" style={{
        background: "linear-gradient(145deg, #1a1a2e, #16213e)",
        borderRadius: 36, marginTop: 8,
        padding: "14px 14px 0",
        boxShadow: "0 0 80px #00f5a044, 0 30px 80px #00000088, inset 0 1px 0 #ffffff18",
        border: "1.5px solid #00f5a033",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px 10px", fontSize: 11, color: "#ffffff88" }}>
          <span>{currentMessages[0]?.time?.split(" ")[0] ?? "9:01"} AM</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span>●●●</span><span>WiFi</span><span>🔋</span></div>
        </div>

        <div style={{ background: "#0d1b2a", borderRadius: "20px 20px 0 0", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg, #075e54, #128c7e)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "linear-gradient(135deg, #00f5a0, #00d4ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#020412",
              boxShadow: "0 0 16px #00f5a066", flexShrink: 0,
            }}>F</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}>FASTBOT</div>
              <div style={{ color: "#a7f3d0", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                {typing ? "escribiendo..." : "IA activa · Vendiendo ahora"}
              </div>
            </div>
          </div>

          <div style={{ background: "#06101a", padding: "7px 12px 5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              {SALE_PHASES.map((p, i) => (
                <span key={p.label} style={{ fontSize: 8, fontWeight: 700, color: i <= phaseIdx ? p.color : "#334155", transition: "color 0.5s" }}>
                  {i === phaseIdx ? p.label : i < phaseIdx ? "✓" : "·"}
                </span>
              ))}
            </div>
            <div style={{ height: 4, background: "#0d1b2a", borderRadius: 4, overflow: "hidden" }}>
              <div ref={phaseBarRef} style={{ height: "100%", width: "0%", borderRadius: 4, background: "linear-gradient(90deg, #00f5a0, #00f5a0)" }} />
            </div>
          </div>

          <div ref={chatRef} style={{
            background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\") #111b2e",
            height: 360, overflowY: "auto", padding: "12px 10px",
            scrollBehavior: "smooth", display: "flex", flexDirection: "column", gap: 7,
          }}>
            <div style={{ textAlign: "center", marginBottom: 6 }}>
              <span style={{ background: "#ffffff18", color: "#ffffff88", fontSize: 10, padding: "3px 10px", borderRadius: 10 }}>Hoy</span>
            </div>

            {currentMessages.filter((m) => visibleMessages.includes(m.id)).map((msg) => (
              <div key={msg.id} style={{
                display: "flex",
                flexDirection: msg.from === "client" ? "row-reverse" : "row",
                alignItems: "flex-end", gap: 6,
                animation: "fadeSlideIn 0.3s ease",
              }}>
                {msg.from === "bot" && (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "linear-gradient(135deg, #00f5a0, #00d4ff)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#020412", flexShrink: 0,
                  }}>F</div>
                )}
                <div style={{
                  maxWidth: "75%",
                  background: msg.from === "bot" ? "linear-gradient(135deg, #1a3a2e, #0d2b2a)" : "linear-gradient(135deg, #1e3a5a, #0d2040)",
                  borderRadius: msg.from === "bot" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                  padding: "8px 12px",
                  border: msg.from === "bot" ? "1px solid #00f5a033" : "1px solid #00d4ff33",
                }}>
                  <p style={{ margin: 0, color: "#e2e8f0", fontSize: 12.5, lineHeight: 1.5 }}>{msg.text}</p>
                  <p style={{ margin: "3px 0 0", color: "#ffffff44", fontSize: 9.5, textAlign: "right" }}>
                    {msg.time} {msg.from === "bot" && "✓✓"}
                  </p>
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "linear-gradient(135deg, #00f5a0, #00d4ff)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#020412",
                }}>F</div>
                <div style={{ background: "#1a3a2e", borderRadius: "4px 16px 16px 16px", padding: "9px 14px", border: "1px solid #00f5a033", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00f5a0", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {saleComplete && (
            <div ref={saleFlashRef} style={{
              background: "linear-gradient(135deg, #00f5a015, #00d4ff08)",
              borderTop: "1px solid #00f5a055", padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#00f5a0", letterSpacing: 2, marginBottom: 2 }}>🔥 VENTA CERRADA</div>
                <div className="sale-amount-txt" style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 900,
                  background: "linear-gradient(135deg, #00f5a0, #00d4ff)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>{SALE_AMOUNTS[scenarioIdx]}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Duración</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{SALE_DURATIONS[scenarioIdx]}</div>
                <div style={{ fontSize: 8, color: "#00f5a0" }}>sin intervención humana</div>
              </div>
            </div>
          )}

          {!saleComplete && (
            <div style={{ background: "#0d1b2a", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #ffffff0a" }}>
              <div style={{ flex: 1, background: "#1a2a3a", borderRadius: 22, padding: "8px 14px", color: "#ffffff33", fontSize: 12 }}>FASTBOT responde solo...</div>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #00f5a0, #00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px #00f5a066" }}>
                <span style={{ fontSize: 16 }}>⚡</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(360px) rotate(720deg); opacity:0; } }`}</style>
    </div>
  );
}

// ─── CHANGE 1: Stats — horizontal row with next-level effects ─────────────────
function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll(".stat-card-h");

    gsap.fromTo(cards,
      { autoAlpha: 0, y: 60, scale: 0.6, rotationX: 40 },
      { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: 0.9, stagger: 0.12, ease: "back.out(1.7)",
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" } }
    );

    cards.forEach((card, i) => {
      gsap.to(card, { y: -8 + Math.sin(i) * 4, duration: 2.5 + i * 0.4, repeat: -1, yoyo: true, ease: "sine.inOut", delay: i * 0.3 });
    });

    const rings = sectionRef.current.querySelectorAll(".stat-ring");
    rings.forEach((ring, i) => { gsap.to(ring, { rotation: 360, duration: 6 + i * 1.5, repeat: -1, ease: "none" }); });

    const valueEls = sectionRef.current.querySelectorAll<HTMLElement>(".stat-value-anim");
    valueEls.forEach((el) => {
      const txt      = el.getAttribute("data-value") ?? "";
      const numMatch = txt.match(/[\d.]+/);
      if (!numMatch) return;
      const end    = parseFloat(numMatch[0]);
      const prefix = txt.slice(0, numMatch.index);
      const suffix = txt.slice((numMatch.index ?? 0) + numMatch[0].length);
      gsap.fromTo({ val: 0 }, { val: end }, {
        duration: 2, ease: "power2.out",
        onUpdate: function () {
          const v    = (this as unknown as gsap.core.Tween).targets()[0] as { val: number };
          const disp = end < 10 ? v.val.toFixed(1) : Math.round(v.val).toString();
          el.textContent = prefix + disp + suffix;
        },
        scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
      });
    });
  }, []);

  const statColors = ["#00f5a0", "#00d4ff", "#a78bfa", "#f59e0b"];

  return (
    <section ref={sectionRef} style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 100px", position: "relative", zIndex: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {STATS.map((s, i) => {
          const color = statColors[i];
          return (
            <div key={s.label} className="stat-card-h" style={{
              textAlign: "center",
              background: `linear-gradient(135deg, ${color}10, ${color}04)`,
              border: `1px solid ${color}30`,
              borderRadius: 24, padding: "36px 20px 28px",
              backdropFilter: "blur(12px)",
              position: "relative", overflow: "hidden",
              cursor: "default", transformStyle: "preserve-3d",
            }}
              onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.07, boxShadow: `0 0 60px ${color}40`, duration: 0.3, ease: "power2.out" })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, boxShadow: "none", duration: 0.4, ease: "elastic.out(1,0.4)" })}
            >
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, ${color}18, transparent 70%)`, pointerEvents: "none" }} />

              {/* Corner sparks */}
              <div style={{ position: "absolute", top: 10, left: 10, width: 20, height: 20, opacity: 0.6 }}>
                <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: 10, background: color, transform: "translateX(-50%)", borderRadius: 1 }} />
                <div style={{ position: "absolute", top: "50%", left: 0, width: 10, height: 1, background: color, transform: "translateY(-50%)", borderRadius: 1 }} />
              </div>
              <div style={{ position: "absolute", bottom: 10, right: 10, width: 20, height: 20, opacity: 0.6 }}>
                <div style={{ position: "absolute", bottom: 0, left: "50%", width: 1, height: 10, background: color, transform: "translateX(-50%)", borderRadius: 1 }} />
                <div style={{ position: "absolute", top: "50%", right: 0, width: 10, height: 1, background: color, transform: "translateY(-50%)", borderRadius: 1 }} />
              </div>

              <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
                <div className="stat-ring" style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: 80, height: 80, border: `1px dashed ${color}44`,
                  borderRadius: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none",
                }}>
                  <div style={{ position: "absolute", top: -3, left: "50%", width: 6, height: 6, borderRadius: "50%", background: color, transform: "translateX(-50%)", boxShadow: `0 0 8px ${color}` }} />
                </div>
                <div className="stat-value-anim" data-value={s.value} style={{
                  fontSize: 48, fontWeight: 900, fontFamily: "'Rajdhani', sans-serif",
                  background: `linear-gradient(135deg, ${color}, #ffffff)`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  letterSpacing: -1, lineHeight: 1, display: "block", padding: "12px 0",
                }}>{s.value}</div>
              </div>

              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>{s.label}</div>

              <div style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, borderRadius: 2 }} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── CHANGE 3: Testimonials — horizontal marquee with alternating tilts ──────
function TestimonialsMarquee() {
  const trackRef   = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const allCards   = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];

  useGSAP(() => {
    if (!trackRef.current || !sectionRef.current) return;
    const cardW  = 320 + 20;
    const totalW = cardW * TESTIMONIALS.length;

    gsap.fromTo(trackRef.current, { x: 0 }, {
      x: -totalW, duration: 38, ease: "none", repeat: -1,
      modifiers: { x: gsap.utils.unitize((x) => parseFloat(x) % -totalW) },
    });

    // Pause on hover of any card
    const cards = trackRef.current.querySelectorAll(".tcard");
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => gsap.globalTimeline.pause());
      card.addEventListener("mouseleave", () => gsap.globalTimeline.resume());
    });

    gsap.fromTo(sectionRef.current,
      { autoAlpha: 0, y: 40 },
      { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 85%" } }
    );
  }, []);

  const TILT_DEGS = [-5, 4, -3, 5, -4, 3, -5, 4];

  return (
    <section ref={sectionRef} style={{ padding: "0 0 120px", position: "relative", zIndex: 10, overflow: "hidden" }}>
      <FloatingOrb color="#f59e0b" size={300} top="20%" left="80%" delay={1} />
      <SectionTitle
        eyebrow="Casos de éxito"
        title="Los que ya están en el futuro"
        subtitle="Empresas reales. Resultados reales. No hay marcha atrás."
      />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(90deg, #020412, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(270deg, #020412, transparent)", pointerEvents: "none" }} />

        <div style={{ overflow: "hidden", padding: "32px 0" }}>
          <div ref={trackRef} style={{ display: "flex", gap: 20, width: "max-content" }}>
            {allCards.map((t, i) => {
              const tiltDeg = TILT_DEGS[i % TILT_DEGS.length];
              return (
                <div key={i} className="tcard" style={{
                  width: 320, flexShrink: 0,
                  background: "linear-gradient(135deg, #0d1b2a, #0a1628)",
                  border: "1px solid #ffffff14",
                  borderRadius: 24, padding: "26px 24px",
                  position: "relative", overflow: "hidden",
                  transform: `rotate(${tiltDeg}deg)`,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "default",
                }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = "rotate(0deg) scale(1.05)";
                    el.style.boxShadow = "0 24px 60px #00f5a033, 0 0 0 1px #00f5a033";
                    el.style.zIndex = "5";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = `rotate(${tiltDeg}deg)`;
                    el.style.boxShadow = "none";
                    el.style.zIndex = "1";
                  }}
                >
                  <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, #00f5a011, transparent)", pointerEvents: "none" }} />
                  <div style={{ fontSize: 28, color: "#00f5a0", marginBottom: 12, lineHeight: 1 }}>"</div>
                  <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.7, margin: "0 0 14px" }}>{t.text}</p>
                  <div style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, #00f5a022, #00d4ff11)",
                    border: "1px solid #00f5a044",
                    borderRadius: 30, padding: "4px 12px",
                    fontSize: 12, fontWeight: 700, color: "#00f5a0", marginBottom: 14,
                  }}>{t.revenue}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #ffffff08", paddingTop: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "linear-gradient(135deg, #00f5a0, #00d4ff)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#020412", flexShrink: 0,
                    }}>{t.avatar}</div>
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>{t.role} · {t.company}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Use Case Card ────────────────────────────────────────────────────────────
function UseCaseCard({ uc, index }: { uc: UseCase; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { autoAlpha: 0, x: index % 2 === 0 ? -40 : 40 },
      { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out", delay: (index % 3) * 0.1,
        scrollTrigger: { trigger: ref.current, start: "top 88%" } }
    );
  }, [index]);
  return (
    <div ref={ref} style={{
      background: "linear-gradient(135deg, #0d1b2a, #080f1e)",
      border: `1px solid ${uc.color}33`,
      borderRadius: 20, padding: 24, cursor: "default", position: "relative", overflow: "hidden",
    }}
      onMouseEnter={(e) => gsap.to(e.currentTarget, { y: -4, scale: 1.02, duration: 0.3, ease: "power2.out" })}
      onMouseLeave={(e) => gsap.to(e.currentTarget, { y: 0,  scale: 1,    duration: 0.3, ease: "power2.out" })}
    >
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${uc.color}18, transparent)` }} />
      <div style={{ fontSize: 32, marginBottom: 12 }}>{uc.icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", marginBottom: 6, fontFamily: "'Rajdhani', sans-serif", letterSpacing: 0.5 }}>{uc.industry}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: uc.color, marginBottom: 10, fontFamily: "'Rajdhani', sans-serif" }}>{uc.metric}</div>
      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{uc.desc}</p>
    </div>
  );
}

// ─── Trust Bar ────────────────────────────────────────────────────────────────
function TrustBar() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current.querySelectorAll(".trust-item"),
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 85%" } }
    );
  }, []);
  const items = [
    { icon: "🔒", label: "Seguridad SSL 256-bit" }, { icon: "⚡", label: "Uptime 99.99%" },
    { icon: "🤖", label: "IA GPT-4 Turbo" },        { icon: "🌍", label: "+40 países activos" },
    { icon: "📊", label: "+500M mensajes procesados" }, { icon: "🏆", label: "#1 en LATAM" },
  ];
  return (
    <div ref={ref} style={{
      background: "linear-gradient(135deg, #ffffff06, #ffffff02)",
      border: "1px solid #ffffff0f",
      borderRadius: 20, padding: "20px 32px",
      display: "flex", flexWrap: "wrap", gap: 24,
      alignItems: "center", justifyContent: "center",
    }}>
      {items.map((item) => (
        <div key={item.label} className="trust-item" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500, letterSpacing: 0.3 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 85%" } });
    tl.fromTo(ref.current.querySelector(".eyebrow"),    { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5 })
      .fromTo(ref.current.querySelector(".main-title"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.2")
      .fromTo(ref.current.querySelector(".subtitle"),   { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.3");
  }, []);
  return (
    <div ref={ref} style={{ textAlign: "center", marginBottom: 60 }}>
      <div className="eyebrow" style={{
        display: "inline-block",
        background: "linear-gradient(135deg, #00f5a022, #00d4ff11)",
        border: "1px solid #00f5a044", borderRadius: 30, padding: "6px 20px",
        fontSize: 12, fontWeight: 700, color: "#00f5a0", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16,
      }}>{eyebrow}</div>
      <h2 className="main-title" style={{
        fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, margin: "0 0 16px",
        fontFamily: "'Rajdhani', sans-serif", letterSpacing: -0.5,
        background: "linear-gradient(135deg, #fff 40%, #94a3b8)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>{title}</h2>
      {subtitle && <p className="subtitle" style={{ color: "#64748b", fontSize: 17, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>{subtitle}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FastBotLanding() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroBadgeRef = useRef<HTMLDivElement>(null);
  const heroSubRef   = useRef<HTMLParagraphElement>(null);
  const heroCtaRef   = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(heroBadgeRef.current, { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0, duration: 0.6 })
      .fromTo(heroTitleRef.current, { autoAlpha: 0, y: 60, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1 }, "-=0.2")
      .fromTo(heroSubRef.current,   { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.5")
      .fromTo(heroCtaRef.current,   { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.3");
    gsap.to(".hero-glow", { scale: 1.15, autoAlpha: 0.7, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;700;900&family=Sora:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #020412; color: #e2e8f0; font-family: 'Sora', sans-serif; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020412; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(#00f5a0, #00d4ff); border-radius: 4px; }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.85); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .glow-btn { position:relative; overflow:hidden; transition:transform 0.2s, box-shadow 0.2s; }
        .glow-btn::before { content:''; position:absolute; inset:-2px; background:linear-gradient(135deg, #00f5a0,#00d4ff,#7c3aed,#00f5a0); background-size:300%; border-radius:inherit; z-index:-1; animation:spin 4s linear infinite; filter:blur(6px); }
        .glow-btn:hover { transform:scale(1.04); box-shadow:0 0 40px #00f5a066; }
        .grid-lines { background-image: linear-gradient(rgba(0,245,160,0.04) 1px, transparent 1px), linear-gradient(90deg,rgba(0,245,160,0.04) 1px,transparent 1px); background-size:60px 60px; }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .wa-demo-row { flex-direction: column !important; }
          .wa-demo-text { max-width: 100% !important; }
        }
      `}</style>

      <StarField />

      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />

      {/* ── HERO ── */}
      <section ref={heroRef} className="grid-lines" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 60px", position: "relative", zIndex: 10 }}>
        <FloatingOrb color="#00f5a0" size={400} top="-10%" left="-8%"  delay={0}   />
        <FloatingOrb color="#00d4ff" size={320} top="20%"  left="75%"  delay={1}   />
        <FloatingOrb color="#7c3aed" size={260} top="65%"  left="5%"   delay={2}   />
        <FloatingOrb color="#f59e0b" size={200} top="70%"  left="80%"  delay={0.5} />
        <div className="hero-glow" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #00f5a018 0%, transparent 70%)", pointerEvents: "none" }} />

        <div ref={heroBadgeRef} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #00f5a018, #00d4ff11)", border: "1px solid #00f5a044", borderRadius: 40, padding: "8px 20px", marginBottom: 28 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00f5a0", animation: "pulse 1.5s infinite", display: "inline-block" }} />
          <span style={{ color: "#00f5a0", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Sistema activo · Vendiendo ahora mismo</span>
        </div>

        <h1 ref={heroTitleRef} style={{ fontSize: "clamp(44px, 8vw, 100px)", fontWeight: 900, margin: "0 0 12px", fontFamily: "'Rajdhani', sans-serif", letterSpacing: -2, lineHeight: 0.95 }}>
          <span style={{ background: "linear-gradient(135deg, #00f5a0 0%, #00d4ff 50%, #7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FAST</span>
          <span style={{ color: "#fff" }}>BOT</span>
          <br />
          <span style={{ fontSize: "clamp(22px, 3.5vw, 46px)", fontWeight: 400, letterSpacing: 4, background: "linear-gradient(135deg, #fff 40%, #64748b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EL FUTURO DE LAS VENTAS</span>
        </h1>

        <p ref={heroSubRef} style={{ color: "#64748b", fontSize: "clamp(15px, 2vw, 19px)", maxWidth: 680, margin: "20px auto 40px", lineHeight: 1.7, fontWeight: 300 }}>
          La primera IA diseñada exclusivamente para <strong style={{ color: "#00f5a0", fontWeight: 600 }}>cerrar ventas en automático</strong>, calificar leads, y escalar tus ingresos sin límites — las 24 horas, los 7 días. Sin humanos. Sin pausas. Sin excusas.
        </p>

        <div ref={heroCtaRef} style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/dashboard" className="glow-btn" style={{ display: "inline-block", background: "linear-gradient(135deg, #00f5a0, #00d4ff)", border: "none", borderRadius: 50, padding: "16px 36px", fontSize: 16, fontWeight: 700, color: "#020412", cursor: "pointer", letterSpacing: 0.5, fontFamily: "'Rajdhani', sans-serif", textDecoration: "none" }}>
            ACTIVAR FASTBOT AHORA ⚡
          </Link>
          <button style={{ background: "transparent", border: "1px solid #ffffff22", borderRadius: 50, padding: "16px 36px", fontSize: 16, fontWeight: 500, color: "#94a3b8", cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "border-color 0.3s, color 0.3s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#00f5a066"; (e.currentTarget as HTMLButtonElement).style.color = "#00f5a0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ffffff22"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
          >Ver demostración →</button>
        </div>

        <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ color: "#ffffff22", fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>scroll</div>
          <div style={{ width: 24, height: 40, border: "1.5px solid #ffffff22", borderRadius: 12, display: "flex", justifyContent: "center", paddingTop: 6 }}>
            <div style={{ width: 4, height: 8, background: "#00f5a0", borderRadius: 4, animation: "bounce 1.5s infinite" }} />
          </div>
        </div>
      </section>

      {/* ── CHANGE 1: Stats horizontal ── */}
      <StatsSection />

      {/* ── CHANGE 2: WhatsApp demo side-by-side ── */}
      <section style={{ padding: "0 24px 120px", position: "relative", zIndex: 10 }}>
        <FloatingOrb color="#00d4ff" size={350} top="10%" left="60%" delay={1.5} />
        <SectionTitle eyebrow="Demo en vivo" title="Mirá cómo FASTBOT cierra ventas" subtitle="Observá una venta real gestionada de principio a fin por nuestra IA — sin intervención humana, en tiempo real." />

        <div className="wa-demo-row" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 60 }}>
          {/* Phone — left side */}
          <div style={{ flexShrink: 0 }}>
            <WhatsAppSimulator />
          </div>

          {/* Text — right side */}
          <div className="wa-demo-text" style={{ flex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #00f5a018, transparent)", border: "1px solid #00f5a033", borderRadius: 30, padding: "6px 16px", marginBottom: 24, fontSize: 11, fontWeight: 700, color: "#00f5a0", letterSpacing: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00f5a0", animation: "pulse 1.5s infinite", display: "inline-block" }} />
              IA ACTIVA 24/7
            </div>
            <h3 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, fontFamily: "'Rajdhani', sans-serif", margin: "0 0 20px", lineHeight: 1.1, background: "linear-gradient(135deg, #fff 50%, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Cada conversación<br />es una venta cerrada
            </h3>
            <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.8, margin: "0 0 32px" }}>
              FASTBOT analiza el contexto, detecta señales de compra y aplica el mejor argumento de cierre — en menos de 3 segundos. Sin scripts rígidos. Sin errores humanos. Sin horario de cierre.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              {[{ v: "< 3s", l: "Respuesta" }, { v: "94%", l: "Tasa de cierre" }, { v: "24/7", l: "Disponible" }, { v: "0", l: "Intervención humana" }].map(({ v, l }) => (
                <div key={l} style={{ background: "linear-gradient(135deg, #00f5a010, transparent)", border: "1px solid #00f5a022", borderRadius: 16, padding: "14px 16px" }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 900, color: "#00f5a0" }}>{v}</div>
                  <div style={{ color: "#64748b", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
                </div>
              ))}
            </div>
            <Link href="/dashboard" className="glow-btn" style={{ display: "inline-block", background: "linear-gradient(135deg, #00f5a0, #00d4ff)", border: "none", borderRadius: 50, padding: "14px 32px", fontSize: 14, fontWeight: 700, color: "#020412", cursor: "pointer", letterSpacing: 0.5, fontFamily: "'Rajdhani', sans-serif", textDecoration: "none" }}>
              QUIERO ESTO EN MI NEGOCIO ⚡
            </Link> 
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 10 }}>
        <TrustBar />
      </section>

      {/* ── USE CASES ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 10 }}>
        <FloatingOrb color="#7c3aed" size={400} top="30%" left="-5%" delay={0.8} />
        <SectionTitle eyebrow="Casos de implementación" title="FASTBOT domina cada industria" subtitle="No importa tu negocio. Si tenés clientes, FASTBOT puede cerrar ventas por vos." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {USE_CASES.map((uc, i) => <UseCaseCard key={uc.industry} uc={uc} index={i} />)}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 10 }}>
        <SectionTitle eyebrow="Cómo funciona" title="Simple. Brutal. Efectivo." subtitle="FASTBOT se integra en minutos y empieza a vender el mismo día." />
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "linear-gradient(to bottom, #00f5a033, #00d4ff33, #7c3aed33)" }} />
          {([
            { num: "01", title: "Conectás tu canal",        desc: "WhatsApp, Instagram, Web. 10 minutos de setup. Sin código.",                              icon: "🔌", side: "left"  as const },
            { num: "02", title: "La IA aprende tu negocio", desc: "Cargás tu catálogo, precios y condiciones. FASTBOT lo memoriza todo.",                   icon: "🧠", side: "right" as const },
            { num: "03", title: "Los leads llegan",          desc: "Un cliente escribe. FASTBOT responde al instante, califica y avanza.",                    icon: "💬", side: "left"  as const },
            { num: "04", title: "Venta cerrada",             desc: "Propuesta, negociación, cobro. Todo automatizado. Vos solo ves el dinero entrar.",        icon: "💰", side: "right" as const },
          ]).map((step, i) => <HowItWorksStep key={i} {...step} index={i} />)}
        </div>
      </section>

      {/* ── CHANGE 3: Testimonials horizontal marquee tilted ── */}
      <TestimonialsMarquee />

      {/* ── CHANGE 4: Pricing with zoom hover ── */}
      <PricingSection />

      <FinalCTA />

      <footer style={{ borderTop: "1px solid #ffffff08", padding: "40px 24px", textAlign: "center", position: "relative", zIndex: 10 }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 900, marginBottom: 12, background: "linear-gradient(135deg, #00f5a0, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FASTBOT</div>
        <p style={{ color: "#334155", fontSize: 13, margin: "0 0 16px" }}>El sistema de ventas 100% IA que está redefiniendo el futuro del comercio.</p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {["Privacidad", "Términos", "Soporte", "API Docs", "Afiliados"].map((l) => (
            <a key={l} href="#" style={{ color: "#475569", fontSize: 13, textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#00f5a0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >{l}</a>
          ))}
        </div>
        <p style={{ color: "#1e293b", fontSize: 12, marginTop: 32 }}>© 2024 FASTBOT · Todos los derechos reservados.</p>
      </footer>
    </>
  );
}

// ─── How It Works Step ────────────────────────────────────────────────────────
function HowItWorksStep({ num, title, desc, icon, side, index }: { num: string; title: string; desc: string; icon: string; side: "left" | "right"; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { autoAlpha: 0, x: side === "left" ? -60 : 60 },
      { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ref.current, start: "top 85%" } });
  }, [side]);
  return (
    <div ref={ref} style={{ display: "flex", justifyContent: side === "left" ? "flex-end" : "flex-start", paddingRight: side === "left" ? "calc(50% + 32px)" : 0, paddingLeft: side === "right" ? "calc(50% + 32px)" : 0, marginBottom: 48 }}>
      <div style={{ background: "linear-gradient(135deg, #0d1b2a, #080f1e)", border: "1px solid #00f5a022", borderRadius: 20, padding: "24px 28px", maxWidth: 360, position: "relative" }}>
        <div style={{ position: "absolute", [side === "left" ? "right" : "left"]: -44, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #00f5a0, #00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#020412", boxShadow: "0 0 20px #00f5a066" }}>{icon}</div>
        <div style={{ fontSize: 11, color: "#00f5a0", fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>{num}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, fontFamily: "'Rajdhani', sans-serif" }}>{title}</div>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

// ─── CHANGE 4: Pricing — zoom on hover ───────────────────────────────────────
function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const plans = [
    { name: "STARTER",    price: "$97",    period: "/mes", color: "#00f5a0", features: ["1 canal WhatsApp", "5.000 conversaciones/mes", "Catálogo hasta 500 productos", "Reportes básicos", "Soporte por email"],                                                         popular: false },
    { name: "SCALE",      price: "$297",   period: "/mes", color: "#00d4ff", features: ["3 canales (WA + IG + Web)", "Conversaciones ilimitadas", "Catálogo ilimitado", "IA con memoria de cliente", "Dashboard en tiempo real", "Soporte prioritario 24/7"], popular: true  },
    { name: "ENTERPRISE", price: "Custom", period: "",     color: "#7c3aed", features: ["Canales ilimitados", "IA entrenada a medida", "Integración CRM/ERP", "Manager dedicado", "SLA 99.99%", "On-premise disponible"],                                                  popular: false },
  ];

  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current.querySelectorAll(".price-card"),
      { autoAlpha: 0, y: 60, scale: 0.9 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.15, ease: "back.out(1.4)",
        scrollTrigger: { trigger: ref.current, start: "top 80%" } }
    );
  }, []);

  return (
    <section ref={ref} style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 120px", position: "relative", zIndex: 10 }}>
      <SectionTitle eyebrow="Planes" title="Invertí en resultados, no en herramientas" subtitle="Cada plan incluye setup gratuito y 14 días de prueba sin riesgo." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
        {plans.map((plan) => (
          <div key={plan.name} className="price-card" style={{
            background: plan.popular ? `linear-gradient(135deg, ${plan.color}18, ${plan.color}08)` : "linear-gradient(135deg, #0d1b2a, #080f1e)",
            border: `1px solid ${plan.color}${plan.popular ? "66" : "22"}`,
            borderRadius: 24, padding: 32,
            position: "relative", overflow: "hidden",
            transform: plan.popular ? "scale(1.04)" : "scale(1)",
            cursor: "default",
          }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: plan.popular ? 1.13 : 1.09, boxShadow: `0 32px 80px ${plan.color}44, 0 0 0 1px ${plan.color}55`, duration: 0.4, ease: "back.out(1.6)" })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: plan.popular ? 1.04 : 1, boxShadow: "none", duration: 0.4, ease: "elastic.out(1, 0.4)" })}
          >
            {plan.popular && (
              <div style={{ position: "absolute", top: 16, right: 16, background: plan.color, color: "#020412", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 20, letterSpacing: 1.5, textTransform: "uppercase" }}>MÁS POPULAR</div>
            )}
            <div style={{ fontSize: 12, fontWeight: 800, color: plan.color, letterSpacing: 3, marginBottom: 16, fontFamily: "'Rajdhani', sans-serif" }}>{plan.name}</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: "#f1f5f9", fontFamily: "'Rajdhani', sans-serif" }}>{plan.price}</span>
              <span style={{ color: "#64748b", fontSize: 15 }}>{plan.period}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {plan.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${plan.color}22`, border: `1px solid ${plan.color}66`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: plan.color, fontSize: 10 }}>✓</span>
                  </div>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ width: "100%", background: plan.popular ? `linear-gradient(135deg, ${plan.color}, #00d4ff)` : "transparent", border: `1px solid ${plan.color}66`, borderRadius: 50, padding: "13px 0", fontSize: 14, fontWeight: 700, color: plan.popular ? "#020412" : plan.color, cursor: "pointer", fontFamily: "'Rajdhani', sans-serif", letterSpacing: 1 }}
              onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.04, duration: 0.2 })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}
            >EMPEZAR AHORA →</button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const ref      = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    if (!ref.current || !titleRef.current) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 70%" } });
    tl.fromTo(ref.current,     { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out" })
      .fromTo(titleRef.current, { autoAlpha: 0, y: 40 },      { autoAlpha: 1, y: 0,     duration: 0.7, ease: "power3.out" }, "-=0.4");
    gsap.to(".cta-orb", { scale: 1.3, autoAlpha: 0.5, duration: 4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  }, []);

  return (
    <section ref={ref} style={{ padding: "0 24px 120px", position: "relative", zIndex: 10 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", background: "linear-gradient(135deg, #0d1b2a, #080f1e)", border: "1px solid #00f5a033", borderRadius: 32, padding: "80px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="cta-orb" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #00f5a014, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-block", background: "linear-gradient(135deg, #ef444422, #f59e0b11)", border: "1px solid #ef444444", borderRadius: 30, padding: "6px 20px", fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>⚡ OFERTA LIMITADA · QUEDAN 12 LUGARES</div>
        <h2 ref={titleRef} style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, margin: "0 0 20px", fontFamily: "'Rajdhani', sans-serif", letterSpacing: -1, background: "linear-gradient(135deg, #fff 30%, #00f5a0 70%, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          El futuro de las ventas<br />llegó. ¿Estás adentro?
        </h2>
        <p style={{ color: "#64748b", fontSize: 17, maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>Cada minuto que pasa sin FASTBOT, tu competencia está cerrando ventas mientras vos dormís. Activá hoy y empezá a vender en las próximas 24 horas.</p>
<Link href="/dashboard" className="glow-btn" style={{ display: "inline-block", background: "linear-gradient(135deg, #00f5a0, #00d4ff)", border: "none", borderRadius: 50, padding: "18px 48px", fontSize: 18, fontWeight: 800, color: "#020412", cursor: "pointer", letterSpacing: 0.5, fontFamily: "'Rajdhani', sans-serif", textDecoration: "none" }}>
  QUIERO FASTBOT AHORA ⚡
</Link>        <p style={{ color: "#334155", fontSize: 13, marginTop: 20 }}>14 días gratis · Sin tarjeta de crédito · Setup en 10 minutos</p>
      </div>
    </section>
  );
}