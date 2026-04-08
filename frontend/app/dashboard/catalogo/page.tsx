'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, ChangeEvent, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface Repuesto {
  id: string;
  nombre: string;
  categoria: string;
  marca: string;
  costo: number;
  margen: number;
  precioFinal: number;
  origen: 'proveedor' | 'stock';
}

const MARCAS_OPCIONES = ['APPLE', 'SAMSUNG', 'MOTOROLA', 'XIAOMI', 'LG', 'TCL', 'ZTE', 'NOKIA', 'INFINIX', 'OTRAS'];
const CATEGORIAS_OPCIONES = ['MODULO', 'BATERIA', 'LCD', 'TACTIL', 'REPUESTOS', 'ACCESORIOS', 'GENERAL'];

const MODAL_VACIO = {
  nombre: '',
  categoria: 'MODULO',
  marca: 'SAMSUNG',
  costo: 0,
  margen: 30,
  precioFinal: 0,
  origen: 'proveedor' as 'proveedor' | 'stock',
};

export default function CatalogoPage() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);

  // ── Modal ──────────────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalForm, setModalForm] = useState(MODAL_VACIO);
  const [guardandoModal, setGuardandoModal] = useState(false);

  const abrirModal = () => {
    setModalForm(MODAL_VACIO);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModalForm(MODAL_VACIO);
  };

  const handleModalChange = (campo: keyof typeof MODAL_VACIO, valor: string | number) => {
    setModalForm(prev => {
      const next = { ...prev, [campo]: valor };

      if (campo === 'costo' || campo === 'margen') {
        const c = campo === 'costo' ? Number(valor) : prev.costo;
        const m = campo === 'margen' ? Number(valor) : prev.margen;
        next.precioFinal = Math.round(c * (1 + m / 100));
      }

      if (campo === 'precioFinal') {
        const precio = Number(valor);
        if (prev.costo > 0) {
          next.margen = Number((((precio / prev.costo) - 1) * 100).toFixed(2));
        }
      }

      return next;
    });
  };

  const guardarProductoManual = async () => {
    if (!modalForm.nombre.trim()) { alert('El nombre es obligatorio.'); return; }
    if (modalForm.costo <= 0) { alert('El costo debe ser mayor a 0.'); return; }

    setGuardandoModal(true);

    // Guardar en Supabase
    const { data, error } = await supabase.from('productos').insert([{
      nombre: modalForm.nombre.trim(),
      tipo: modalForm.categoria,
      calidad: modalForm.categoria,
      con_marco: modalForm.nombre.toUpperCase().includes('CON MARCO'),
      costo: modalForm.costo,
      precio_final: modalForm.precioFinal,
      activo: true,
      taller_id: '00000000-0000-0000-0000-000000000000',
      origen: modalForm.origen,
    }]).select().single();

    setGuardandoModal(false);

    if (error) {
      alert('Error al guardar: ' + error.message);
      return;
    }

    // Agregar a la tabla local
    const nuevo: Repuesto = {
      id: data.id,
      nombre: modalForm.nombre.trim(),
      categoria: modalForm.categoria,
      marca: modalForm.marca,
      costo: modalForm.costo,
      margen: modalForm.margen,
      precioFinal: modalForm.precioFinal,
      origen: 'proveedor'
    };

    setRepuestos(prev => [nuevo, ...prev]);
    cerrarModal();
  };
  // ──────────────────────────────────────────────────────

  useEffect(() => {
    const cargarProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('taller_id', '00000000-0000-0000-0000-000000000000')
        .eq('activo', true);

      if (error) { console.error('Error cargando productos:', error); return; }

      const repuestosCargados: Repuesto[] = (data || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.calidad || p.tipo || 'GENERAL',
        marca: detectarMarca(p.nombre),
        costo: p.costo,
        margen: Math.round(((p.precio_final / p.costo) - 1) * 100),
        precioFinal: p.precio_final,
        origen: p.origen || 'proveedor',
      }));

      setRepuestos(repuestosCargados);
    };

    cargarProductos();
  }, []);

  const [cargandoPdf, setCargandoPdf] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const [filtroTablaMarca, setFiltroTablaMarca] = useState<string>('TODAS');
  const [filtroTablaCategoria, setFiltroTablaCategoria] = useState<string>('TODAS');
  const [tipoAjusteMasivo, setTipoAjusteMasivo] = useState<'CATEGORIA' | 'MARCA'>('CATEGORIA');
  const [objetivoAjuste, setObjetivoAjuste] = useState<string>('TODAS');
  const [margenInput, setMargenInput] = useState<number>(30);

  const categoriasUnicas = useMemo(() => {
    const cats = new Set(repuestos.map(r => r.categoria));
    return ['TODAS', ...Array.from(cats)].sort();
  }, [repuestos]);

  const marcasUnicas = useMemo(() => {
    const marcas = new Set(repuestos.map(r => r.marca));
    return ['TODAS', ...Array.from(marcas)].sort();
  }, [repuestos]);

  const repuestosFiltrados = useMemo(() => {
    return repuestos.filter(rep => {
      const pasaMarca = filtroTablaMarca === 'TODAS' || rep.marca === filtroTablaMarca;
      const pasaCategoria = filtroTablaCategoria === 'TODAS' || rep.categoria === filtroTablaCategoria;
      return pasaMarca && pasaCategoria;
    });
  }, [repuestos, filtroTablaMarca, filtroTablaCategoria]);

  const limpiarPrecio = (valor: any): number => {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    const limpio = String(valor).replace(/[$ ,]/g, '');
    return parseFloat(limpio) || 0;
  };

  const extraerDetalles = (texto: string) => {
    const upper = String(texto).toUpperCase();
    let detalles = [];
    if (upper.includes('OLED')) detalles.push('OLED');
    if (upper.includes('INCELL')) detalles.push('INCELL');
    if (upper.includes('ORIGINAL')) detalles.push('ORIGINAL');
    if (upper.includes('GX')) detalles.push('GX');
    if (upper.includes('CON MARCO') || upper.includes('C/MARCO') || upper.includes('C/ MARCO')) detalles.push('C/ MARCO');
    return detalles.length > 0 ? ` ${detalles.join(' ')}` : '';
  };

  const detectarMarca = (nombre: string): string => {
    const n = nombre.toUpperCase();
    if (n.includes('SAM') || n.includes('SAMSUNG')) return 'SAMSUNG';
    if (n.includes('IPHONE')) return 'APPLE';
    if (n.includes('MOTO') || n.includes('MOTOROLA')) return 'MOTOROLA';
    if (n.includes('XIAOMI') || n.includes('REDMI') || n.includes('POCO')) return 'XIAOMI';
    if (n.includes('LG')) return 'LG';
    if (n.includes('TCL') || n.includes('ALCATEL')) return 'TCL';
    if (n.includes('ZTE')) return 'ZTE';
    if (n.includes('NOKIA')) return 'NOKIA';
    if (n.includes('INFINIX')) return 'INFINIX';
    return 'OTRAS';
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const nuevosRepuestos: Repuesto[] = [];

      data.forEach((row: any, index: number) => {
        const marcaRaw = String(row.Marca || row.MARCA || row.marca || 'S/M').toUpperCase();
        const partesNombre = [row.Modelo || row.Nombre || row.MODELO, row.Repuesto];
        const rawName = partesNombre.filter(Boolean).join(' - ');
        const rawCosto = row.Costo || row.COSTO || row['PRECIO DE VENTA'] || row.PRECIO;

        if (!rawName) return;
        const costoLimpio = limpiarPrecio(rawCosto);
        if (costoLimpio <= 0) return;

        let baseCat = row.Categoria || row.CATEGORIA || row.categoria || 'GENERAL';
        baseCat = String(baseCat).toUpperCase();
        const adjetivos = extraerDetalles(rawName + ' ' + baseCat);
        const categoriaFinal = baseCat === 'GENERAL' ? 'REPUESTOS' + adjetivos : baseCat + adjetivos;

        const margenInicial = 30;
        nuevosRepuestos.push({
          id: `rep-${Date.now()}-${index}`,
          nombre: rawName,
          categoria: categoriaFinal,
          marca: marcaRaw,
          costo: costoLimpio,
          margen: margenInicial,
          precioFinal: Math.round(costoLimpio * (1 + margenInicial / 100)),
          origen: 'proveedor',
        });
      });

      setRepuestos(prev => [...prev, ...nuevosRepuestos]);
      setObjetivoAjuste('TODAS');
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const guardarEnSupabase = async (repuestos: Repuesto[]) => {
    const productos = repuestos.map(r => ({
      nombre: r.nombre,
      tipo: r.categoria,
      calidad: r.categoria,
      con_marco: r.nombre.includes('CON MARCO'),
      costo: r.costo,
      precio_final: r.precioFinal,
      activo: true,
      taller_id: '00000000-0000-0000-0000-000000000000',
      origen: r.origen || 'proveedor',
    }));

    const { error } = await supabase.from('productos').insert(productos);
    if (error) {
      console.error('Error guardando en Supabase:', error);
      alert('Error al guardar en base de datos: ' + error.message);
    } else {
      alert(`✅ ${productos.length} productos guardados en la base de datos`);
    }
  };

  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargandoPdf(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/catalogo/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al procesar el PDF');

      const productos = await response.json();

      const nuevosRepuestos: Repuesto[] = productos.map((p: any, index: number) => ({
        id: `rep-${Date.now()}-${index}`,
        nombre: p.nombre,
        categoria: p.categoria,
        marca: detectarMarca(p.nombre),
        costo: p.costo,
        margen: 30,
        precioFinal: Math.round(p.costo * 1.30),
        origen: 'proveedor' as const,
      }));

      setRepuestos(prev => [...prev, ...nuevosRepuestos]);
    } catch (error) {
      alert('Error al procesar el PDF. Asegurate que el backend esté corriendo en el puerto 3001.');
    } finally {
      setCargandoPdf(false);
      e.target.value = '';
    }
  };

  const aplicarMargen = () => {
    setRepuestos(repuestos.map(rep => {
      let aplica = false;
      if (objetivoAjuste === 'TODAS') aplica = true;
      else if (tipoAjusteMasivo === 'CATEGORIA' && rep.categoria === objetivoAjuste) aplica = true;
      else if (tipoAjusteMasivo === 'MARCA' && rep.marca === objetivoAjuste) aplica = true;

      if (aplica) {
        return {
          ...rep,
          margen: margenInput,
          precioFinal: Math.round(rep.costo * (1 + margenInput / 100))
        };
      }
      return rep;
    }));
  };

  const actualizarFila = (id: string, campo: keyof Repuesto, valor: string | number) => {
    setRepuestos(repuestos.map(rep => {
      if (rep.id === id) {
        const nuevoRep = { ...rep, [campo]: valor };

        if (campo === 'costo' || campo === 'margen') {
          const costoCalc = campo === 'costo' ? Number(valor) : rep.costo;
          const margenCalc = campo === 'margen' ? Number(valor) : rep.margen;
          nuevoRep.precioFinal = Math.round(costoCalc * (1 + margenCalc / 100));
        }

        if (campo === 'precioFinal') {
          const precioManual = Number(valor);
          if (rep.costo > 0) {
            const margenInverso = ((precioManual / rep.costo) - 1) * 100;
            nuevoRep.margen = Number(margenInverso.toFixed(2));
          }
        }

        return nuevoRep;
      }
      return rep;
    }));
  };

  const toggleSeleccion = (id: string) => {
    const nuevos = new Set(seleccionados);
    nuevos.has(id) ? nuevos.delete(id) : nuevos.add(id);
    setSeleccionados(nuevos);
  };

  const seleccionarTodos = () => {
    if (seleccionados.size === repuestosFiltrados.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(repuestosFiltrados.map(r => r.id)));
    }
  };

  const borrarSeleccionados = () => {
    setRepuestos(repuestos.filter(rep => !seleccionados.has(rep.id)));
    setSeleccionados(new Set());
  };

  return (
    <div className="p-6 space-y-6 text-slate-200">

      {/* ── MODAL CARGA MANUAL ─────────────────────────────── */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Agregar producto manualmente</h2>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del producto <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={modalForm.nombre}
                  onChange={(e) => handleModalChange('nombre', e.target.value)}
                  placeholder="Ej: MODULO SAMSUNG A54 OLED"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Marca + Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Marca</label>
                  <input
                    type="text"
                    list="marcas-list"
                    value={modalForm.marca}
                    onChange={(e) => handleModalChange('marca', e.target.value.toUpperCase())}
                    placeholder="Escribí o elegí una marca"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="marcas-list">
                    {MARCAS_OPCIONES.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    list="categorias-list"
                    value={modalForm.categoria}
                    onChange={(e) => handleModalChange('categoria', e.target.value.toUpperCase())}
                    placeholder="Escribí o elegí una categoría"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-blue-400 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="categorias-list">
                    {[...CATEGORIAS_OPCIONES, ...categoriasUnicas.filter(c => c !== 'TODAS')].filter((v, i, a) => a.indexOf(v) === i).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Origen */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo de producto</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleModalChange('origen', 'proveedor')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      modalForm.origen === 'proveedor'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    📋 Catálogo Proveedor
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModalChange('origen', 'stock')}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      modalForm.origen === 'stock'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    📦 Stock Propio
                  </button>
                </div>
              </div>

              {/* Costo + Margen + Precio Final */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Costo <span className="text-red-400">*</span></label>
                  <div className="flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-emerald-500">
                    <span className="text-slate-400 mr-1 text-sm">$</span>
                    <input
                      type="number"
                      value={modalForm.costo || ''}
                      onChange={(e) => handleModalChange('costo', Number(e.target.value))}
                      placeholder="0"
                      className="bg-transparent text-white w-full outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Margen (%)</label>
                  <input
                    type="number"
                    value={modalForm.margen}
                    onChange={(e) => handleModalChange('margen', Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Precio final</label>
                  <div className="flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-emerald-500">
                    <span className="text-emerald-400 mr-1 text-sm">$</span>
                    <input
                      type="number"
                      value={modalForm.precioFinal || ''}
                      onChange={(e) => handleModalChange('precioFinal', Number(e.target.value))}
                      placeholder="0"
                      className="bg-transparent text-emerald-400 font-bold w-full outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {modalForm.costo > 0 && (
                <div className="bg-slate-900/60 rounded-lg px-4 py-3 text-sm text-slate-400 border border-slate-700">
                  Ganancia por unidad:{' '}
                  <span className="text-emerald-400 font-bold">
                    ${(modalForm.precioFinal - modalForm.costo).toLocaleString('es-AR')}
                  </span>
                  {' '}({modalForm.margen}%)
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProductoManual}
                disabled={guardandoModal}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
              >
                {guardandoModal ? 'Guardando...' : '✅ Guardar producto'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ──────────────────────────────────────────────────── */}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Catálogo y Precios</h1>
          <p className="text-sm text-slate-400 mt-1">
            Los repuestos se separan por marca, calidad y tipo automáticamente.
          </p>
        </div>
        <div className="flex gap-3">
          {/* Botón nuevo: Agregar producto */}
          <button
            onClick={abrirModal}
            className="px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center gap-2"
          >
            <span>+ Agregar producto</span>
          </button>

          <label className="cursor-pointer px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center justify-center">
            <span>+ Subir Excel o CSV</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <label className={`cursor-pointer px-4 py-2 border rounded-lg transition-colors flex items-center justify-center ${
            cargandoPdf
              ? 'bg-slate-700/50 text-slate-500 border-slate-600 cursor-not-allowed'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
          }`}>
            <span>{cargandoPdf ? 'Procesando...' : '+ Subir PDF'}</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfUpload}
              disabled={cargandoPdf}
            />
          </label>
        </div>
      </div>

      {/* Controles de Ganancia */}
      <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <label className="text-sm text-slate-400 mb-1">Ajustar ganancias por:</label>
            <select
              value={tipoAjusteMasivo}
              onChange={(e) => {
                setTipoAjusteMasivo(e.target.value as 'CATEGORIA' | 'MARCA');
                setObjetivoAjuste('TODAS');
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 w-36"
            >
              <option value="CATEGORIA">Categoría</option>
              <option value="MARCA">Marca</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-400 mb-1">Seleccionar</label>
            <select
              value={objetivoAjuste}
              onChange={(e) => setObjetivoAjuste(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 w-48"
            >
              {tipoAjusteMasivo === 'CATEGORIA'
                ? categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)
                : marcasUnicas.map(marca => <option key={marca} value={marca}>{marca}</option>)
              }
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-400 mb-1">Ajuste (%)</label>
            <input
              type="number"
              value={margenInput}
              onChange={(e) => setMargenInput(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={aplicarMargen}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
          >
            Aplicar Ganancia
          </button>
        </div>

        {/* Botones BD — derecha */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => guardarEnSupabase(repuestos)}
            disabled={repuestos.length === 0}
            className="cursor-pointer px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            💾 Guardar en BD ({repuestos.length})
          </button>
          <button
            onClick={async () => {
              if (!confirm('¿Seguro que querés borrar todos los productos de la base de datos?')) return;
              const { error } = await supabase
                .from('productos')
                .delete()
                .eq('taller_id', '00000000-0000-0000-0000-000000000000');
              if (error) {
                alert('Error al limpiar: ' + error.message);
              } else {
                setRepuestos([]);
                alert('✅ Base de datos limpiada');
              }
            }}
            className="cursor-pointer px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
          >
            🗑️ Limpiar BD
          </button>
        </div>
      </div>
      {seleccionados.size > 0 && (
        <button
          onClick={borrarSeleccionados}
          className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
        >
          Borrar {seleccionados.size} seleccionados
        </button>
      )}

      {/* Tabla */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/30 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-400 font-medium">Filtros:</span>
          <select
            value={filtroTablaMarca}
            onChange={(e) => setFiltroTablaMarca(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-blue-400 font-semibold focus:outline-none focus:border-emerald-500 outline-none"
          >
            {marcasUnicas.map(marca => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>
          <select
            value={filtroTablaCategoria}
            onChange={(e) => setFiltroTablaCategoria(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-purple-400 font-semibold focus:outline-none focus:border-emerald-500 outline-none"
          >
            {categoriasUnicas.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500 ml-auto">
            Mostrando {repuestosFiltrados.length} de {repuestos.length} repuestos
          </span>
        </div>

        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700/50 sticky top-0 z-10">
              <tr>
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={repuestosFiltrados.length > 0 && seleccionados.size === repuestosFiltrados.length}
                    onChange={seleccionarTodos}
                    className="rounded bg-slate-900 border-slate-700 accent-emerald-500"
                  />
                </th>
                <th className="p-4">Marca</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Costo</th>
                <th className="p-4">Margen (%)</th>
                <th className="p-4">Precio Final</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {repuestosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No hay datos. Subí un Excel, CSV o PDF para comenzar.
                  </td>
                </tr>
              ) : (
                repuestosFiltrados.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-800/80 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(rep.id)}
                        onChange={() => toggleSeleccion(rep.id)}
                        className="rounded bg-slate-900 border-slate-700 accent-emerald-500"
                      />
                    </td>
                    <td className="p-2 font-medium text-slate-300">{rep.marca}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={rep.nombre}
                        onChange={(e) => actualizarFila(rep.id, 'nombre', e.target.value)}
                        className="bg-transparent border border-transparent hover:border-slate-600 focus:border-emerald-500 rounded px-2 py-1 text-white w-full outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={rep.categoria}
                        onChange={(e) => actualizarFila(rep.id, 'categoria', e.target.value.toUpperCase())}
                        className="bg-slate-900/50 border border-transparent hover:border-slate-600 focus:border-emerald-500 rounded px-2 py-1 text-blue-400 w-48 outline-none text-xs font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <span className="text-slate-400 mr-1">$</span>
                        <input
                          type="number"
                          value={rep.costo}
                          onChange={(e) => actualizarFila(rep.id, 'costo', Number(e.target.value))}
                          className="bg-transparent border border-transparent hover:border-slate-600 focus:border-emerald-500 rounded px-1 py-1 text-white w-24 outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rep.margen}
                        onChange={(e) => actualizarFila(rep.id, 'margen', Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 w-16 focus:outline-none focus:border-emerald-500 text-center"
                      />
                    </td>
                    <td className="p-2 font-bold text-emerald-400">
                      <div className="flex items-center">
                        <span className="mr-1 text-emerald-400">$</span>
                        <input
                          type="number"
                          value={rep.precioFinal}
                          onChange={(e) => actualizarFila(rep.id, 'precioFinal', Number(e.target.value))}
                          className="bg-transparent border border-transparent hover:border-emerald-500/50 focus:border-emerald-500 rounded px-1 py-1 text-emerald-400 w-24 outline-none font-bold"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setRepuestos(repuestos.filter(r => r.id !== rep.id));
                          if (seleccionados.has(rep.id)) toggleSeleccion(rep.id);
                        }}
                        className="text-slate-500 hover:text-red-400 transition-colors text-xs font-medium"
                      >
                        ELIMINAR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}