"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── Datos ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: 200,  suffix: "+", label: "Negocios activos",       icon: "🏢" },
  { value: 50000, suffix: "+", label: "Turnos gestionados",    icon: "📅" },
  { value: 98,   suffix: "%",  label: "Clientes satisfechos",  icon: "⭐" },
  { value: 24,   suffix: "/7", label: "Disponibilidad del bot",icon: "🤖" },
];

const RUBROS = [
  { emoji: "💅", name: "Salón de belleza / Manicura", desc: "Turnos online, recordatorios y venta de productos sin atender el teléfono.",    modules: ["Turnos","Ventas","Bot WA"],    glow: "236,72,153",  },
  { emoji: "💈", name: "Peluquería / Barbería",        desc: "Agendá cortes, tintes y tratamientos. El bot confirma y recuerda solo.",         modules: ["Turnos","Bot WA","Clientes"],  glow: "139,92,246",  },
  { emoji: "🏥", name: "Consultorio médico",           desc: "Recordatorios automáticos, historial de pacientes y turnos las 24hs.",           modules: ["Turnos","Pacientes","Bot WA"], glow: "59,130,246",  },
  { emoji: "⚽", name: "Cancha de fútbol",              desc: "Reservas de canchas, kiosco integrado y pagos — todo desde WhatsApp.",          modules: ["Turnos","Ventas","Bot WA"],    glow: "34,197,94",   },
  { emoji: "🛒", name: "Kiosco / Comercio",             desc: "Vendé por WhatsApp las 24hs. Control de stock y pedidos automatizados.",        modules: ["Ventas","Inventario","Bot WA"], glow: "249,115,22",  },
  { emoji: "🔧", name: "Servicio técnico",              desc: "Seguimiento de reparaciones y avisos automáticos al cliente por WhatsApp.",     modules: ["Reparaciones","Clientes","Bot WA"], glow: "234,179,8",  },
  { emoji: "🏋️", name: "Gimnasio / CrossFit",          desc: "Clases, membresías y reservas gestionadas por el bot sin secretaria.",          modules: ["Turnos","Membresías","Bot WA"],     glow: "239,68,68",   },
  { emoji: "🐾", name: "Veterinaria",                   desc: "Turnos para baño, vacunas y consultas. El bot recuerda los controles.",          modules: ["Turnos","Clientes","Bot WA"],       glow: "20,184,166",  },
  { emoji: "🍽️", name: "Restaurante / Delivery",        desc: "Tomá pedidos y reservas de mesa por WhatsApp las 24hs automáticamente.",        modules: ["Ventas","Reservas","Bot WA"],       glow: "245,158,11",  },
  { emoji: "🎓", name: "Centro educativo / Clases",     desc: "Inscripciones, pagos y consultas de alumnos atendidos por el bot.",             modules: ["Turnos","Alumnos","Bot WA"],        glow: "16,185,129",  },
];

const STEPS = [
  { icon: "🏁", num: "01", title: "Registrate",  desc: "Elegís tu rubro y en 2 minutos tenés tu cuenta configurada.", color: "99,102,241" },
  { icon: "⚙️", num: "02", title: "Configurá",   desc: "Horarios de atención, servicios y el mensaje de bienvenida del bot.", color: "139,92,246" },
  { icon: "🤖", num: "03", title: "Listo",        desc: "El bot de WhatsApp trabaja solo, 24 horas los 7 días.", color: "34,197,94" },
];

const TESTIMONIOS = [
  { name: "Marcos Delgado",     role: "Barbería El Filo — Buenos Aires", avatar: "MD", color: "139,92,246", stars: 5, text: "Increíble. Antes perdía turnos por no contestar el teléfono. Ahora el bot responde a las 3am y mis clientes quedan felices. Subí un 40% las reservas en el primer mes." },
  { name: "Dra. Laura Méndez",  role: "Consultorio médico — Córdoba",    avatar: "LM", color: "59,130,246",  stars: 5, text: "Mis pacientes ya no llaman para preguntar horarios. El bot maneja todo y yo llego al consultorio con la agenda completa. Un cambio total." },
  { name: "Gonzalo Pereyra",    role: "Canchas Los Amigos — Rosario",    avatar: "GP", color: "34,197,94",   stars: 5, text: "Tengo 4 canchas y antes era un caos manejar las reservas. FlashBot las organiza todas y hasta manda recordatorios. No lo cambio por nada." },
  { name: "Valeria Torres",     role: "Nails & Estética — Mendoza",      avatar: "VT", color: "236,72,153",  stars: 5, text: "Mis clientas sacan turno y piden esmaltes por WhatsApp a las 2am y el bot les responde perfecto. Las ventas de productos subieron un 60% desde que lo activamos." },
  { name: "Rodrigo Casas",      role: "Kiosco y bar — Santa Fe",         avatar: "RC", color: "234,179,8",   stars: 5, text: "Usamos el módulo de ventas para los pedidos del bar y el de turnos para eventos. Todo integrado con WhatsApp. La gente lo adopta al toque." },
  { name: "Florencia Ibáñez",   role: "Clínica dental — CABA",           avatar: "FI", color: "99,102,241",  stars: 5, text: "La automatización de recordatorios bajó los ausentes a cero. Antes perdíamos un turno por día. Ahora el bot confirma 24hs antes y el problema se acabó." },
  { name: "Sebastián Núñez",    role: "Taller mecánico — La Plata",      avatar: "SN", color: "139,92,246",  stars: 5, text: "Mis clientes preguntan por el estado de sus autos y el bot responde con la info actualizada. Parece magia pero es pura automatización." },
  { name: "Carolina Giménez",   role: "Spa & Wellness — Mar del Plata",  avatar: "CG", color: "34,197,94",   stars: 5, text: "Implementamos FlashBot en un fin de semana. El lunes ya teníamos turnos reservados por el bot. La inversión se pagó sola en la primera semana." },
];

