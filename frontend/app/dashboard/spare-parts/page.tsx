"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Wrench,
  Upload,
  Plus,
  Pencil,
  Check,
  X,
  Search,
  Save,
  TrendingUp,
  PackageSearch,
  Tag,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type SparePart = {
  id: string;
  brand: string;
  model: string;
  name: string;
  costPrice: number;
  sellPrice: number | null;
  category: string | null;
  isActive: boolean;
};

type ImportResult = {
  created: number;
  updated: number;
  errors: string[];
};

// ── Estilos compartidos (igual que inventory/page.tsx) ────────────────────────

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

const onInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(34,197,94,0.5)";
  e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.1)";
};
const onInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = "rgba(255,255,255,0.08)";
  e.target.style.boxShadow = "none";
};

const fmt = (n: number) =>
  `$${Math.round(n).toLocaleString("es-AR")}`;

// ── Componente principal ───────────────────────────────────────────────────────

export default function SparePartsPage() {
  const [parts, setParts]       = useState<SparePart[]>([]);
  const [search, setSearch]     = useState("");
  const [margin, setMargin]     = useState<number>(40);
  const [savedMargin, setSavedMargin] = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing]   = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SparePart>>({});

  // Nuevo repuesto
  const [newBrand, setNewBrand]     = useState("");
  const [newModel, setNewModel]     = useState("");
  const [newName, setNewName]       = useState("");
  const [newCost, setNewCost]       = useState("");
  const [newSellPrice, setNewSellPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Cargar datos ─────────────────────────────────────────────────────────────

  const load = () =>
    api.get("/spare-parts").then((r) => setParts(r.data)).catch(() => {});

  useEffect(() => {
    load();
    // Cargar margen actual desde settings
    api.get("/settings").then((r) => {
      if (r.data?.repairMarginPercent != null) {
        setMargin(r.data.repairMarginPercent);
      }
    }).catch(() => {});
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Calcula el precio de venta efectivo usando sellPrice manual o el margen */
  const getSellPrice = (part: SparePart): number => {
    return part.sellPrice ?? part.costPrice * (1 + margin / 100);
  };

  const filtered = parts.filter(
    (p) =>
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.model.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveMargin = async () => {
    await api.patch("/settings/repair-margin", { repairMarginPercent: margin });
    setSavedMargin(true);
    setTimeout(() => setSavedMargin(false), 2200);
  };

  const handleImportExcel = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/spare-parts/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data as ImportResult);
      load();
    } catch (err: any) {
      setImportResult({
        created: 0,
        updated: 0,
        errors: [
          err?.response?.data?.message ?? "Error al importar. Verificá el formato del archivo.",
        ],
      });
    } finally {
      setImporting(false);
      // Reset el input para poder volver a seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddPart = async () => {
    setSaveError("");
    if (!newBrand.trim()) { setSaveError("La marca es obligatoria"); return; }
    if (!newModel.trim()) { setSaveError("El modelo es obligatorio"); return; }
    if (!newName.trim())  { setSaveError("El nombre del repuesto es obligatorio"); return; }
    if (!newCost)         { setSaveError("El costo es obligatorio"); return; }
    setSaving(true);
    try {
      await api.post("/spare-parts", {
        brand:     newBrand.trim(),
        model:     newModel.trim(),
        name:      newName.trim(),
        costPrice: parseFloat(newCost),
        sellPrice: newSellPrice ? parseFloat(newSellPrice) : undefined,
        category:  newCategory.trim() || undefined,
      });
      setNewBrand(""); setNewModel(""); setNewName("");
      setNewCost(""); setNewSellPrice(""); setNewCategory(""); setSaveError("");
      setShowAddModal(false);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setSaveError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Error al guardar"));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    await api.patch(`/spare-parts/${id}`, editData);
    setEditing(null);
    load();
  };

  const deletePart = async (id: string) => {
    await api.delete(`/spare-parts/${id}`);
    load();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "inherit" }}
      className="px-4 md:px-7 py-8 pb-24"
    >
      {/* Ambient glows */}
      <div style={{ position: "fixed", top: "-10%", left: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-5%", right: "0", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.1))", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(34,197,94,0.2)" }}>
              <Wrench size={20} color="#4ade80" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, background: "linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>
                Gestión de Repuestos
              </h1>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#475569" }}>
                Catálogo para el servicio técnico. {parts.length} repuesto{parts.length !== 1 ? "s" : ""} registrado{parts.length !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Importar Excel */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportExcel(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: importing ? "#475569" : "#94a3b8", fontSize: "13px", fontWeight: 500, cursor: importing ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: importing ? 0.6 : 1 }}
              onMouseEnter={(e) => { if (!importing) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "white"; }}}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#94a3b8"; }}
            >
              <Upload size={14} />
              {importing ? "Importando..." : "Importar Excel"}
            </button>

            {/* Agregar manual */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "0 18px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #166534, #15803d)", border: "1px solid rgba(34,197,94,0.4)", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px rgba(34,197,94,0.2)", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(34,197,94,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(34,197,94,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Plus size={14} /> Agregar manual
            </button>
          </div>
        </div>

        {/* ── Margen de ganancia ────────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={16} color="#4ade80" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>Margen de Ganancia Global</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="number"
              min={0}
              max={500}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              style={{ ...inputStyle, width: "90px", height: "36px", textAlign: "center", fontSize: "15px", fontWeight: 700, color: "#4ade80" }}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
            />
            <span style={{ fontSize: "14px", color: "#475569" }}>%</span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#334155", flex: 1 }}>
            Se aplica sobre el costo cuando no hay precio de venta manual. Ej: costo $10.000 → venta <strong style={{ color: "#4ade80" }}>${Math.round(10000 * (1 + margin / 100)).toLocaleString("es-AR")}</strong>
          </p>
          <button
            onClick={handleSaveMargin}
            className={`btn-glass btn-glass-sm ${savedMargin ? "btn-glass-saved" : ""}`}
          >
            <Save className="h-3.5 w-3.5" />
            {savedMargin ? "Guardado ✓" : "Guardar margen"}
          </button>
        </div>

        {/* ── Resultado importación ─────────────────────────────────────────── */}
        {importResult && (
          <div style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: importResult.errors.length > 0 ? "rgba(249,115,22,0.06)" : "rgba(34,197,94,0.06)",
            border: `1px solid ${importResult.errors.length > 0 ? "rgba(249,115,22,0.25)" : "rgba(34,197,94,0.25)"}`,
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: importResult.errors.length > 0 ? "#fb923c" : "#4ade80" }}>
                Importación completada — {importResult.created} creados, {importResult.updated} actualizados
              </p>
              {importResult.errors.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: "16px", fontSize: "12px", color: "#94a3b8" }}>
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li style={{ color: "#475569" }}>...y {importResult.errors.length - 5} errores más</li>
                  )}
                </ul>
              )}
            </div>
            <button onClick={() => setImportResult(null)} style={{ color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Búsqueda ──────────────────────────────────────────────────────── */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <Search size={15} color="#475569" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo, repuesto o categoría..."
            style={{ ...inputStyle, paddingLeft: "40px", height: "44px", fontSize: "14px" }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
          />
        </div>

        {/* ── Tabla ─────────────────────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "auto" }}>

          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr 120px 120px 120px 80px 90px", gap: "0", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", minWidth: "860px" }}>
            {["Marca", "Modelo", "Repuesto", "Costo", "P. de Venta", "Categoría", "Estado", "Acciones"].map((col, i) => (
              <div key={i} style={{ padding: "12px 8px", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {col}
              </div>
            ))}
          </div>

          {/* Filas */}
          {filtered.length === 0 ? (
            <div style={{ padding: "70px 20px", textAlign: "center" }}>
              <PackageSearch size={44} color="rgba(255,255,255,0.07)" style={{ display: "block", margin: "0 auto 14px" }} />
              <p style={{ color: "#475569", fontSize: "14px", margin: 0 }}>
                {search ? "Sin resultados para tu búsqueda" : "No hay repuestos cargados todavía"}
              </p>
              <p style={{ color: "#334155", fontSize: "12px", margin: "4px 0 0" }}>
                {search ? "Intentá con otros términos" : 'Usá "Importar Excel" o "Agregar manual" para comenzar'}
              </p>
            </div>
          ) : (
            filtered.map((part, idx) => {
              const isEditing = editing === part.id;
              const effectiveSell = getSellPrice(part);
              const isManualPrice = part.sellPrice != null;

              return (
                <div
                  key={part.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.5fr 120px 120px 120px 80px 90px",
                    gap: "0",
                    padding: "0 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    transition: "background 0.15s",
                    minWidth: "860px",
                    opacity: part.isActive ? 1 : 0.45,
                  }}
                  onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.background = "rgba(34,197,94,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                >
                  {/* Marca */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        value={editData.brand ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, brand: e.target.value }))}
                        style={{ ...inputStyle, height: "32px", fontSize: "12px" }}
                        onFocus={onInputFocus}
                        onBlur={onInputBlur}
                      />
                    ) : (
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>{part.brand}</span>
                    )}
                  </div>

                  {/* Modelo */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        value={editData.model ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, model: e.target.value }))}
                        style={{ ...inputStyle, height: "32px", fontSize: "12px" }}
                        onFocus={onInputFocus}
                        onBlur={onInputBlur}
                      />
                    ) : (
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>{part.model}</span>
                    )}
                  </div>

                  {/* Nombre del repuesto */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        value={editData.name ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                        style={{ ...inputStyle, height: "32px", fontSize: "12px" }}
                        onFocus={onInputFocus}
                        onBlur={onInputBlur}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Tag size={11} color="#475569" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "13px", color: "white" }}>{part.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Costo */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.costPrice ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, costPrice: parseFloat(e.target.value) }))}
                        style={{ ...inputStyle, height: "32px", fontSize: "12px" }}
                        onFocus={onInputFocus}
                        onBlur={onInputBlur}
                      />
                    ) : (
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{fmt(part.costPrice)}</span>
                    )}
                  </div>

                  {/* Precio de venta (calculado o manual) */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        type="number"
                        placeholder="Auto"
                        value={editData.sellPrice ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, sellPrice: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        style={{ ...inputStyle, height: "32px", fontSize: "12px" }}
                        onFocus={onInputFocus}
                        onBlur={onInputBlur}
                      />
                    ) : (
                      <div>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>
                          {fmt(effectiveSell)}
                        </span>
                        {isManualPrice && (
                          <span style={{ display: "block", fontSize: "9px", color: "#475569", marginTop: "1px" }}>manual</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Categoría */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    {isEditing ? (
                      <input
                        value={editData.category ?? ""}
                        onChange={(e) => setEditData((d) => ({ ...d, category: e.target.value }))}
                        style={{ ...inputStyle, height: "32px", fontSize: "12px" }}
                        onFocus={onInputFocus}
                        onBlur={onInputBlur}
                      />
                    ) : part.category ? (
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)" }}>
                        {part.category}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#334155" }}>—</span>
                    )}
                  </div>

                  {/* Estado */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 600, background: part.isActive ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", color: part.isActive ? "#4ade80" : "#64748b", border: `1px solid ${part.isActive ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.25)"}` }}>
                      {part.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", alignItems: "center", padding: "14px 8px", gap: "6px" }}>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(part.id)}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.22)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; }}
                          title="Guardar"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                          title="Cancelar"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditing(part.id);
                            setEditData({
                              brand: part.brand,
                              model: part.model,
                              name: part.name,
                              costPrice: part.costPrice,
                              sellPrice: part.sellPrice ?? undefined,
                              category: part.category ?? "",
                            });
                          }}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.12)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; e.currentTarget.style.color = "#60a5fa"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deletePart(part.id)}
                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; e.currentTarget.style.color = "#f87171"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#64748b"; }}
                          title="Eliminar"
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
                {filtered.length} de {parts.length} repuesto{parts.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Agregar repuesto manual ──────────────────────────────────── */}
      {showAddModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowAddModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 40 }}
          />

          {/* Drawer */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", maxWidth: "100vw", background: "#0d0d14", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}>

            {/* Drawer header */}
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="#4ade80" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "white" }}>Nuevo Repuesto</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Completá los datos del repuesto</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setSaveError(""); }}
                style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Marca */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Marca *
                  </label>
                  <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Ej: Samsung, Apple, Motorola" style={inputStyle} onFocus={onInputFocus} onBlur={onInputBlur} />
                </div>

                {/* Modelo */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Modelo *
                  </label>
                  <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Ej: A54, iPhone 13, G84" style={inputStyle} onFocus={onInputFocus} onBlur={onInputBlur} />
                </div>

                {/* Nombre del repuesto */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Repuesto *
                  </label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Pantalla, Batería, Conector" style={inputStyle} onFocus={onInputFocus} onBlur={onInputBlur} />
                </div>

                {/* Costo y precio de venta */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Costo *
                    </label>
                    <input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="$0" style={inputStyle} onFocus={onInputFocus} onBlur={onInputBlur} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      P. Venta <span style={{ fontSize: "10px", color: "#334155", fontWeight: 400 }}>(opt.)</span>
                    </label>
                    <input type="number" value={newSellPrice} onChange={(e) => setNewSellPrice(e.target.value)} placeholder={`Auto (${margin}%)`} style={inputStyle} onFocus={onInputFocus} onBlur={onInputBlur} />
                  </div>
                </div>

                {/* Precio calculado preview */}
                {newCost && (
                  <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "10px", fontSize: "12px", color: "#64748b" }}>
                    Precio de venta calculado:{" "}
                    <strong style={{ color: "#4ade80", fontSize: "14px" }}>
                      {newSellPrice
                        ? `$${Math.round(parseFloat(newSellPrice) || 0).toLocaleString("es-AR")} (manual)`
                        : `$${Math.round((parseFloat(newCost) || 0) * (1 + margin / 100)).toLocaleString("es-AR")} (con ${margin}% de margen)`}
                    </strong>
                  </div>
                )}

                {/* Categoría */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Categoría <span style={{ fontSize: "10px", fontWeight: 400 }}>(opc.)</span>
                  </label>
                  <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Ej: Pantallas, Baterías, Conectores" style={inputStyle} onFocus={onInputFocus} onBlur={onInputBlur} />
                </div>

              </div>
            </div>

            {/* Drawer footer */}
            <div className="pb-[88px] md:pb-5" style={{ paddingTop: "20px", paddingLeft: "24px", paddingRight: "24px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {saveError && (
                <div style={{ marginBottom: "12px", padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px" }}>
                  {saveError}
                </div>
              )}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => { setShowAddModal(false); setSaveError(""); }}
                  style={{ flex: 1, height: "42px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPart}
                  disabled={saving}
                  style={{ flex: 2, height: "42px", borderRadius: "10px", background: saving ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #166534, #15803d)", border: "1px solid rgba(34,197,94,0.4)", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 0 20px rgba(34,197,94,0.25)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                  onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.boxShadow = "0 0 30px rgba(34,197,94,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(34,197,94,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  {saving ? "Guardando..." : <><Plus size={15} /> Agregar Repuesto</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
