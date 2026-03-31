"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, X, Pencil, Check, ChevronDown, UtensilsCrossed } from "lucide-react";

type Product = { id: string; name: string; price: number; cost?: number; category?: string; isActive: boolean };

const CATEGORIES = ["Entradas", "Platos principales", "Postres", "Bebidas", "Extras", "Combos"];

const CAT_COLORS: Record<string, string> = {
  "Entradas":          "249,115,22",
  "Platos principales":"124,58,237",
  "Postres":           "236,72,153",
  "Bebidas":           "59,130,246",
  "Extras":            "34,197,94",
  "Combos":            "234,179,8",
};

const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;

const inputStyle: React.CSSProperties = {
  width: "100%", height: "42px",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px", padding: "0 14px", color: "white", fontSize: "13px",
  outline: "none", boxSizing: "border-box",
};

export default function MenuPage() {
  const [items, setItems]       = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");

  const [newName,     setNewName]     = useState("");
  const [newPrice,    setNewPrice]    = useState("");
  const [newCost,     setNewCost]     = useState("");
  const [newCategory, setNewCategory] = useState("Platos principales");

  const load = () => api.get("/products").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const addItem = async () => {
    setSaveError("");
    if (!newName.trim()) { setSaveError("El nombre es obligatorio"); return; }
    if (!newPrice)       { setSaveError("El precio es obligatorio"); return; }
    setSaving(true);
    try {
      await api.post("/products", {
        name:     newName.trim(),
        price:    parseFloat(newPrice),
        cost:     newCost ? parseFloat(newCost) : 0,
        stock:    -1, // sin control de stock para menú
        category: newCategory,
      });
      setNewName(""); setNewPrice(""); setNewCost(""); setNewCategory("Platos principales");
      setShowModal(false);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setSaveError(Array.isArray(msg) ? msg.join(", ") : msg || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    await api.patch(`/products/${id}`, editData);
    setEditing(null);
    load();
  };

  const toggleActive = async (item: Product) => {
    await api.patch(`/products/${item.id}`, { isActive: !item.isActive });
    load();
  };

  // Agrupar por categoría
  const grouped = CATEGORIES.reduce<Record<string, Product[]>>((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});
  const uncategorized = items.filter(i => !i.category || !CATEGORIES.includes(i.category));
  if (uncategorized.length > 0) grouped["Otros"] = uncategorized;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "white" }}>Menú</h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>{items.length} ítems en el menú</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ height: "38px", padding: "0 16px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={15} /> Agregar ítem
        </button>
      </div>

      {/* Lista por categoría */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
          <UtensilsCrossed size={40} style={{ marginBottom: "12px", opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: "14px" }}>El menú está vacío</p>
          <p style={{ margin: "6px 0 0", fontSize: "12px" }}>Agregá ítems para que aparezcan en los pedidos y en el bot</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => {
          const color = CAT_COLORS[cat] ?? "100,116,139";
          return (
            <div key={cat}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: `rgb(${color})` }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{cat}</span>
                <span style={{ fontSize: "11px", color: "#475569" }}>({catItems.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {catItems.map(item => (
                  <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px", opacity: item.isActive ? 1 : 0.45 }}>
                    {editing === item.id ? (
                      <>
                        <input value={editData.name ?? item.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} style={{ ...inputStyle, flex: 2 }} />
                        <input type="number" value={editData.price ?? item.price} onChange={e => setEditData(d => ({ ...d, price: parseFloat(e.target.value) }))} style={{ ...inputStyle, width: "90px", flex: "none" }} placeholder="Precio" />
                        <select value={editData.category ?? item.category ?? "Otros"} onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
                          style={{ ...inputStyle, width: "160px", flex: "none", cursor: "pointer", appearance: "none" }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={() => saveEdit(item.id)} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={14} /></button>
                        <button onClick={() => setEditing(null)} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "white" }}>{item.name}</span>
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#a78bfa" }}>{fmt(item.price)}</span>
                        <button onClick={() => { setEditing(item.id); setEditData({ name: item.name, price: item.price, category: item.category }); }}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => toggleActive(item)}
                          style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer", border: "1px solid", background: item.isActive ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", borderColor: item.isActive ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)", color: item.isActive ? "#f87171" : "#4ade80" }}>
                          {item.isActive ? "Ocultar" : "Mostrar"}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal nuevo ítem */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
             onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ width: "100%", maxWidth: "480px", background: "#0f0f1a", borderRadius: "20px 20px 0 0" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Nuevo ítem del menú</p>
              <button onClick={() => setShowModal(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Nombre *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Milanesa napolitana" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Precio *</label>
                  <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Costo</label>
                  <input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "6px", textTransform: "uppercase" }}>Categoría</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer", appearance: "none" as const }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="pb-[88px] md:pb-5" style={{ padding: "0 20px 20px" }}>
              {saveError && (
                <div style={{ marginBottom: "10px", padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "12px" }}>
                  {saveError}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setShowModal(false); setSaveError(""); }} style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={addItem} disabled={saving} style={{ flex: 2, height: "42px", borderRadius: "10px", background: saving ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Guardando..." : "Agregar al menú"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