const PLANS = [
  { name: "Gratis",   price: "$0",   period: "/mes", desc: "Para empezar sin riesgo",           features: ["1 usuario","50 turnos/mes","Bot WhatsApp básico","Panel de control","Soporte por email"],                                              cta: "Empezar gratis",           href: "/register", popular: false },
  { name: "Pro",      price: "$15",  period: "/mes", desc: "Para negocios en crecimiento",      features: ["3 usuarios","Turnos ilimitados","Todos los módulos","Bot con IA avanzada","Soporte prioritario","Recordatorios automáticos"],         cta: "Empezar prueba gratis",    href: "/register", popular: true  },
  { name: "Business", price: "Custom", period: "",   desc: "Para cadenas y franquicias",        features: ["Usuarios ilimitados","Multi-sucursal","API dedicada","Onboarding personalizado","SLA garantizado","Reportes avanzados"],               cta: "Contactar ventas",         href: "#",         popular: false },
];

const CONVERSATIONS = [
  {
    business: "Nails & Beauty Studio", emoji: "💅",
    color: "236,72,153", accent: "#ec4899",
    tag: "Salón de belleza — Turnos + Ventas",
    messages: [
      { from: "user", text: "Quiero esmaltes semipermanentes, tienen stock?" },
      { from: "bot",  text: "¡Hola! 💅 Sí, tenemos OPI, Essie y Shellac. ¿Qué color buscás?" },
      { from: "user", text: "Algo rojo oscuro o bordo" },
      { from: "bot",  text: "Tenemos *OPI Malaga Wine* y *Essie Bordeaux*. Ambos $3.800. ¿Cuántos llevás?" },
      { from: "user", text: "Los 2, y también quiero sacar turno" },
      { from: "bot",  text: "✅ Anotados los 2 esmaltes ($7.600). Tengo turno el sábado 10:30. ¿Lo confirmo?" },
    ],
  },
  {
    business: "Pizzería Don Pepito", emoji: "🍕",
    color: "249,115,22", accent: "#f97316",
    tag: "Restaurante — Pedidos y Delivery",
    messages: [
      { from: "user", text: "Hola, hacen delivery?" },
      { from: "bot",  text: "¡Hola! 🍕 Sí, delivery hasta las 23hs. ¿Querés ver el menú?" },
      { from: "user", text: "Sí mandame" },
      { from: "bot",  text: "Acá el menú 👆 ¿Qué querés pedir?" },
      { from: "user", text: "2 pizzas muzzarella y una napolitana" },
      { from: "bot",  text: "✅ Pedido tomado: 3 pizzas ($8.700). ¿Efectivo o transferencia? Llega en 35 min 🛵" },
    ],
  },
  {
    business: "Kiosco El Rápido", emoji: "🛒",
    color: "234,179,8", accent: "#eab308",
    tag: "Kiosco — Ventas por WhatsApp",
    messages: [
      { from: "user", text: "Tienen cigarrillos Marlboro y Red Bull?" },
      { from: "bot",  text: "¡Hola! 🛒 Sí, tenemos Marlboro rojo ($2.100) y Red Bull 250ml ($1.800)." },
      { from: "user", text: "Dame 2 atados y 3 red bull. Hago delivery?" },
      { from: "bot",  text: "Claro, delivery sin cargo en radio de 5 cuadras. Total: $9.600. ¿Dirección?" },
      { from: "user", text: "Rivadavia 1423" },
      { from: "bot",  text: "✅ Pedido confirmado. Sale en 10 minutos. Podés pagar al repartidor 🏍️" },
    ],
  },
  {
    business: "Gym Force", emoji: "🏋️",
    color: "239,68,68", accent: "#ef4444",
    tag: "Gimnasio — Membresías y Clases",
    messages: [
      { from: "user", text: "Cuánto sale la membresía mensual?" },
      { from: "bot",  text: "¡Hola! 💪 Mensual $18.000 con acceso ilimitado. Clases grupales incluidas." },
      { from: "user", text: "Hay clases de spinning mañana?" },
      { from: "bot",  text: "Sí, spinning mañana a las 7:00 y 19:00 hs con el Prof. Lucas. ¿Te anoto?" },
      { from: "user", text: "Sí a las 19 y quiero inscribirme al gym" },
      { from: "bot",  text: "✅ Clase reservada a las 19hs. Para la membresía pasá hoy con DNI y abonás $18.000 🔥" },
    ],
  },
  {
    business: "Taller Rápido Fix", emoji: "🔧",
    color: "20,184,166", accent: "#14b8a6",
    tag: "Servicio técnico — Seguimiento",
    messages: [
      { from: "user", text: "Dejé mi celular ayer, cómo va la reparación?" },
      { from: "bot",  text: "Hola 👋 Tu reparación está *En proceso*. Pantalla Samsung A54 en cambio." },
      { from: "user", text: "Para cuándo estaría?" },
      { from: "bot",  text: "Estimamos para hoy a las 17:00 hs. Te avisamos cuando esté listo 🔧" },
      { from: "user", text: "Perfecto. Cuánto va a salir?" },
      { from: "bot",  text: "El presupuesto aprobado es $22.000. Podés pagar en local o por transferencia ✅" },
    ],
  },
];

// ── Hook: contador animado ───────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

