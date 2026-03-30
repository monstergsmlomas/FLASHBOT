"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Package, Plus, Pencil, Check, X, Minus, AlertTriangle,
  Search, Upload, ChevronDown, DollarSign, TrendingUp, Box, Scan
} from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

type Product = { id: string; name: string; price: number; cost?: number; stock: number; category?: string; barcode?: string; isActive: boolean };

const CATEGORIES = ["Bebidas", "Comidas", "Snacks", "Otros"];

const CATEGORY_COLORS: Record<string, string> = {
  Bebidas: "59,130,246",
  Comidas: "34,197,94",
  Snacks:  "249,115,22",
  Otros:   "139,92,246",
};

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none" as const,
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing]   = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [search, setSearch]     = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<"new" | "stock">("new");

  // Nuevo producto
  const [newName, setNewName]         = useState("");
  const [newCost, setNewCost]         = useState("");
  const [newPrice, setNewPrice]       = useState("");
  const [newStock, setNewStock]       = useState("");
  const [newCategory, setNewCategory] = useState("Otros");
  const [newBarcode, setNewBarcode]   = useState("");
  const [newTrackStock, setNewTrackStock] = useState(true);

  const load = () => api.get("/products").then(r => setProducts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  // Scanner: detectó un código de barra
  const handleBarcodeScan = async (barcode: string) => {
    setShowScanner(false);
    if (scanMode === "stock") {
      // Buscar producto por barcode y sumar +1 de stock
      const res = await api.get(`/products/barcode/${barcode}`).catch(() => null);
      if (res?.data) {
        await api.patch(`/products/${res.data.id}/stock`, { delta: 1 });
        load();
      } else {
        // No existe → abrir modal para crearlo con el barcode ya cargado
        setNewBarcode(barcode);
        setShowModal(true);
      }
    } else {
      // Modo "nuevo producto": pre-llenar el campo barcode
      setNewBarcode(barcode);
      setShowModal(true);
    }
  };

  const addProduct = async () => {
    if (!newName.trim() || !newPrice) return;
    await api.post("/products", {
      name:     newName.trim(),
      price:    parseFloat(newPrice),
      cost:     newCost ? parseFloat(newCost) : 0,
      stock:    newTrackStock ? parseInt(newStock || "0") : -1,
      category: newCategory,
      barcode:  newBarcode.trim() || undefined,
    });
    setNewName(""); setNewCost(""); setNewPrice(""); setNewStock(""); setNewTrackStock(true); setNewBarcode("");
    setShowModal(false);
    load();
  };

  const saveEdit = async (id: string) => {
    await api.patch(`/products/${id}`, editData);
    setEditing(null);
    load();
  };

  const deleteProduct = async (id: string) => {
    await api.delete(`/products/${id}`);
    load();
  };

  const adjustStock = async (id: string, delta: number) => {
    await api.patch(`/products/${id}/stock`, { delta });
    load();
  };

  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const lowStock = products.filter(p => p.stock >= 0 && p.stock <= 3);
  const totalValue = products.reduce((s, p) => s + (p.price * (p.stock > 0 ? p.stock : 0)), 0);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "inherit" }} className="px-4 md:px-7 py-8 pb-24">

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-10%", left: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-5%", right: "0", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.1))", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.2)" }}>
              <Box size={20} color="#a78bfa" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                Inventario
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#475569" }}>Gestión de stock, proveedores y precios.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94a3b8"; }}
            >
              <Upload size={14} /> Importar Excel
            </button>
            <button
              onClick={() => { setScanMode("stock"); setShowScanner(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 16px", height: 38, borderRadius: 10,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
                color: "#34d399", cursor: "pointer", fontSize: 13, fontWeight: 600,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
            >
              <Scan size={14} /> Cargar stock
            </button>
            <button
              onClick={() => { setNewBarcode(""); setShowModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "1px solid rgba(124,58,237,0.5)", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px rgba(124,58,237,0.3)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(124,58,237,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(124,58,237,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Plus size={14} /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">

          {/* Card 1: Total Productos */}
          <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(59,130,246,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(59,130,246,0.8), transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Productos</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Package size={13} color="#3b82f6" />
              </div>
            </div>
            <div className="text-3xl md:text-4xl" style={{ fontWeight: 800, color: "#3b82f6", lineHeight: 1, textShadow: "0 0 20px rgba(59,130,246,0.4)" }}>{products.length}</div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>productos en catálogo</p>
          </div>

          {/* Card 2: Valor */}
          <div className="min-w-0 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(34,197,94,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(34,197,94,0.8), transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Valor del Stock</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <DollarSign size={13} color="#22c55e" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <div className="min-w-0">
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>Costo</div>
                <div className="text-lg md:text-2xl" style={{ fontWeight: 800, color: "#94a3b8", lineHeight: 1 }}>$0</div>
              </div>
              <div style={{ width: "1px", background: "rgba(255,255,255,0.06)" }} />
              <div className="min-w-0 overflow-hidden">
                <div style={{ fontSize: "10px", color: "#475569", marginBottom: "3px" }}>Venta</div>
                <div className="text-lg md:text-2xl truncate" style={{ fontWeight: 800, color: "#22c55e", lineHeight: 1, textShadow: "0 0 20px rgba(34,197,94,0.4)" }}>{fmt(totalValue)}</div>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#475569" }}>valor total en stock</p>
          </div>

          {/* Card 3: Stock Bajo */}
          <div className="min-w-0 overflow-hidden col-span-2 md:col-span-1" style={{ background: lowStock.length > 0 ? "rgba(249,115,22,0.05)" : "rgba(255,255,255,0.03)", border: lowStock.length > 0 ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "16px", position: "relative", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(249,115,22,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, rgba(249,115,22,0.8), transparent)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span className="text-[10px] md:text-xs" style={{ fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Alerta Stock Bajo</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "9px", background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={13} color="#f97316" />
              </div>
            </div>
            <div className="text-3xl md:text-4xl" style={{ fontWeight: 800, color: lowStock.length > 0 ? "#f97316" : "#475569", lineHeight: 1, textShadow: lowStock.length > 0 ? "0 0 20px rgba(249,115,22,0.4)" : "none" }}>
              {lowStock.length}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>
              {lowStock.length === 0 ? "sin alertas activas" : `producto${lowStock.length !== 1 ? "s" : ""} con stock ≤ 3`}
            </p>
          </div>
        </div>

        {/* ── Low stock banner ──────────────────────────────────────────────── */}
        {lowStock.length > 0 && (
          <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "12px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={15} color="#f97316" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#f97316" }}>Stock crítico: </span>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>{lowStock.map(p => `${p.name} (${p.stock})`).join(" · ")}</span>
          </div>
        )}

        {/* ── Search ────────────────────────────────────────────────────────── */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search size={15} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, proveedor, categoría..."
            style={{ ...inputStyle, paddingLeft: "40px", height: "44px", fontSize: "14px" }}
            onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* ── Products Table ────────────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "auto" }}>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 110px 110px 100px 100px", gap: "0", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            {["", "Producto / Detalles", "Categoría", "Costo", "Venta", "Stock", "Acciones"].map((col, i) => (
              <div key={i} style={{ padding: "12px 8px", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {col}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <Package size={40} color="rgba(255,255,255,0.08)" style={{ display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>Sin productos todavía</p>
              <p style={{ color: "#334155", fontSize: "12px", margin: "4px 0 0" }}>Usá el botón "Nuevo Producto" para comenzar</p>
            </div>
          ) : (
            filtered.map((p, idx) => {
              const catColor = CATEGORY_COLORS[p.category ?? "Otros"] ?? "139,92,246";
              const isLow = p.stock >= 0 && p.stock <= 3;
              const isEditing = editing === p.id;

              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 160px 110px 110px 100px 100px",
                    gap: "0",
                    padding: "0 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = "rgba(124,58,237,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                >
                  {/* Checkbox */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    <div
                      onClick={() => toggleRow(p.id)}
                      style={{ width: "16px", height: "16px", borderRadius: "5px", border: selectedRows.has(p.id) ? "2px solid #7c3aed" : "1.5px solid rgba(255,255,255,0.15)", background: selectedRows.has(p.id) ? "#7c3aed" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
                    >
                      {selectedRows.has(p.id) && <Check size={10} color="white" />}
                    </div>
                  </div>

                  {/* Product name */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        value={editData.name ?? ""}
                        onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                        style={{ ...inputStyle, height: "34px", fontSize: "13px", flex: 1 }}
                        onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      />
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "white" }}>{p.name}</p>
                        {!p.isActive && <span style={{ fontSize: "10px", color: "#475569" }}>Inactivo</span>}
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <select
                        value={editData.category ?? "Otros"}
                        onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                        style={{ ...selectStyle, height: "34px", width: "auto", fontSize: "12px" }}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: `rgba(${catColor},0.12)`, color: `rgb(${catColor})`, border: `1px solid rgba(${catColor},0.25)` }}>
                        {p.category ?? "Otros"}
                      </span>
                    )}
                  </div>

                  {/* Cost */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>—</span>
                  </div>

                  {/* Sale price */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        value={editData.price ?? ""}
                        onChange={e => setEditData(d => ({ ...d, price: parseFloat(e.target.value) }))}
                        type="number"
                        style={{ ...inputStyle, height: "34px", fontSize: "13px" }}
                        onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      />
                    ) : (
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>{fmt(p.price)}</span>
                    )}
                  </div>

                  {/* Stock */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px", gap: "4px" }}>
                    {p.stock >= 0 ? (
                      <>
                        <button
                          onClick={() => adjustStock(p.id, -1)}
                          style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, minWidth: "32px", textAlign: "center", background: isLow ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)", color: isLow ? "#f87171" : "white", border: isLow ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent" }}>
                          {p.stock}
                        </span>
                        <button
                          onClick={() => adjustStock(p.id, 1)}
                          style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                        >
                          <Plus size={11} />
                        </button>
                      </>
                    ) : (
                      <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>∞</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px", gap: "6px" }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(p.id)}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.22)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; }}
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditing(p.id); setEditData({ name: p.name, price: p.price, category: p.category }); }}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.12)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; e.currentTarget.style.color = "#a78bfa"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#f87171"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}
                        >
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Footer */}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#334155" }}>
                {filtered.length} de {products.length} productos
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Product Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 40 }}
          />

          {/* Drawer panel */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", maxWidth: "100vw", background: "#0d0d14", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

            {/* Drawer header */}
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="#a78bfa" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Nuevo Producto</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Completá los datos del producto</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nombre *</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ej: Coca Cola 500ml"
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Precio de costo</label>
                    <input
                      value={newCost}
                      onChange={e => setNewCost(e.target.value)}
                      type="number"
                      placeholder="$0"
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Precio de venta *</label>
                    <input
                      value={newPrice}
                      onChange={e => setNewPrice(e.target.value)}
                      type="number"
                      placeholder="$0"
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categoría</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      style={selectStyle}
                      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} color="#475569" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  </div>
                </div>

                {/* Track stock toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "white" }}>Controlar stock</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#475569" }}>Activá para llevar conteo de unidades</p>
                  </div>
                  <div
                    onClick={() => setNewTrackStock(v => !v)}
                    style={{ width: "44px", height: "24px", borderRadius: "12px", background: newTrackStock ? "#7c3aed" : "rgba(255,255,255,0.1)", position: "relative", cursor: "pointer", transition: "background 0.2s", boxShadow: newTrackStock ? "0 0 12px rgba(124,58,237,0.4)" : "none", flexShrink: 0 }}
                  >
                    <div style={{ position: "absolute", top: "3px", left: newTrackStock ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>

                {newTrackStock && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stock inicial</label>
                    <input
                      value={newStock}
                      onChange={e => setNewStock(e.target.value)}
                      type="number"
                      placeholder="0"
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                )}

                {/* Código de barra */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Código de barra</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={newBarcode}
                      onChange={e => setNewBarcode(e.target.value)}
                      placeholder="EAN-13, UPC..."
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                    />
                    <button
                      onClick={() => { setScanMode("new"); setShowScanner(true); }}
                      style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
                        color: "#34d399", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="Escanear con cámara"
                    >
                      <Scan size={16} />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Drawer footer */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                Cancelar
              </button>
              <button
                onClick={addProduct}
                style={{ flex: 2, height: "42px", borderRadius: "10px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "1px solid rgba(124,58,237,0.5)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 0 20px rgba(124,58,237,0.3)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(124,58,237,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(124,58,237,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <Plus size={15} /> Agregar Producto
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Barcode Scanner ─────────────────────────────────────────────────── */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          title={scanMode === "stock" ? "Cargar stock" : "Escanear producto"}
          subtitle={scanMode === "stock"
            ? "Escaneá el producto para sumar +1 de stock automáticamente"
            : "Escaneá para pre-cargar el código de barra"
          }
        />
      )}
    </div>
  );
}
