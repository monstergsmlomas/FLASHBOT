"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Plus, X, Pencil, Check, Loader2 } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  // Formulario nuevo empleado
  const [newName, setNewName]           = useState("");
  const [newServiceIds, setNewServiceIds] = useState<string[]>([]);
  const [saving, setSaving]             = useState(false);

  // Edición inline
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState("");
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/employees"),
      api.get("/services"),
    ]).then(([empRes, svcRes]) => {
      setEmployees(empRes.data);
      setServices(svcRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const reload = async () => {
    const res = await api.get("/employees");
    setEmployees(res.data);
  };

  const toggleService = (id: string, arr: string[], setArr: (v: string[]) => void) => {
    setArr(arr.includes(id) ? arr.filter((s) => s !== id) : [...arr, id]);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.post("/employees", { name: newName.trim(), serviceIds: newServiceIds });
      setNewName(""); setNewServiceIds([]);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/employees/${id}`);
    await reload();
  };

  const startEdit = (emp: any) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditServiceIds(emp.services?.map((es: any) => es.service.id) ?? []);
  };

  const handleSaveEdit = async (id: string) => {
    await api.patch(`/employees/${id}`, { name: editName.trim(), serviceIds: editServiceIds });
    setEditingId(null);
    await reload();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
          <p className="text-sm text-muted-foreground mt-1">Profesionales del negocio y los servicios que atienden</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{employees.length} empleado{employees.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {services.length === 0 && (
        <div className="glass rounded-2xl p-4 border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-sm text-yellow-400">
            ⚠️ No tenés servicios configurados. Primero cargá los servicios en{" "}
            <a href="/dashboard/settings" className="underline hover:text-yellow-300">Configuración</a>{" "}
            para poder asignarlos a los empleados.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── Lista de empleados ─────────────────────────────────────────── */}
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/40">
            <h2 className="font-semibold text-foreground text-sm">Equipo</h2>
          </div>
          <div className="p-4 space-y-3">
            {employees.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No hay empleados. Agregá el primero →</p>
            ) : (
              employees.map((emp) => (
                <div key={emp.id} className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
                  {editingId === emp.id ? (
                    /* ── Modo edición ── */
                    <div className="p-4 space-y-3">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-8 text-sm bg-background border border-border/60 rounded-lg px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                      {services.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-muted-foreground">Servicios que atiende:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {services.map((svc) => (
                              <button key={svc.id}
                                onClick={() => toggleService(svc.id, editServiceIds, setEditServiceIds)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                                  editServiceIds.includes(svc.id)
                                    ? "bg-primary/15 border-primary/40 text-primary"
                                    : "border-border/40 text-muted-foreground hover:border-border"
                                }`}>
                                {svc.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(emp.id)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Check className="h-3.5 w-3.5" /> Guardar
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Modo visualización ── */
                    <div className="flex items-start gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {emp.services?.length > 0 ? (
                            emp.services.map((es: any) => (
                              <span key={es.service.id}
                                className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                {es.service.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Sin servicios asignados</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEdit(emp)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(emp.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                          <X className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Agregar empleado ───────────────────────────────────────────── */}
        <section className="glass rounded-2xl overflow-hidden h-fit">
          <div className="px-5 py-3.5 border-b border-border/40">
            <h2 className="font-semibold text-foreground text-sm">Agregar empleado</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                placeholder="Ej: María, Juan..."
                className="w-full h-9 text-sm bg-background border border-border/60 rounded-lg px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>

            {services.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Servicios que atiende</label>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((svc) => (
                    <button key={svc.id}
                      onClick={() => toggleService(svc.id, newServiceIds, setNewServiceIds)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        newServiceIds.includes(svc.id)
                          ? "bg-primary/15 border-primary/40 text-primary font-medium"
                          : "border-border/40 text-muted-foreground hover:border-border"
                      }`}>
                      {svc.name}
                      {svc.durationMin && <span className="ml-1 opacity-60 text-[10px]">{svc.durationMin}m</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleAdd} disabled={saving || !newName.trim()}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Agregar empleado
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
