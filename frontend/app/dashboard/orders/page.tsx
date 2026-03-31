"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Plus, X, ChevronDown, Clock, CheckCircle, Truck,
  Package, XCircle, ShoppingBag, MapPin, Phone, User, RefreshCw
} from "lucide-react";

type OrderItem = { id: string; name: string; price: number; quantity: number; total: number; notes?: string };
type Order = {
  id: string; number: number; customerName: string; customerPhone?: string;
  address?: string; type: "DELIVERY" | "PICKUP" | "LOCAL";
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  notes?: string; total: number; items: OrderItem[]; createdAt: string;
};
type Product = { id: string; name: string; price: number; category?: string };

const STATUS_CONFIG = {
  PENDING:   { label: "Pendiente",    color: "249,115,22",  icon: Clock },
  CONFIRMED: { label: "Confirmado",   color: "59,130,246",  icon: CheckCircle },
  PREPARING: { label: "Preparando",   color: "168,85,247",  icon: Package },
  READY:     { label: "Listo",        color: "34,197,94",   icon: CheckCircle },
  DELIVERED: { label: "Entregado",    color: "100,116,139", icon: Truck },
  CANCELLED: { label: "Cancelado",    color: "239,68,68",   icon: XCircle },
};

const TYPE_CONFIG = {
  DELIVERY: { label: "Delivery",  icon: Truck },
  PICKUP:   { label: "Retiro",    icon: ShoppingBag },
  LOCAL:    { label: "Local",     icon: MapPin },
};

const NEXT_STATUS: Record<string, string> = {
  PENDING:   "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY:     "DELIVERED",
};

const TABS = [
  { key: "ALL",      label: "Todos" },
  { key: "PENDING",  label: "Pendientes" },
  { key: "PREPARING",label: "Preparando" },
  { key: "READY",    label: "Listos" },
  { key: "DELIVERED",label: "Entregados" },
];

const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

