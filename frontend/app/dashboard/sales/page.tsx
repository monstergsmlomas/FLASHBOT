"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ShoppingCart, Plus, Trash2, X, Package, TrendingUp, Receipt,
  Wallet, Search, ArrowUpRight, ArrowDownRight, BarChart2,
  User, ChevronDown, ChevronRight, CheckCircle, CreditCard,
  Banknote, Smartphone, Minus, Scan
} from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

type Product = { id: string; name: string; price: number; stock: number; category?: string; barcode?: string };
type SaleItem = { productId?: string; name: string; price: number; quantity: number };
type Sale = { id: string; total: number; createdAt: string; items: { name: string; price: number; quantity: number; total: number }[] };

// ── Shared style atoms ────────────────────────────────────────────────────────
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

const METHOD_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote size={12} />,
  tarjeta:  <CreditCard size={12} />,
  digital:  <Smartphone size={12} />,
};

export default function SalesPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [sales, setSales]         = useState<Sale[]>([]);
  const [totalDay, setTotalDay]   = useState(0);
  const [cart, setCart]           = useState<SaleItem[]>([]);
  const [manualName, setManualName]   = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [saving, setSaving]       = useState(false);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"caja" | "cuentas">("caja");
  const [showSaleDrawer, setShowSaleDrawer] = useState(false);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [searchSales, setSearchSales] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const loadData = async () => {
    const [prodRes, salesRes] = await Promise.all([
      api.get("/products").catch(() => ({ data: [] })),
      api.get("/sales").catch(() => ({ data: { sales: [], total: 0 } })),
    ]);
    setProducts(prodRes.data);
    setSales(salesRes.data.sales ?? []);
    setTotalDay(salesRes.data.total ?? 0);
  };

  useEffect(() => { loadData(); }, []);

  // Scanner: detectó un código de barra → buscar producto y agregar al carrito
  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    const res = await api.get(`/products/barcode/${barcode}`).catch(() => null);
    if (res?.data) {
      addToCart(res.data);
      setShowSaleDrawer(true); // abrir drawer para confirmar
    } else {
      alert(`Producto con código ${barcode} no encontrado.\nAgregoalo primero desde Inventario.`);
    }
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const addManual = () => {
    if (!manualName.trim() || !manualPrice) return;
    setCart(prev => [...prev, { name: manualName.trim(), price: parseFloat(manualPrice), quantity: 1 }]);
    setManualName(""); setManualPrice("");
  };

  const changeQty = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const confirmSale = async () => {
    if (!cart.length) return;
    setSaving(true);
    try {
      await api.post("/sales", { items: cart });
      setCart([]);
      setShowSaleDrawer(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async (id: string) => {
    await api.delete(`/sales/${id}`);
    await loadData();
  };

  const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const categories = Array.from(new Set(products.map(p => p.category ?? "General")));

  const filteredSales = sales.filter(s =>
    searchSales === "" ||
    s.items.some(i => i.name.toLowerCase().includes(searchSales.toLowerCase())) ||
    fmt(s.total).includes(searchSales)
  );

  const totalGastos = 0; // placeholder until expense endpoint exists
  const balanceNeto = totalDay - totalGastos;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "inherit" }} className="px-4 md:px-7 py-8 pb-24">

      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "-10%", right: "0", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-5%", left: "-5%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(59,130,246,0.2)" }}>
              <Wallet size={20} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                Finanzas
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#475569" }}>Ventas, gastos y cuentas corrientes del negocio.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setShowGastoModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(239,68,68,0.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <ArrowDownRight size={14} /> Registrar Gasto
            </button>
            <button
              onClick={() => setShowScanner(true)}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 16px", height: "40px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
            >
              <Scan size={14} /> Escanear
            </button>
            <button
              onClick={() => setShowSaleDrawer(true)}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "1px solid rgba(59,130,246,0.5)", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px rgba(59,130,246,0.3)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(59,130,246,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(59,130,246,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Plus size={14} /> Nueva Venta
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0", marginBottom: "28px", borderBottom: "1px solid rgba(255,255,255,0.07)", width: "fit-content" }}>
          {(["caja", "cuentas"] as const).map(tab => {
            const isActive = activeTab === tab;
            const labels = { caja: "Caja Diaria", cuentas: "Cuentas Corrientes" };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ padding: "10px 20px", fontSize: "13px", fontWeight: isActive ? 700 : 500, color: isActive ? "white" : "#475569", background: "none", border: "none", cursor: "pointer", borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent", marginBottom: "-1px", transition: "all 0.2s", position: "relative" }}
              >
                {isActive && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(59,130,246,0.06)", borderRadius: "8px 8px 0 0" }} />
                )}
                <span style={{ position: "relative" }}>{labels[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════ CAJA DIARIA ══════════════════════════════ */}
        {activeTab === "caja" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">

              {/* Ingresos */}
              <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(34,197,94,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(34,197,94,0.8), transparent)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ingresos Hoy</span>
                  <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowUpRight size={13} color="#22c55e" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl truncate" style={{ fontWeight: 800, color: "#22c55e", lineHeight: 1, textShadow: "0 0 20px rgba(34,197,94,0.4)" }}>{fmt(totalDay)}</div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>{sales.length} transacciones cobradas</p>
              </div>

              {/* Gastos */}
              <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(239,68,68,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(239,68,68,0.8), transparent)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gastos Hoy</span>
                  <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowDownRight size={13} color="#ef4444" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl truncate" style={{ fontWeight: 800, color: "#f87171", lineHeight: 1, textShadow: "0 0 20px rgba(239,68,68,0.3)" }}>{fmt(totalGastos)}</div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>0 egresos registrados</p>
              </div>

              {/* Balance */}
              <div className="min-w-0 overflow-hidden col-span-2 md:col-span-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(59,130,246,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(59,130,246,0.8), transparent)" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Balance Neto</span>
                  <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BarChart2 size={13} color="#3b82f6" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl truncate" style={{ fontWeight: 800, color: "#60a5fa", lineHeight: 1, textShadow: "0 0 20px rgba(59,130,246,0.4)" }}>{fmt(balanceNeto)}</div>
                <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>ingresos menos gastos</p>
              </div>
            </div>

            {/* Movements table */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "auto" }}>

              {/* Table toolbar */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "white" }}>Movimientos del Turno Actual</h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>{sales.length} operaciones registradas</p>
                </div>
                <div style={{ position: "relative", width: "240px" }}>
                  <Search size={13} color="#475569" style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input
                    value={searchSales}
                    onChange={e => setSearchSales(e.target.value)}
                    placeholder="Buscar movimiento..."
                    style={{ ...inputStyle, height: "36px", paddingLeft: "32px", fontSize: "12px" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.4)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                </div>
              </div>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "160px 80px 1fr 120px 130px 80px", gap: "0", padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.015)" }}>
                {["Fecha", "Tipo", "Detalle", "Método", "Monto", "Acciones"].map((col, i) => (
                  <div key={i} style={{ padding: "11px 8px", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {col}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {filteredSales.length === 0 ? (
                <div style={{ padding: "64px 20px", textAlign: "center" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Search size={22} color="rgba(255,255,255,0.1)" />
                  </div>
                  <p style={{ color: "#475569", fontSize: "14px", margin: 0, fontWeight: 600 }}>No se encontraron movimientos cobrados hoy</p>
                  <p style={{ color: "#334155", fontSize: "12px", margin: "4px 0 0" }}>Usá "+ Nueva Venta" para registrar el primer movimiento</p>
                </div>
              ) : (
                filteredSales.map((sale, idx) => (
                  <div key={sale.id}>
                    <div
                      style={{ display: "grid", gridTemplateColumns: "160px 80px 1fr 120px 130px 80px", gap: "0", padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                      onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    >
                      {/* Fecha */}
                      <div style={{ padding: "14px 8px", fontSize: "13px", color: "#64748b" }}>{fmtDate(sale.createdAt)}</div>

                      {/* Tipo */}
                      <div style={{ padding: "14px 8px", display: "flex", alignItems: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Venta
                        </span>
                      </div>

                      {/* Detalle */}
                      <div style={{ padding: "14px 8px" }}>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "white" }}>
                          {sale.items.length} ítem{sale.items.length !== 1 ? "s" : ""}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569" }}>
                          {sale.items.slice(0, 2).map(i => i.name).join(", ")}{sale.items.length > 2 ? "..." : ""}
                        </p>
                      </div>

                      {/* Método */}
                      <div style={{ padding: "14px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Banknote size={13} color="#64748b" />
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Efectivo</span>
                      </div>

                      {/* Monto */}
                      <div style={{ padding: "14px 8px", display: "flex", alignItems: "center" }}>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "#22c55e" }}>{fmt(sale.total)}</span>
                      </div>

                      {/* Acciones */}
                      <div style={{ padding: "14px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ color: expandedSale === sale.id ? "#60a5fa" : "#475569", transition: "color 0.15s" }}>
                          {expandedSale === sale.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); deleteSale(sale.id); }}
                          style={{ width: "28px", height: "28px", borderRadius: "7px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#f87171"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded row */}
                    {expandedSale === sale.id && (
                      <div style={{ padding: "12px 20px 16px 188px", background: "rgba(59,130,246,0.03)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {sale.items.map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>{item.quantity}x</span>
                                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{item.name}</span>
                              </div>
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>{fmt(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Footer total */}
              {filteredSales.length > 0 && (
                <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#334155" }}>{filteredSales.length} movimientos</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "12px", color: "#475569" }}>Total del turno:</span>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: "#22c55e", textShadow: "0 0 12px rgba(34,197,94,0.3)" }}>{fmt(totalDay)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════ CUENTAS CORRIENTES ═══════════════════════ */}
        {activeTab === "cuentas" && (
          <div>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={17} color="#a78bfa" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Libreta de Cuentas Corrientes</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>Productos y reparaciones anotadas a los clientes.</p>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px 160px 120px", gap: "0", padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
                {["Cliente", "Contacto", "Tickets Pendientes", "Deuda Total", "Acción"].map((col, i) => (
                  <div key={i} style={{ padding: "12px 8px", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {col}
                  </div>
                ))}
              </div>

              {/* Empty state */}
              <div style={{ padding: "64px 20px", textAlign: "center" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <User size={22} color="rgba(255,255,255,0.1)" />
                </div>
                <p style={{ color: "#475569", fontSize: "14px", margin: 0, fontWeight: 600 }}>Sin cuentas corrientes activas</p>
                <p style={{ color: "#334155", fontSize: "12px", margin: "4px 0 0" }}>Las cuentas de clientes aparecerán aquí cuando registres ventas en fiado</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ NUEVA VENTA DRAWER ══════════════════════════════════════ */}
      {showSaleDrawer && (
        <>
          <div
            onClick={() => setShowSaleDrawer(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 40 }}
          />

          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "900px", maxWidth: "100vw", background: "#0d0d14", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.6)" }}>

            {/* Drawer header */}
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShoppingCart size={16} color="#60a5fa" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Nueva Venta</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Seleccioná productos o agregá ítems manuales</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaleDrawer(false)}
                style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer body - two columns */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 340px", overflow: "hidden" }}>

              {/* Left: product catalog */}
              <div style={{ overflowY: "auto", padding: "20px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ margin: "0 0 14px", fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>Catálogo de Productos</p>

                {products.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <Package size={32} color="rgba(255,255,255,0.08)" style={{ display: "block", margin: "0 auto 10px" }} />
                    <p style={{ color: "#475569", fontSize: "13px", margin: 0 }}>Sin productos. Cargá tu catálogo en <a href="/dashboard/inventory" style={{ color: "#60a5fa" }}>Inventario</a>.</p>
                  </div>
                ) : (
                  categories.map(cat => (
                    <div key={cat} style={{ marginBottom: "20px" }}>
                      <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>{cat}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                        {products.filter(p => (p.category ?? "General") === cat).map(p => (
                          <button
                            key={p.id}
                            onClick={() => addToCart(p)}
                            disabled={p.stock === 0}
                            style={{ padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "left", cursor: p.stock === 0 ? "not-allowed" : "pointer", opacity: p.stock === 0 ? 0.4 : 1, transition: "all 0.15s", position: "relative" }}
                            onMouseEnter={e => { if (p.stock !== 0) { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(59,130,246,0.1)"; } }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#3b82f6" }}>{fmt(p.price)}</p>
                            {p.stock >= 0 && (
                              <span style={{ position: "absolute", top: "7px", right: "7px", padding: "1px 5px", borderRadius: "4px", fontSize: "9px", fontWeight: 700, background: p.stock <= 3 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", color: p.stock <= 3 ? "#f87171" : "#475569" }}>
                                {p.stock}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Manual item */}
                <div style={{ marginTop: "8px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
                  <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ítem Rápido</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="Descripción"
                      style={{ ...inputStyle, flex: 1, height: "36px", fontSize: "12px" }}
                      onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.4)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                    <input
                      value={manualPrice}
                      onChange={e => setManualPrice(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addManual()}
                      placeholder="$"
                      type="number"
                      style={{ ...inputStyle, width: "80px", height: "36px", fontSize: "12px" }}
                      onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.4)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                    <button
                      onClick={addManual}
                      style={{ width: "36px", height: "36px", borderRadius: "9px", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.22)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.12)"; }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: cart */}
              <div style={{ display: "flex", flexDirection: "column", overflowY: "auto" }}>
                <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShoppingCart size={14} color="#60a5fa" />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>Carrito</span>
                    {cart.length > 0 && <span style={{ padding: "1px 7px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{cart.length}</span>}
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      style={{ fontSize: "11px", color: "#475569", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#475569"; }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
                  {cart.length === 0 ? (
                    <div style={{ padding: "40px 16px", textAlign: "center" }}>
                      <ShoppingCart size={28} color="rgba(255,255,255,0.07)" style={{ display: "block", margin: "0 auto 10px" }} />
                      <p style={{ color: "#334155", fontSize: "12px", margin: 0 }}>El carrito está vacío</p>
                      <p style={{ color: "#1e293b", fontSize: "11px", margin: "3px 0 0" }}>Tocá un producto para agregar</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {cart.map((item, i) => (
                        <div key={i} style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                            <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#475569" }}>{fmt(item.price)} c/u</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button onClick={() => changeQty(i, -1)} style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>-</button>
                            <span style={{ width: "20px", textAlign: "center", fontSize: "13px", fontWeight: 700, color: "white" }}>{item.quantity}</span>
                            <button onClick={() => changeQty(i, 1)} style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>+</button>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 800, color: "#22c55e", width: "60px", textAlign: "right" }}>{fmt(item.price * item.quantity)}</span>
                          <button
                            onClick={() => removeFromCart(i)}
                            style={{ width: "24px", height: "24px", borderRadius: "6px", background: "transparent", border: "none", color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "#334155"; }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart footer */}
                <div className="pb-[88px] md:pb-5" style={{ paddingTop: "16px", paddingLeft: "16px", paddingRight: "16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#64748b" }}>Total</span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: "#22c55e", textShadow: "0 0 16px rgba(34,197,94,0.4)" }}>{fmt(cartTotal)}</span>
                  </div>
                  <button
                    onClick={confirmSale}
                    disabled={saving || cart.length === 0}
                    style={{ width: "100%", height: "44px", borderRadius: "10px", background: cart.length === 0 ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #16a34a, #15803d)", border: cart.length === 0 ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(34,197,94,0.4)", color: cart.length === 0 ? "#334155" : "white", fontSize: "14px", fontWeight: 700, cursor: cart.length === 0 ? "not-allowed" : "pointer", boxShadow: cart.length > 0 ? "0 0 20px rgba(34,197,94,0.25)" : "none", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onMouseEnter={e => { if (cart.length > 0 && !saving) { e.currentTarget.style.boxShadow = "0 0 30px rgba(34,197,94,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cart.length > 0 ? "0 0 20px rgba(34,197,94,0.25)" : "none"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {saving ? (
                      "Registrando..."
                    ) : cart.length === 0 ? (
                      "Agregá productos al carrito"
                    ) : (
                      <><CheckCircle size={16} /> Confirmar — {fmt(cartTotal)}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ GASTO MODAL ═════════════════════════════════════════════ */}
      {showGastoModal && (
        <>
          <div
            onClick={() => setShowGastoModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 40 }}
          />
          <div className="w-full mx-4 max-w-md" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", zIndex: 50, boxShadow: "0 25px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ArrowDownRight size={16} color="#f87171" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Registrar Gasto</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Ingresá el egreso del día</p>
                </div>
              </div>
              <button
                onClick={() => setShowGastoModal(false)}
                style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Descripción</label>
                  <input placeholder="Ej: Compra de mercadería" style={inputStyle} onFocus={e => { e.target.style.borderColor = "rgba(239,68,68,0.4)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monto</label>
                  <input type="number" placeholder="$0" style={inputStyle} onFocus={e => { e.target.style.borderColor = "rgba(239,68,68,0.4)"; }} onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={() => setShowGastoModal(false)}
                  style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowGastoModal(false)}
                  style={{ flex: 2, height: "42px", borderRadius: "10px", background: "linear-gradient(135deg, #dc2626, #b91c1c)", border: "1px solid rgba(239,68,68,0.4)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 16px rgba(239,68,68,0.25)" }}
                >
                  Registrar Gasto
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Barcode Scanner ─────────────────────────────────────────────────── */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          title="Escanear producto"
          subtitle="Apuntá la cámara al código de barra para agregarlo al carrito"
        />
      )}
    </div>
  );
}
