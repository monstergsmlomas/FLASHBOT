"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Search, Plus, Pencil, Trash2, X, MessageCircle, Zap } from "lucide-react";

interface Customer {
  id: string;
  name?: string | null;
  phone: string;
  realPhone?: string | null;
  dni?: string | null;
  address?: string | null;
  email?: string | null;
  notes?: string | null;
  _count?: { appointments: number };
}

function getInitials(name?: string | null, phone?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return phone ? phone.slice(-2) : "??";
}

// Tema único azul para todas las tarjetas de pacientes
const BLUE_THEME = {
  avatar: "from-blue-500 to-cyan-600",
  card:   "rgba(59,130,246,0.07)",
  border: "rgba(59,130,246,0.2)",
  icon:   "#60a5fa",
};

function getTheme(_id: string) {
  return BLUE_THEME;
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────

interface CustomerModalProps {
  customer?: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

function CustomerModal({ customer, onClose, onSaved }: CustomerModalProps) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name:      customer?.name      ?? "",
    phone:     customer?.phone     ?? "",
    realPhone: customer?.realPhone ?? "",
    dni:       customer?.dni       ?? "",
    address:   customer?.address   ?? "",
    email:     customer?.email     ?? "",
    notes:     customer?.notes     ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name:      form.name      || undefined,
        realPhone: form.realPhone || undefined,
        dni:       form.dni       || undefined,
        address:   form.address   || undefined,
        email:     form.email     || undefined,
        notes:     form.notes     || undefined,
      };
      if (isEdit) {
        await api.patch(`/customers/${customer!.id}`, payload);
      } else {
        await api.post("/customers", { phone: form.phone, ...payload });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Editar paciente" : "Nuevo paciente"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Teléfono <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: 5491123456789"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
            <input type="text" placeholder="Nombre completo" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Teléfono real</label>
              <input type="text" placeholder="1123456789" value={form.realPhone}
                onChange={(e) => setForm({ ...form, realPhone: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Para el botón de WhatsApp</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">DNI</label>
              <input type="text" placeholder="32456789" value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Domicilio</label>
            <input type="text" placeholder="Av. Corrientes 1234, CABA" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input
              type="email"
              placeholder="email@ejemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notas</label>
            <textarea
              placeholder="Notas internas sobre este paciente..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-glass btn-glass-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-glass flex-1 justify-center">
              <Zap className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

interface DeleteModalProps {
  customer: Customer;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteModal({ customer, onClose, onDeleted }: DeleteModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/customers/${customer.id}`);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Eliminar paciente</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          ¿Seguro que querés eliminar a{" "}
          <span className="font-medium text-foreground">{customer.name || customer.phone}</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-glass btn-glass-secondary flex-1 justify-center">
            Cancelar
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-glass btn-glass-danger flex-1 justify-center">
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Card ─────────────────────────────────────────────────────────────

interface CustomerCardProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
}

function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
  const theme = getTheme(customer.id);
  const initials = getInitials(customer.name, customer.phone);
  const appointmentCount = customer._count?.appointments ?? 0;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${theme.card} 0%, rgba(0,0,0,0.3) 100%)`,
        borderColor: theme.border,
      }}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br ${theme.avatar} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {customer.name ? (
            <span className="font-bold text-foreground text-sm">{customer.name}</span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Sin nombre</span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: theme.card, color: theme.icon, border: `1px solid ${theme.border}` }}>
            {appointmentCount} {appointmentCount === 1 ? "turno" : "turnos"}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {customer.realPhone ? (
            <span className="text-xs text-muted-foreground">📱 {customer.realPhone}</span>
          ) : (
            <span className="text-xs text-amber-500/70 italic">Sin teléfono real</span>
          )}
          {customer.dni     && <span className="text-xs text-muted-foreground/70">🪪 {customer.dni}</span>}
          {customer.address && <span className="text-xs text-muted-foreground/70 truncate max-w-[180px]">📍 {customer.address}</span>}
          {customer.email   && <span className="text-xs text-muted-foreground/70 truncate max-w-[180px]">✉️ {customer.email}</span>}
        </div>
        {customer.notes && (
          <p className="text-xs text-muted-foreground/50 mt-1 line-clamp-1 italic">{customer.notes}</p>
        )}
      </div>

      {/* Actions — siempre visibles */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {customer.realPhone && (
          <a href={`https://wa.me/54${customer.realPhone}`} target="_blank" rel="noopener noreferrer"
            title="Abrir WhatsApp"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }}>
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        <button onClick={onEdit} title="Editar"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: `rgba(${theme.icon.slice(1).match(/.{2}/g)?.map(h=>parseInt(h,16)).join(',')},0.12)`, color: theme.icon, border: `1px solid ${theme.border}` }}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} title="Eliminar"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  const fetchCustomers = () => {
    setLoading(true);
    api
      .get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`)
      .then((r) => {
        setCustomers(r.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSaved = () => {
    setCreateOpen(false);
    setEditCustomer(null);
    fetchCustomers();
  };

  const handleDeleted = () => {
    setDeleteCustomer(null);
    fetchCustomers();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {customers.length > 0 ? `${customers.length} paciente${customers.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-glass">
            <Zap className="h-4 w-4" />
            Nuevo paciente
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">
              {search ? "No se encontraron pacientes" : "Todavía no hay pacientes"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {search
                ? "Probá con otro nombre o número de teléfono"
                : "Los pacientes aparecerán aquí cuando reserven un turno por WhatsApp, o podés crearlos manualmente"}
            </p>
            {!search && (
              <button onClick={() => setCreateOpen(true)} className="btn-glass mt-4">
                <Zap className="h-4 w-4" />
                Agregar primer paciente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                onEdit={() => setEditCustomer(c)}
                onDelete={() => setDeleteCustomer(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && (
        <CustomerModal onClose={() => setCreateOpen(false)} onSaved={handleSaved} />
      )}

      {editCustomer && (
        <CustomerModal
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteCustomer && (
        <DeleteModal
          customer={deleteCustomer}
          onClose={() => setDeleteCustomer(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