export default function OrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [tab, setTab]             = useState("ALL");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [showNew, setShowNew]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  // Form nuevo pedido
  const [custName,  setCustName]  = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [address,   setAddress]   = useState("");
  const [type,      setType]      = useState<"DELIVERY"|"PICKUP"|"LOCAL">("DELIVERY");
  const [notes,     setNotes]     = useState("");
  const [cart,      setCart]      = useState<{ product: Product; qty: number; itemNotes: string }[]>([]);

  const load = () =>
    api.get("/orders", { params: { status: tab === "ALL" ? undefined : tab } })
       .then(r => setOrders(r.data))
       .catch(() => {});

  useEffect(() => { load(); }, [tab]);

  useEffect(() => {
    api.get("/products").then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const advanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await api.patch(`/orders/${order.id}/status`, { status: next });
    load();
  };

  const cancelOrder = async (id: string) => {
    await api.patch(`/orders/${id}/status`, { status: "CANCELLED" });
    load();
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product: p, qty: 1, itemNotes: "" }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));

  const submitOrder = async () => {
    setSaveError("");
    if (!custName.trim()) { setSaveError("El nombre del cliente es obligatorio"); return; }
    if (cart.length === 0) { setSaveError("Agregá al menos un producto"); return; }
    if (type === "DELIVERY" && !address.trim()) { setSaveError("La dirección es obligatoria para delivery"); return; }
    setSaving(true);
    try {
      await api.post("/orders", {
        customerName:  custName.trim(),
        customerPhone: custPhone.trim() || undefined,
        address:       address.trim() || undefined,
        type,
        notes:         notes.trim() || undefined,
        items: cart.map(i => ({
          productId: i.product.id,
          name:      i.product.name,
          price:     i.product.price,
          quantity:  i.qty,
          notes:     i.itemNotes || undefined,
        })),
      });
      setCustName(""); setCustPhone(""); setAddress(""); setNotes(""); setCart([]); setType("DELIVERY");
      setShowNew(false);
      load();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Error al crear el pedido");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "42px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px", padding: "0 14px", color: "white", fontSize: "13px",
    outline: "none", boxSizing: "border-box",
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "white" }}>Pedidos</h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>Gestión de pedidos y delivery</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={load} style={{ height: "38px", width: "38px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowNew(true)} style={{ height: "38px", padding: "0 16px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={15} /> Nuevo pedido
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
              background: tab === t.key ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
              borderColor: tab === t.key ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)",
              color: tab === t.key ? "#a78bfa" : "#64748b",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
          <Truck size={40} style={{ marginBottom: "12px", opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: "14px" }}>No hay pedidos en esta categoría</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {orders.map(order => {
            const sc = STATUS_CONFIG[order.status];
            const tc = TYPE_CONFIG[order.type];
            const StatusIcon = sc.icon;
            const TypeIcon = tc.icon;
            const isExpanded = expanded === order.id;
            const next = NEXT_STATUS[order.status];

            return (
              <div key={order.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                {/* Cabecera del pedido */}
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                     onClick={() => setExpanded(isExpanded ? null : order.id)}>
                  {/* Número */}
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `rgba(${sc.color},0.15)`, border: `1px solid rgba(${sc.color},0.3)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: `rgb(${sc.color})` }}>#{order.number}</span>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "white" }}>{order.customerName}</span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: `rgba(${sc.color},0.1)`, color: `rgb(${sc.color})`, display: "flex", alignItems: "center", gap: "4px" }}>
                        <StatusIcon size={10} /> {sc.label}
                      </span>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                        <TypeIcon size={10} /> {tc.label}
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                      {new Date(order.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {order.items.length} ítem{order.items.length !== 1 ? "s" : ""} · {fmt(order.total)}
                    </p>
                  </div>
                  {/* Acciones rápidas */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {next && (
                      <button onClick={e => { e.stopPropagation(); advanceStatus(order); }}
                        style={{ padding: "6px 12px", borderRadius: "8px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        → {STATUS_CONFIG[next as keyof typeof STATUS_CONFIG].label}
                      </button>
                    )}
                    <ChevronDown size={16} color="#475569" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Datos del cliente */}
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      {order.customerPhone && (
                        <span style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={12} /> {order.customerPhone}
                        </span>
                      )}
                      {order.address && (
                        <span style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} /> {order.address}
                        </span>
                      )}
                      {order.notes && (
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>📝 {order.notes}</span>
                      )}
                    </div>
                    {/* Items */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {order.items.map(item => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <span style={{ color: "#cbd5e1" }}>{item.quantity}x {item.name}{item.notes ? ` (${item.notes})` : ""}</span>
                          <span style={{ color: "#94a3b8" }}>{fmt(item.total)}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span style={{ color: "white" }}>Total</span>
                        <span style={{ color: "#a78bfa" }}>{fmt(order.total)}</span>
                      </div>
                    </div>
                    {/* Cancelar */}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button onClick={() => cancelOrder(order.id)}
                        style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "12px", cursor: "pointer" }}>
                        Cancelar pedido
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo pedido */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
             onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div style={{ width: "100%", maxWidth: "520px", background: "#0f0f1a", borderRadius: "20px 20px 0 0", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Nuevo Pedido</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>Completá los datos del pedido</p>
              </div>
              <button onClick={() => setShowNew(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Tipo */}
              <div style={{ display: "flex", gap: "8px" }}>
                {(["DELIVERY","PICKUP","LOCAL"] as const).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    style={{ flex: 1, padding: "8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
                      background: type === t ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                      borderColor: type === t ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)",
                      color: type === t ? "#a78bfa" : "#64748b",
                    }}>
                    {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>

              {/* Cliente */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Nombre *</label>
                  <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Juan García" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Teléfono</label>
                  <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="11 1234-5678" style={inputStyle} />
                </div>
              </div>

              {type === "DELIVERY" && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Dirección *</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Av. Corrientes 1234, CABA" style={inputStyle} />
                </div>
              )}

              {/* Productos */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Agregar ítems</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                  {products.map(p => (
                    <button key={p.id} onClick={() => addToCart(p)}
                      style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "white", fontSize: "12px", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontWeight: 600, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ color: "#a78bfa", fontSize: "11px" }}>{fmt(p.price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Carrito */}
              {cart.length > 0 && (
                <div style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "10px", padding: "12px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#a78bfa" }}>Pedido</p>
                  {cart.map(i => (
                    <div key={i.product.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ flex: 1, fontSize: "12px", color: "white" }}>{i.qty}x {i.product.name}</span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>{fmt(i.product.price * i.qty)}</span>
                      <button onClick={() => removeFromCart(i.product.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(124,58,237,0.2)", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
                    <span style={{ color: "white" }}>Total</span>
                    <span style={{ color: "#a78bfa" }}>{fmt(cartTotal)}</span>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Notas</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Timbre roto, tocar puerta..." style={inputStyle} />
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
                <button onClick={() => { setShowNew(false); setSaveError(""); }} style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={submitOrder} disabled={saving} style={{ flex: 2, height: "42px", borderRadius: "10px", background: saving ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Guardando..." : "Confirmar pedido"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