// ── Componente stat individual ───────────────────────────────────────────────
function StatCard({ stat, animate }: { stat: typeof STATS[0]; animate: boolean }) {
  const count = useCounter(stat.value, 1600, animate);
  return (
    <div style={{ textAlign: "center", padding: "32px 24px", position: "relative" }}>
      <div style={{ fontSize: "0.9rem", marginBottom: "8px" }}>{stat.icon}</div>
      <div style={{
        fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900,
        background: "linear-gradient(135deg, #f8fafc, #818cf8)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        letterSpacing: "-0.03em", lineHeight: 1,
      }}>
        {count.toLocaleString("es-AR")}{stat.suffix}
      </div>
      <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "6px", fontWeight: 500 }}>{stat.label}</div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled]           = useState(false);
  const [statsVisible, setStatsVisible]   = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // Scroll navbar
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);


  // Observer para stats
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ── CSS global ────────────────────────────────────────────────────────────
  const css = `
    @keyframes float       { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-12px)} }
    @keyframes glow-pulse  { 0%,100%{opacity:.5} 50%{opacity:1} }
    @keyframes fade-up     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scan-line   { 0%{top:-10%} 100%{top:110%} }
    @keyframes marquee     { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes blink       { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes circuit-glow{ 0%,100%{stroke-opacity:.15} 50%{stroke-opacity:.5} }
    @keyframes ping        { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
    @keyframes shimmer     { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes rotate-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes typing      { 0%,60%,100%{opacity:.3;transform:scale(.8)} 30%{opacity:1;transform:scale(1)} }

    .float        { animation: float 4s ease-in-out infinite; }
    .glow-pulse   { animation: glow-pulse 3s ease-in-out infinite; }
    .fade-up      { animation: fade-up .5s ease forwards; }
    .marquee-track{ animation: marquee 35s linear infinite; }
    .marquee-track:hover { animation-play-state: paused; }
    .dot1 { animation: typing 1.2s ease-in-out infinite 0s; }
    .dot2 { animation: typing 1.2s ease-in-out infinite .2s; }
    .dot3 { animation: typing 1.2s ease-in-out infinite .4s; }

    .gradient-text {
      background: linear-gradient(135deg, #f8fafc 0%, #c4b5fd 45%, #818cf8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .gradient-text-green {
      background: linear-gradient(135deg, #f8fafc 0%, #86efac 50%, #22c55e 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .shimmer-text {
      background: linear-gradient(90deg, #94a3b8 0%, #f8fafc 40%, #818cf8 60%, #94a3b8 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: shimmer 4s linear infinite;
    }
    .grid-bg {
      background-image:
        linear-gradient(rgba(99,102,241,.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,.07) 1px, transparent 1px);
      background-size: 60px 60px;
    }
    .grid-bg-dense {
      background-image:
        linear-gradient(rgba(99,102,241,.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,.05) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    .scan-line {
      position: absolute; left: 0; right: 0; height: 2px; pointer-events: none;
      background: linear-gradient(90deg, transparent, rgba(99,102,241,.6), rgba(34,197,94,.4), transparent);
      animation: scan-line 6s linear infinite;
      box-shadow: 0 0 12px rgba(99,102,241,.4);
    }
    .node-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(99,102,241,.8);
      position: absolute;
      box-shadow: 0 0 8px rgba(99,102,241,.6);
    }
    .node-dot::after {
      content:''; position:absolute; inset:-4px; border-radius:50%;
      border:1px solid rgba(99,102,241,.4);
      animation: ping 2s ease-out infinite;
    }
    .card-holo {
      transition: all .3s ease;
      position: relative; overflow: hidden;
    }
    .card-holo::before {
      content:''; position:absolute; inset:0;
      background: linear-gradient(135deg, rgba(255,255,255,.03) 0%, transparent 50%, rgba(255,255,255,.03) 100%);
      pointer-events: none;
    }
    .card-holo:hover { transform: translateY(-6px); }
    .trust-badge {
      display:inline-flex; align-items:center; gap:8px;
      padding:8px 16px; border-radius:100px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.09);
      font-size:.82rem; color:#94a3b8; font-weight:500;
      transition: all .2s;
    }
    .trust-badge:hover { background:rgba(255,255,255,.07); border-color:rgba(255,255,255,.15); color:#f8fafc; }
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{ background: "#080810", color: "#f8fafc", fontFamily: "var(--font-geist-sans,sans-serif)", minHeight: "100vh", overflowX: "hidden" }}>

        {/* ── NAVBAR ───────────────────────────────────────────────── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "0 clamp(1rem,4vw,2.5rem)", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "all .3s",
          background: scrolled ? "rgba(8,8,16,.9)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(99,102,241,.15)" : "none",
          boxShadow: scrolled ? "0 1px 30px rgba(0,0,0,.4)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#22c55e)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
              boxShadow: "0 0 16px rgba(99,102,241,.4)",
            }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-.02em" }}>
              Flash<span style={{ color: "#818cf8" }}>Bot</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: "1.8rem" }}>
            {[["Rubros","rubros"],["Cómo funciona","como"],["Testimonios","testimonios"],["Precios","precios"]].map(([l,id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{
                background: "none", border: "none", color: "#64748b",
                cursor: "pointer", fontSize: ".88rem", fontWeight: 500,
                transition: "color .2s", padding: 0,
              }}
                onMouseEnter={e=>(e.currentTarget.style.color="#f8fafc")}
                onMouseLeave={e=>(e.currentTarget.style.color="#64748b")}>{l}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/login" style={{
              padding: "7px 16px", borderRadius: 8, fontSize: ".85rem", fontWeight: 500,
              color: "#94a3b8", background: "transparent",
              border: "1px solid rgba(255,255,255,.09)", textDecoration: "none",
              transition: "all .2s",
            }}>Iniciar sesión</Link>
            <Link href="/register" style={{
              padding: "7px 18px", borderRadius: 8, fontSize: ".85rem", fontWeight: 700,
              color: "#fff", background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(99,102,241,.35)",
            }}>Empezar gratis</Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="grid-bg" style={{ position: "relative", overflow: "hidden",
          minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 80 }}>

          {/* Scan line */}
          <div className="scan-line" />

          {/* Nodos del circuito */}
          {[[8,15],[92,20],[5,70],[95,60],[50,90]].map(([x,y],i) => (
            <div key={i} className="node-dot" style={{ left:`${x}%`, top:`${y}%`, animationDelay:`${i*.7}s` }} />
          ))}

          {/* Radial glows */}
          <div className="glow-pulse" style={{ position:"absolute",top:"-15%",left:"-8%",width:700,height:700,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 65%)",pointerEvents:"none" }} />
          <div className="glow-pulse" style={{ position:"absolute",bottom:"-20%",right:"-8%",width:800,height:800,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(34,197,94,.1) 0%,transparent 65%)",pointerEvents:"none",animationDelay:"1.8s" }} />
          <div style={{ position:"absolute",top:"35%",left:"38%",width:500,height:500,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 65%)",pointerEvents:"none" }} />

          {/* SVG circuit lines decorativos */}
          <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:.4 }} xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="30%" x2="20%" y2="30%" stroke="rgba(99,102,241,.3)" strokeWidth="1">
              <animate attributeName="stroke-opacity" values=".1;.5;.1" dur="4s" repeatCount="indefinite" />
            </line>
            <line x1="80%" y1="70%" x2="100%" y2="70%" stroke="rgba(34,197,94,.3)" strokeWidth="1">
              <animate attributeName="stroke-opacity" values=".1;.5;.1" dur="3s" repeatCount="indefinite" begin="1s"/>
            </line>
            <line x1="15%" y1="0" x2="15%" y2="25%" stroke="rgba(99,102,241,.2)" strokeWidth="1"/>
            <line x1="85%" y1="75%" x2="85%" y2="100%" stroke="rgba(34,197,94,.2)" strokeWidth="1"/>
            <circle cx="15%" cy="30%" r="4" fill="rgba(99,102,241,.6)">
              <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="85%" cy="70%" r="4" fill="rgba(34,197,94,.6)">
              <animate attributeName="r" values="3;5;3" dur="2.5s" repeatCount="indefinite" begin=".5s"/>
            </circle>
          </svg>

          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(1rem,4vw,2rem)",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem",
            alignItems: "center", width: "100%" }}>

            {/* Texto */}
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 14px", borderRadius: 100,
                background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.3)",
                fontSize: ".78rem", color: "#a5b4fc", marginBottom: "1.25rem", fontWeight: 600,
                letterSpacing: ".05em",
              }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#6366f1",
                  boxShadow:"0 0 8px #6366f1",display:"inline-block" }} />
                POWERED BY IA · AUTOMATIZACIÓN INTELIGENTE
              </div>

              <h1 style={{ fontSize:"clamp(2.4rem,5vw,3.7rem)", fontWeight:900,
                lineHeight:1.05, marginBottom:"1.1rem", letterSpacing:"-.03em" }}>
                <span className="gradient-text">Turnos, ventas<br />y clientes, solos</span>
              </h1>

              <p style={{ fontSize:"1.1rem", color:"#64748b", lineHeight:1.75,
                marginBottom:"1.5rem", maxWidth:460 }}>
                Bot de WhatsApp con IA para <strong style={{color:"#94a3b8"}}>peluquerías, salones de belleza, manicuras, consultorios, canchas</strong> y más.
                Agenda turnos, vende productos y atiende clientes las{" "}
                <strong style={{color:"#94a3b8"}}>24 horas</strong>, solo.
              </p>

              {/* Mini stats inline */}
              <div style={{ display:"flex",gap:24,marginBottom:"2rem",flexWrap:"wrap" }}>
                {[["📅","Turnos automáticos"],["🛒","Ventas 24/7"],["💬","Bot con IA"]].map(([icon,label])=>(
                  <div key={label} style={{ display:"flex",alignItems:"center",gap:6,fontSize:".82rem",color:"#64748b" }}>
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:"2.5rem" }}>
                <Link href="/register" style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"13px 28px", borderRadius:10, fontWeight:700, fontSize:"1rem",
                  textDecoration:"none", color:"#fff",
                  background:"linear-gradient(135deg,#22c55e,#16a34a)",
                  boxShadow:"0 0 30px rgba(34,197,94,.35)", transition:"all .2s",
                }}>Empezar gratis →</Link>
                <button onClick={() => scrollTo("como")} style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"13px 28px", borderRadius:10, fontWeight:600, fontSize:"1rem",
                  cursor:"pointer", background:"rgba(255,255,255,.04)",
                  border:"1px solid rgba(255,255,255,.1)", color:"#94a3b8", transition:"all .2s",
                }}>Ver cómo funciona</button>
              </div>

              {/* Trust badges */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {["🔒 Sin contrato","⚡ Listo en 2 minutos","🇦🇷 Soporte en español","✅ Gratis para empezar"].map(b => (
                  <span key={b} className="trust-badge">{b}</span>
                ))}
              </div>
            </div>

            {/* Mockup chat rotante */}
            <ChatMockup />
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────── */}
        <section ref={statsRef} className="grid-bg-dense" style={{
          borderTop:"1px solid rgba(99,102,241,.12)",
          borderBottom:"1px solid rgba(99,102,241,.12)",
          background:"rgba(99,102,241,.04)",
          position:"relative", overflow:"hidden",
        }}>
          <div className="scan-line" style={{ animationDelay:"3s" }} />
          <div style={{ maxWidth:1000, margin:"0 auto",
            display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
            {STATS.map((s,i) => (
              <div key={i} style={{
                position:"relative",
                borderRight: i < 3 ? "1px solid rgba(99,102,241,.12)" : "none",
              }}>
                <StatCard stat={s} animate={statsVisible} />
              </div>
            ))}
          </div>
        </section>

        {/* ── RUBROS ───────────────────────────────────────────────── */}
        <section id="rubros" className="grid-bg" style={{ padding:"100px clamp(1rem,4vw,2rem)", position:"relative", overflow:"hidden" }}>
          <div className="scan-line" style={{ animationDelay:"1s" }} />

          {/* Glow central */}
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            width:600,height:600,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(99,102,241,.06) 0%,transparent 70%)",
            pointerEvents:"none" }} />

          <div style={{ maxWidth:1200, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:56 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,
                padding:"5px 14px",borderRadius:100,
                background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.25)",
                fontSize:".78rem",color:"#a5b4fc",marginBottom:14,fontWeight:600,letterSpacing:".05em" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#6366f1",display:"inline-block" }} />
                MULTI-RUBRO
              </div>
              <h2 style={{ fontSize:"clamp(1.8rem,3.5vw,2.7rem)",fontWeight:800,
                letterSpacing:"-.03em",marginBottom:14 }}>
                Para cualquier tipo de negocio
              </h2>
              <p style={{ color:"#64748b",fontSize:"1rem",maxWidth:480,margin:"0 auto" }}>
                Elegís tu rubro y el sistema se configura automáticamente con los módulos que necesitás.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:16 }}>
              {RUBROS.map(r => (
                <div key={r.name} className="card-holo" style={{
                  padding:"28px 22px", borderRadius:20,
                  background:"rgba(255,255,255,.02)",
                  border:`1px solid rgba(${r.glow},.2)`,
                }}
                  onMouseEnter={e=>{
                    (e.currentTarget as HTMLDivElement).style.background=`rgba(${r.glow},.06)`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow=`0 0 40px rgba(${r.glow},.25)`;
                    (e.currentTarget as HTMLDivElement).style.borderColor=`rgba(${r.glow},.45)`;
                  }}
                  onMouseLeave={e=>{
                    (e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.02)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow="none";
                    (e.currentTarget as HTMLDivElement).style.borderColor=`rgba(${r.glow},.2)`;
                  }}>
                  <div style={{ fontSize:"2.2rem",marginBottom:12 }}>{r.emoji}</div>
                  <h3 style={{ fontWeight:700,fontSize:".95rem",marginBottom:8 }}>{r.name}</h3>
                  <p style={{ color:"#4b5563",fontSize:".8rem",lineHeight:1.6,marginBottom:14 }}>{r.desc}</p>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                    {r.modules.map(m=>(
                      <span key={m} style={{
                        padding:"2px 9px",borderRadius:100,fontSize:".7rem",fontWeight:600,
                        background:`rgba(${r.glow},.1)`,color:`rgba(${r.glow === "234,179,8" ? "253,224,71" : r.glow === "249,115,22" ? "253,186,116" : r.glow},.9)`,
                        border:`1px solid rgba(${r.glow},.2)`,
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ────────────────────────────────────────── */}
        <section id="como" className="grid-bg-dense" style={{
          padding:"100px clamp(1rem,4vw,2rem)",
          background:"rgba(139,92,246,.04)",
          borderTop:"1px solid rgba(139,92,246,.12)",
          borderBottom:"1px solid rgba(139,92,246,.12)",
          position:"relative", overflow:"hidden",
        }}>
          <div className="scan-line" style={{ animationDelay:"2s" }} />
          <div style={{ maxWidth:900, margin:"0 auto" }}>
            <div style={{ textAlign:"center",marginBottom:64 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,
                padding:"5px 14px",borderRadius:100,
                background:"rgba(139,92,246,.1)",border:"1px solid rgba(139,92,246,.25)",
                fontSize:".78rem",color:"#c4b5fd",marginBottom:14,fontWeight:600,letterSpacing:".05em" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#8b5cf6",display:"inline-block" }} />
                PROCESO
              </div>
              <h2 style={{ fontSize:"clamp(1.8rem,3.5vw,2.7rem)",fontWeight:800,letterSpacing:"-.03em" }}>
                En 3 pasos, automatizás todo
              </h2>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,position:"relative" }}>
              {/* Línea conectora */}
              <div style={{
                position:"absolute",top:44,left:"18%",right:"18%",height:1,
                background:"linear-gradient(90deg,rgba(99,102,241,.5),rgba(139,92,246,.5),rgba(34,197,94,.5))",
              }}>
                <div style={{ position:"absolute",left:"30%",top:-3,width:7,height:7,borderRadius:"50%",background:"#8b5cf6" }} />
              </div>

              {STEPS.map((s,i) => (
                <div key={s.num} style={{ textAlign:"center",padding:"0 20px",position:"relative" }}>
                  <div style={{
                    width:80,height:80,borderRadius:"50%",margin:"0 auto 20px",
                    background:`rgba(${s.color},.1)`,
                    border:`1px solid rgba(${s.color},.35)`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"1.9rem",position:"relative",zIndex:1,
                    boxShadow:`0 0 24px rgba(${s.color},.2)`,
                  }}>
                    {s.icon}
                    {/* Anillo externo */}
                    <div style={{
                      position:"absolute",inset:-8,borderRadius:"50%",
                      border:`1px dashed rgba(${s.color},.3)`,
                      animation:"rotate-slow 12s linear infinite",
                    }} />
                  </div>
                  <div style={{ fontSize:".72rem",fontWeight:700,color:"#334155",letterSpacing:".1em",marginBottom:6 }}>
                    PASO {s.num}
                  </div>
                  <h3 style={{ fontSize:"1.25rem",fontWeight:700,marginBottom:10 }}>{s.title}</h3>
                  <p style={{ color:"#64748b",fontSize:".86rem",lineHeight:1.7 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIOS ──────────────────────────────────────────── */}
        <section id="testimonios" className="grid-bg" style={{
          padding:"100px 0", position:"relative", overflow:"hidden" }}>
          <div className="scan-line" />

          {/* Glows */}
          <div style={{ position:"absolute",top:"50%",left:0,transform:"translateY(-50%)",
            width:300,height:600,
            background:"linear-gradient(90deg,rgba(8,8,16,1),transparent)",zIndex:2,pointerEvents:"none" }} />
          <div style={{ position:"absolute",top:"50%",right:0,transform:"translateY(-50%)",
            width:300,height:600,
            background:"linear-gradient(270deg,rgba(8,8,16,1),transparent)",zIndex:2,pointerEvents:"none" }} />

          <div style={{ textAlign:"center",marginBottom:56,padding:"0 clamp(1rem,4vw,2rem)" }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,
              padding:"5px 14px",borderRadius:100,
              background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",
              fontSize:".78rem",color:"#86efac",marginBottom:14,fontWeight:600,letterSpacing:".05em" }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block" }} />
              TESTIMONIOS REALES
            </div>
            <h2 style={{ fontSize:"clamp(1.8rem,3.5vw,2.7rem)",fontWeight:800,letterSpacing:"-.03em",marginBottom:14 }}>
              Lo que dicen nuestros clientes
            </h2>
            <p style={{ color:"#64748b",fontSize:"1rem",maxWidth:460,margin:"0 auto" }}>
              Más de 200 negocios ya automatizaron su atención con FlashBot.
            </p>
          </div>

          {/* Carrusel infinito — fila 1 */}
          <div style={{ overflow:"hidden", marginBottom:16 }}>
            <div className="marquee-track" style={{ display:"flex", gap:16, width:"max-content" }}>
              {[...TESTIMONIOS, ...TESTIMONIOS].map((t,i) => (
                <TestimonioCard key={i} t={t} />
              ))}
            </div>
          </div>

          {/* Carrusel infinito — fila 2 (inversa) */}
          <div style={{ overflow:"hidden" }}>
            <div className="marquee-track" style={{ display:"flex", gap:16, width:"max-content",
              animationDirection:"reverse", animationDuration:"45s" }}>
              {[...TESTIMONIOS.slice().reverse(), ...TESTIMONIOS.slice().reverse()].map((t,i) => (
                <TestimonioCard key={i} t={t} />
              ))}
            </div>
          </div>
        </section>

        {/* ── PRECIOS ──────────────────────────────────────────────── */}
        <section id="precios" className="grid-bg-dense" style={{
          padding:"100px clamp(1rem,4vw,2rem)",
          background:"rgba(99,102,241,.04)",
          borderTop:"1px solid rgba(99,102,241,.12)",
          position:"relative", overflow:"hidden",
        }}>
          <div className="scan-line" style={{ animationDelay:"4s" }} />
          <div style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ textAlign:"center",marginBottom:56 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,
                padding:"5px 14px",borderRadius:100,
                background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.25)",
                fontSize:".78rem",color:"#a5b4fc",marginBottom:14,fontWeight:600,letterSpacing:".05em" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#6366f1",display:"inline-block" }} />
                PLANES
              </div>
              <h2 style={{ fontSize:"clamp(1.8rem,3.5vw,2.7rem)",fontWeight:800,letterSpacing:"-.03em",marginBottom:14 }}>
                Simple y transparente
              </h2>
              <p style={{ color:"#64748b",fontSize:"1rem" }}>
                Sin costos ocultos. Podés cambiar de plan cuando quieras.
              </p>
            </div>

            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:24,alignItems:"start" }}>
              {PLANS.map(plan => (
                <div key={plan.name} className="card-holo" style={{
                  padding:"32px 28px", borderRadius:24, position:"relative", overflow:"hidden",
                  background: plan.popular ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.02)",
                  border: plan.popular ? "1px solid rgba(99,102,241,.45)" : "1px solid rgba(255,255,255,.07)",
                  boxShadow: plan.popular ? "0 0 60px rgba(99,102,241,.18)" : "none",
                  transform: plan.popular ? "scale(1.03)" : "scale(1)",
                }}>
                  {plan.popular && (
                    <>
                      {/* Top gradient bar */}
                      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,
                        background:"linear-gradient(90deg,#6366f1,#818cf8,#22c55e)" }} />
                      <div style={{ position:"absolute",top:14,right:14,
                        background:"linear-gradient(135deg,#6366f1,#818cf8)",
                        padding:"3px 10px",borderRadius:100,fontSize:".7rem",fontWeight:700,color:"#fff" }}>
                        ⭐ Más popular
                      </div>
                    </>
                  )}

                  <div style={{ fontSize:".95rem",fontWeight:600,color:"#64748b",marginBottom:6 }}>{plan.name}</div>
                  <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:6 }}>
                    <span style={{
                      fontSize:"2.6rem",fontWeight:900,letterSpacing:"-.03em",
                      ...(plan.popular ? {
                        background:"linear-gradient(135deg,#818cf8,#22c55e)",
                        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                      } : {}),
                    }}>{plan.price}</span>
                    {plan.period && <span style={{ color:"#475569",fontSize:".88rem" }}>{plan.period}</span>}
                  </div>
                  <p style={{ color:"#475569",fontSize:".82rem",marginBottom:24 }}>{plan.desc}</p>

                  <Link href={plan.href} style={{
                    display:"block",textAlign:"center",padding:"11px",borderRadius:10,
                    fontWeight:700,fontSize:".88rem",textDecoration:"none",marginBottom:24,
                    background: plan.popular
                      ? "linear-gradient(135deg,#6366f1,#818cf8)"
                      : "rgba(255,255,255,.06)",
                    color:"#fff",
                    border: plan.popular ? "none" : "1px solid rgba(255,255,255,.1)",
                    boxShadow: plan.popular ? "0 0 20px rgba(99,102,241,.3)" : "none",
                    transition:"opacity .2s",
                  }}>
                    {plan.cta}
                  </Link>

                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display:"flex",alignItems:"center",gap:10,
                        fontSize:".83rem",color:"#64748b" }}>
                        <span style={{ color:"#22c55e",fontWeight:700,fontSize:".85rem" }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ────────────────────────────────────────────── */}
        <section className="grid-bg" style={{
          padding:"120px clamp(1rem,4vw,2rem)", textAlign:"center",
          position:"relative", overflow:"hidden",
          borderTop:"1px solid rgba(99,102,241,.1)",
        }}>
          <div className="scan-line" style={{ animationDelay:"5s" }} />
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            width:600,height:400,borderRadius:"50%",
            background:"radial-gradient(ellipse,rgba(99,102,241,.12) 0%,transparent 70%)",
            pointerEvents:"none" }} />

          <div style={{ maxWidth:560,margin:"0 auto",position:"relative",zIndex:1 }}>
            <div style={{ fontSize:"3.5rem",marginBottom:20 }}>🚀</div>
            <h2 style={{ fontSize:"clamp(1.8rem,3.5vw,2.7rem)",fontWeight:800,
              letterSpacing:"-.03em",marginBottom:16 }}>
              ¿Listo para automatizar?
            </h2>
            <p style={{ color:"#64748b",fontSize:"1rem",marginBottom:32 }}>
              Creá tu cuenta gratis en 2 minutos. Sin tarjeta de crédito.
            </p>
            <Link href="/register" style={{
              display:"inline-flex",alignItems:"center",gap:8,
              padding:"15px 36px",borderRadius:12,fontWeight:700,fontSize:"1rem",
              textDecoration:"none",color:"#fff",
              background:"linear-gradient(135deg,#22c55e,#16a34a)",
              boxShadow:"0 0 40px rgba(34,197,94,.35)",
              transition:"all .2s",
            }}>Empezar gratis →</Link>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <footer className="grid-bg-dense" style={{
          padding:"36px clamp(1rem,4vw,2rem)",
          borderTop:"1px solid rgba(99,102,241,.1)",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          flexWrap:"wrap",gap:16,
        }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:8,
              background:"linear-gradient(135deg,#6366f1,#22c55e)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
              boxShadow:"0 0 12px rgba(99,102,241,.35)" }}>⚡</div>
            <span style={{ fontWeight:800,fontSize:".95rem" }}>
              Flash<span style={{ color:"#818cf8" }}>Bot</span>
            </span>
            <span style={{ color:"#1e293b",fontSize:".82rem" }}>© 2026</span>
          </div>
          <div style={{ display:"flex",gap:24,fontSize:".82rem" }}>
            {["Términos","Privacidad","Contacto"].map(l=>(
              <a key={l} href="#" style={{ color:"#334155",textDecoration:"none",transition:"color .2s" }}
                onMouseEnter={e=>((e.currentTarget as HTMLAnchorElement).style.color="#94a3b8")}
                onMouseLeave={e=>((e.currentTarget as HTMLAnchorElement).style.color="#334155")}>{l}</a>
            ))}
          </div>
        </footer>

      </div>
    </>
  );
}

// ── Chat Mockup rotante ──────────────────────────────────────────────────────
function ChatMockup() {
  const [convIdx, setConvIdx]       = useState(0);
  const [visibleMsgs, setVisibleMsgs] = useState(0);
  const [isTyping, setIsTyping]     = useState(false);
  const [fading, setFading]         = useState(false);

  const conv = CONVERSATIONS[convIdx];
  const msgs = conv.messages;

  // Avanzar un mensaje cada vez
  useEffect(() => {
    // Si ya mostramos todos, esperar 2.5s y rotar
    if (visibleMsgs >= msgs.length) {
      const t = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setConvIdx(i => (i + 1) % CONVERSATIONS.length);
          setVisibleMsgs(0);
          setIsTyping(false);
          setFading(false);
        }, 500);
      }, 2500);
      return () => clearTimeout(t);
    }

    const next = msgs[visibleMsgs];
    if (!next) return;

    if (next.from === "bot") {
      // Mostrar typing 900ms antes de revelar el mensaje
      setIsTyping(true);
      const t = setTimeout(() => {
        setIsTyping(false);
        setVisibleMsgs(v => v + 1);
      }, 900);
      return () => clearTimeout(t);
    } else {
      // Mensaje de usuario: aparece más rápido
      const t = setTimeout(() => setVisibleMsgs(v => v + 1), 700);
      return () => clearTimeout(t);
    }
  }, [visibleMsgs, msgs, convIdx]);

  return (
    <div className="float" style={{ position:"relative", display:"flex", justifyContent:"center" }}>
      {/* Halo dinámico según rubro */}
      <div style={{ position:"absolute", inset:-20, borderRadius:40,
        background:`radial-gradient(circle,rgba(${conv.color},.12) 0%,transparent 70%)`,
        pointerEvents:"none", transition:"background 1s ease" }} />

      <div style={{
        width:"min(340px,90vw)", borderRadius:24,
        background:"rgba(255,255,255,.04)",
        border:`1px solid rgba(${conv.color},.25)`,
        backdropFilter:"blur(24px)",
        boxShadow:`0 40px 80px rgba(0,0,0,.6),0 0 60px rgba(${conv.color},.18),inset 0 1px 0 rgba(255,255,255,.08)`,
        overflow:"hidden",
        transition:"border-color .8s, box-shadow .8s",
        opacity: fading ? 0 : 1,
        transform: fading ? "scale(.97) translateY(8px)" : "scale(1) translateY(0)",
        transitionProperty:"opacity,transform,border-color,box-shadow",
        transitionDuration:".5s",
      }}>
        {/* Barra top con color del rubro */}
        <div style={{ height:3, background:`linear-gradient(90deg,${conv.accent},rgba(${conv.color},.4))`,
          transition:"background 1s" }} />

        {/* Tag de rubro */}
        <div style={{ padding:"6px 16px", background:`rgba(${conv.color},.08)`,
          borderBottom:`1px solid rgba(${conv.color},.1)`,
          display:"flex", justifyContent:"center" }}>
          <span style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".06em",
            color:`rgba(${conv.color},1)`, textTransform:"uppercase" }}>
            {conv.tag}
          </span>
        </div>

        {/* Header chat */}
        <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12,
          background:`rgba(${conv.color},.06)`, borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <div style={{ width:38,height:38,borderRadius:"50%",flexShrink:0,
            background:`linear-gradient(135deg,${conv.accent},rgba(${conv.color},.5))`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
            boxShadow:`0 0 14px rgba(${conv.color},.5)`,
            transition:"background .8s, box-shadow .8s" }}>{conv.emoji}</div>
          <div>
            <div style={{ fontWeight:700,fontSize:".88rem" }}>{conv.business}</div>
            <div style={{ fontSize:".7rem",display:"flex",alignItems:"center",gap:4,
              color:conv.accent }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:conv.accent,
                boxShadow:`0 0 6px ${conv.accent}`,display:"inline-block" }} />
              Bot IA activo
            </div>
          </div>
          {/* Indicador de conversación */}
          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            {CONVERSATIONS.map((_,i) => (
              <div key={i} style={{ width: i===convIdx ? 16 : 5, height:5, borderRadius:10,
                background: i===convIdx ? conv.accent : "rgba(255,255,255,.15)",
                transition:"all .4s ease" }} />
            ))}
          </div>
        </div>

        {/* Área de mensajes */}
        <div style={{ padding:"14px 12px", display:"flex", flexDirection:"column",
          gap:8, height:290, overflowY:"hidden", justifyContent:"flex-end" }}>
          {msgs.slice(0, visibleMsgs).map((msg, i) => (
            <div key={`${convIdx}-${i}`} style={{
              display:"flex", justifyContent:msg.from==="user"?"flex-end":"flex-start",
              animation:"fade-up .35s ease forwards",
            }}>
              <div style={{
                maxWidth:"83%", padding:"7px 12px",
                borderRadius:msg.from==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",
                fontSize:".78rem", lineHeight:1.55,
                background:msg.from==="user"
                  ?`linear-gradient(135deg,${conv.accent},rgba(${conv.color},.7))`
                  :"rgba(255,255,255,.07)",
                color:"#f1f5f9",
                boxShadow: msg.from==="user" ? `0 0 14px rgba(${conv.color},.3)` : "0 2px 8px rgba(0,0,0,.3)",
                transition:"background .8s",
              }}>{msg.text.replace(/\*(.*?)\*/g,"$1")}</div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display:"flex", animation:"fade-up .3s ease forwards" }}>
              <div style={{ padding:"10px 14px", borderRadius:"4px 16px 16px 16px",
                background:"rgba(255,255,255,.07)", display:"flex", gap:5, alignItems:"center",
                boxShadow:`0 0 10px rgba(${conv.color},.15)` }}>
                {[0,1,2].map(j=>(
                  <div key={j} className={`dot${j+1}`} style={{ width:7,height:7,borderRadius:"50%",
                    background:conv.accent, opacity:.7 }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badge flotante */}
      <div style={{
        position:"absolute", bottom:-8, right:-8,
        background:`rgba(${conv.color},.15)`, border:`1px solid rgba(${conv.color},.35)`,
        borderRadius:12, padding:"7px 13px", fontSize:".75rem",
        color:conv.accent, fontWeight:600,
        backdropFilter:"blur(12px)", transition:"all .8s",
      }}>🤖 Respondido en 2s</div>
    </div>
  );
}

// ── Card de testimonio ───────────────────────────────────────────────────────
function TestimonioCard({ t }: { t: typeof TESTIMONIOS[0] }) {
  return (
    <div style={{
      width: 320, flexShrink: 0, padding: "24px",
      borderRadius: 20, position: "relative",
      background: "rgba(255,255,255,.03)",
      border: `1px solid rgba(${t.color},.2)`,
      backdropFilter: "blur(12px)",
      transition: "all .3s",
    }}
      onMouseEnter={e=>{
        (e.currentTarget as HTMLDivElement).style.background=`rgba(${t.color},.06)`;
        (e.currentTarget as HTMLDivElement).style.boxShadow=`0 0 30px rgba(${t.color},.2)`;
        (e.currentTarget as HTMLDivElement).style.borderColor=`rgba(${t.color},.4)`;
      }}
      onMouseLeave={e=>{
        (e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.03)";
        (e.currentTarget as HTMLDivElement).style.boxShadow="none";
        (e.currentTarget as HTMLDivElement).style.borderColor=`rgba(${t.color},.2)`;
      }}>

      {/* Comillas decorativas */}
      <div style={{ fontSize:"2rem",color:`rgba(${t.color},.3)`,lineHeight:1,marginBottom:4,fontFamily:"serif" }}>"</div>

      <p style={{ fontSize:".83rem",color:"#94a3b8",lineHeight:1.7,marginBottom:18 }}>{t.text}</p>

      {/* Estrellas */}
      <div style={{ display:"flex",gap:2,marginBottom:14 }}>
        {Array(t.stars).fill(0).map((_,i)=>(
          <span key={i} style={{ color:"#fbbf24",fontSize:".85rem" }}>★</span>
        ))}
      </div>

      {/* Autor */}
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <div style={{
          width:38,height:38,borderRadius:"50%",flexShrink:0,
          background:`linear-gradient(135deg,rgba(${t.color},.6),rgba(${t.color},.2))`,
          border:`1px solid rgba(${t.color},.4)`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:".78rem",fontWeight:800,color:"#fff",
          boxShadow:`0 0 12px rgba(${t.color},.3)`,
        }}>{t.avatar}</div>
        <div>
          <div style={{ fontSize:".85rem",fontWeight:700 }}>{t.name}</div>
          <div style={{ fontSize:".73rem",color:"#475569" }}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}
