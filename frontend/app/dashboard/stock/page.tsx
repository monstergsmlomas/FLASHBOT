'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface ProductoStock {
  id: string;
  nombre: string;
  categoria: string;
  marca: string;
  cantidad: number;
  costo: number;
  precioFinal: number;
  tipo_producto: 'repuesto' | 'accesorio';
}

const MARCAS_OPCIONES = ['APPLE', 'SAMSUNG', 'MOTOROLA', 'XIAOMI', 'LG', 'TCL', 'ZTE', 'NOKIA', 'INFINIX', 'OTRAS'];
const CATEGORIAS_REPUESTO = ['MODULO', 'BATERIA', 'LCD', 'TACTIL', 'REPUESTOS', 'GENERAL'];
const CATEGORIAS_ACCESORIO = ['CABLE USB', 'CARGADOR', 'FUNDA', 'AURICULARES', 'VIDRIO TEMPLADO', 'SOPORTE', 'ACCESORIOS'];

const MODAL_VACIO = {
  nombre: '',
  categoria: '',
  marca: 'SAMSUNG',
  cantidad: 1,
  costo: 0,
  precioFinal: 0,
  tipo_producto: 'repuesto' as 'repuesto' | 'accesorio',
};

export default function StockPage() {
  const [productos, setProductos] = useState<ProductoStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalForm, setModalForm] = useState(MODAL_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'repuesto' | 'accesorio'>('todos');
  const [filtroMarca, setFiltroMarca] = useState('TODAS');
const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [modalMovimiento, setModalMovimiento] = useState<ProductoStock | null>(null);
  const [cantMovimiento, setCantMovimiento] = useState(1);
const [seleccionados, setSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    cargarStock();
  }, []);

  const cargarStock = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('taller_id', '00000000-0000-0000-0000-000000000000')
      .eq('activo', true)
      .eq('origen', 'stock');

    if (error) { console.error(error); setCargando(false); return; }

    setProductos((data || []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.calidad || p.tipo || 'GENERAL',
      marca: p.marca || 'OTRAS',
      cantidad: p.cantidad || 0,
      costo: p.costo,
      precioFinal: p.precio_final,
      tipo_producto: p.tipo_producto || 'repuesto',
    })));
    setCargando(false);
  };

  const marcasUnicas = useMemo(() => {
    const marcas = new Set(productos.map(p => p.marca));
    return ['TODAS', ...Array.from(marcas).sort()];
  }, [productos]);

  const categoriasFiltradas = useMemo(() => {
    return modalForm.tipo_producto === 'repuesto' ? CATEGORIAS_REPUESTO : CATEGORIAS_ACCESORIO;
  }, [modalForm.tipo_producto]);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const pasaTipo = filtroTipo === 'todos' || p.tipo_producto === filtroTipo;
      const pasaMarca = filtroMarca === 'TODAS' || p.marca === filtroMarca;
      const pasaBusqueda = filtroBusqueda === '' || p.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) || p.marca.toLowerCase().includes(filtroBusqueda.toLowerCase());
      return pasaTipo && pasaMarca && pasaBusqueda;
    });
  }, [productos, filtroTipo, filtroMarca, filtroBusqueda]);

  const abrirModal = () => {
    setModalForm(MODAL_VACIO);
    setModalAbierto(true);
  };

  const handleModalChange = (campo: keyof typeof MODAL_VACIO, valor: string | number) => {
    setModalForm(prev => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'tipo_producto') next.categoria = '';
      if (campo === 'costo' || campo === 'precioFinal') {
        // solo actualiza el campo tocado
      }
      return next;
    });
  };

  const guardarProducto = async () => {
    if (!modalForm.nombre.trim()) { alert('El nombre es obligatorio.'); return; }
    if (modalForm.costo <= 0) { alert('El costo debe ser mayor a 0.'); return; }
    if (modalForm.cantidad <= 0) { alert('La cantidad debe ser mayor a 0.'); return; }

    setGuardando(true);
    const { data, error } = await supabase.from('productos').insert([{
      nombre: modalForm.nombre.trim(),
      tipo: modalForm.categoria,
      calidad: modalForm.categoria,
      marca: modalForm.marca,
      con_marco: modalForm.nombre.toUpperCase().includes('CON MARCO'),
      costo: modalForm.costo,
      precio_final: modalForm.precioFinal,
      cantidad: modalForm.cantidad,
      activo: true,
      origen: 'stock',
      tipo_producto: modalForm.tipo_producto,
      taller_id: '00000000-0000-0000-0000-000000000000',
    }]).select().single();

    setGuardando(false);

    if (error) { alert('Error al guardar: ' + error.message); return; }

    setProductos(prev => [{
      id: data.id,
      nombre: modalForm.nombre.trim(),
      categoria: modalForm.categoria,
      marca: modalForm.marca,
      cantidad: modalForm.cantidad,
      costo: modalForm.costo,
      precioFinal: modalForm.precioFinal,
      tipo_producto: modalForm.tipo_producto,
    }, ...prev]);

    setModalAbierto(false);
    setModalForm(MODAL_VACIO);
  };

  const aplicarMovimiento = async (tipo: 'entrada' | 'salida') => {
    if (!modalMovimiento) return;
    const nuevaCantidad = tipo === 'entrada'
      ? modalMovimiento.cantidad + cantMovimiento
      : modalMovimiento.cantidad - cantMovimiento;

    if (nuevaCantidad < 0) { alert('No podés tener cantidad negativa.'); return; }

    const { error } = await supabase
      .from('productos')
      .update({ cantidad: nuevaCantidad })
      .eq('id', modalMovimiento.id);

    if (error) { alert('Error: ' + error.message); return; }

    setProductos(prev => prev.map(p =>
      p.id === modalMovimiento.id ? { ...p, cantidad: nuevaCantidad } : p
    ));
    setModalMovimiento(null);
    setCantMovimiento(1);
  };

  const toggleSeleccion = (id: string) => {
  setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
};

const toggleTodos = () => {
  if (seleccionados.length === productosFiltrados.length) {
    setSeleccionados([]);
  } else {
    setSeleccionados(productosFiltrados.map(p => p.id));
  }
};

const borrarSeleccionados = async () => {
  if (seleccionados.length === 0) return;
  const confirmar = window.confirm(`¿Borrar ${seleccionados.length} producto${seleccionados.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`);
  if (!confirmar) return;

  const LOTE = 100;
  for (let i = 0; i < seleccionados.length; i += LOTE) {
    const lote = seleccionados.slice(i, i + LOTE);
    const { error } = await supabase.from('productos').delete().in('id', lote);
    if (error) { alert('Error: ' + error.message); return; }
  }

  setProductos(prev => prev.filter(p => !seleccionados.includes(p.id)));
  setSeleccionados([]);
};



 
  const [modalExcel, setModalExcel] = useState(false);
const [excelPreview, setExcelPreview] = useState<ProductoStock[]>([]);
const [excelError, setExcelError] = useState('');

const handleArchivoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);
  if (rows.length === 0) { setExcelError('El archivo está vacío.'); setModalExcel(true); return; }
  const cols = Object.keys(rows[0]);
  const find = (...keywords: string[]) =>
    cols.find(c => keywords.some(k => c.toLowerCase().includes(k))) || '';
  const colRepuesto  = find('repuesto', 'descripcion', 'descripción', 'articulo', 'artículo');
  const colModelo    = find('modelo');
  const colNombre    = find('nombre', 'producto');
  const colCosto     = find('costo', 'precio costo', 'compra');
  const colPrecio    = find('precio venta', 'venta', 'precio');
  const colMarca     = find('marca');
  const colCategoria = find('categoria', 'categoría', 'tipo', 'rubro');
  const colCantidad  = find('cantidad', 'stock', 'qty');

  const tieneNombreBase = colRepuesto || colNombre;
  const tieneModelo = !!colModelo;

  if (!tieneNombreBase || !colCosto) {
    setExcelError(`No se encontraron las columnas obligatorias.\n\nTu Excel tiene: ${cols.join(', ')}\n\nNecesitás al menos una columna "Nombre" o "Repuesto", y una columna "Costo".`);
    setExcelPreview([]);
    setModalExcel(true);
    return;
  }

  const detectarCategoria = (texto: string): string => {
    const t = texto.toUpperCase();
    if (t.includes('OLED')) return 'OLED';
    if (t.includes('INCELL') || t.includes('IN-CELL')) return 'INCELL';
    if (t.includes('GX')) return 'GX';
    if (t.includes('MODULO') || t.includes('PANTALLA') || t.includes('LCD') || t.includes('TACTIL')) return 'PANTALLAS';
    if (t.includes('BATERIA') || t.includes('BATERÍA')) return 'BATERIAS';
    if (t.includes('CARGADOR')) return 'CARGADORES';
    if (t.includes('CABLE')) return 'CABLES';
    if (t.includes('AURICULAR')) return 'AURICULARES';
    if (t.includes('FUNDA')) return 'FUNDAS';
    if (t.includes('VIDRIO') || t.includes('TEMPLADO')) return 'VIDRIOS TEMPLADOS';
    return 'GENERAL';
  };

  const productos = rows.map(r => {
    const repuesto = colRepuesto ? String(r[colRepuesto] || '').trim() : '';
    const modelo   = tieneModelo ? String(r[colModelo!] || '').trim() : '';
    const nombreBase = colNombre ? String(r[colNombre] || '').trim() : '';
    const nombre = repuesto && modelo
      ? `${repuesto} ${modelo}`.trim().toUpperCase()
      : repuesto || nombreBase;
    const textoCategoria = colCategoria ? String(r[colCategoria] || '') : '';
    const categoria = textoCategoria
      ? textoCategoria.toUpperCase().trim()
      : detectarCategoria(nombre);
    return {
      id: '',
      nombre,
      marca: colMarca ? String(r[colMarca] || 'OTRAS').toUpperCase().trim() : 'OTRAS',
      categoria,
      cantidad: colCantidad ? Number(r[colCantidad] || 0) : 0,
      costo: Number(r[colCosto] || 0),
      precioFinal: colPrecio ? Number(r[colPrecio] || 0) : 0,
      tipo_producto: 'repuesto' as const,
    };
  }).filter(r => r.nombre && r.costo > 0);
  if (productos.length === 0) {
    setExcelError('No se encontraron filas válidas. Verificá que las celdas de Nombre y Costo no estén vacías.');
    setExcelPreview([]);
    setModalExcel(true);
    return;
  }
  setExcelError('');
  setExcelPreview(productos);
  setModalExcel(true);
};

const handleImportarExcelConfirmar = async () => {
  const nuevos = excelPreview.map(p => ({
    nombre: p.nombre,
    tipo: p.categoria,
    calidad: p.categoria,
    marca: p.marca,
    cantidad: p.cantidad,
    costo: p.costo,
    precio_final: p.precioFinal,
    origen: 'stock',
    tipo_producto: 'repuesto',
    activo: true,
    con_marco: false,
    taller_id: '00000000-0000-0000-0000-000000000000',
  }));
  const { error } = await supabase.from('productos').insert(nuevos);
  if (error) { alert('Error: ' + error.message); return; }
  setModalExcel(false);
  setExcelPreview([]);
  cargarStock();
};
  const stockTotal = productos.reduce((acc, p) => acc + (p.cantidad || 0), 0);
  const sinStock = productos.filter(p => p.cantidad === 0).length;
  const stockBajo = productos.filter(p => p.cantidad > 0 && p.cantidad <= 3).length;

  return (
    <div className="p-6 space-y-6 text-slate-200">

      {/* ── MODAL MOVIMIENTO ── */}
      {/* ── MODAL MAPEO EXCEL ── */}
{modalExcel && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">📊 Importar desde Excel</h2>
        <button onClick={() => setModalExcel(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
      </div>
      <div className="px-6 py-5">
        {excelError ? (
          <div className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 font-medium mb-1">⚠️ No se pudo leer el archivo</p>
              <p className="text-slate-300 text-sm whitespace-pre-line">{excelError}</p>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4">
              <p className="text-slate-400 text-sm font-medium mb-2">📋 Formato recomendado para el Excel:</p>
              <table className="w-full text-xs text-center">
                <thead>
                  <tr className="text-emerald-400">
                    {['Nombre', 'Marca', 'Categoría', 'Cantidad', 'Costo', 'Precio Venta'].map(h => (
                      <th key={h} className="py-1 px-2 bg-slate-800 border border-slate-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-400">
                    {['MODULO SAMSUNG A54', 'SAMSUNG', 'MODULO', '2', '45000', '70000'].map((v, i) => (
                      <td key={i} className="py-1 px-2 border border-slate-700">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              ✅ Se detectaron <span className="text-emerald-400 font-bold">{excelPreview.length} productos</span> válidos. Revisá la preview antes de importar:
            </p>
            <div className="overflow-x-auto max-h-64 rounded-xl border border-slate-700">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 sticky top-0">
                  <tr>
                    {['Nombre', 'Marca', 'Categoría', 'Cant.', 'Costo', 'Precio Venta'].map(h => (
                      <th key={h} className="px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {excelPreview.slice(0, 5).map((p, i) => (
                    <tr key={i} className="text-slate-300">
                      <td className="px-3 py-2">{p.nombre}</td>
                      <td className="px-3 py-2">{p.marca}</td>
                      <td className="px-3 py-2 text-blue-400 text-xs">{p.categoria}</td>
                      <td className="px-3 py-2 text-center">{p.cantidad}</td>
                      <td className="px-3 py-2">${p.costo.toLocaleString('es-AR')}</td>
                      <td className="px-3 py-2 text-emerald-400">${p.precioFinal.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {excelPreview.length > 5 && (
              <p className="text-xs text-slate-500 text-center">... y {excelPreview.length - 5} productos más</p>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
        <button onClick={() => setModalExcel(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancelar</button>
        {!excelError && (
          <button onClick={handleImportarExcelConfirmar} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium">
            ✅ Confirmar e importar {excelPreview.length} productos
          </button>
        )}
      </div>
    </div>
  </div>
)}
      {modalMovimiento && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalMovimiento(null); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Movimiento de stock</h2>
              <button onClick={() => setModalMovimiento(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-slate-300 font-medium">{modalMovimiento.nombre}</p>
              <p className="text-sm text-slate-400">Stock actual: <span className="text-white font-bold">{modalMovimiento.cantidad}</span></p>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={cantMovimiento}
                  onChange={(e) => setCantMovimiento(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => aplicarMovimiento('entrada')}
                  className="py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg font-bold hover:bg-emerald-500/30 transition-colors"
                >
                  ＋ Entrada
                </button>
                <button
                  onClick={() => aplicarMovimiento('salida')}
                  className="py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg font-bold hover:bg-red-500/30 transition-colors"
                >
                  － Salida / Uso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR ── */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAbierto(false); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Agregar al stock</h2>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModalChange('tipo_producto', 'repuesto')}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    modalForm.tipo_producto === 'repuesto'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  🔧 Repuesto
                </button>
                <button
                  type="button"
                  onClick={() => handleModalChange('tipo_producto', 'accesorio')}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    modalForm.tipo_producto === 'accesorio'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  🎧 Accesorio
                </button>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={modalForm.nombre}
                  onChange={(e) => handleModalChange('nombre', e.target.value)}
                  placeholder={modalForm.tipo_producto === 'repuesto' ? 'Ej: MODULO SAMSUNG A54 OLED' : 'Ej: CABLE USB-C 1M REFORZADO'}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Marca + Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Marca</label>
                  <input
                    type="text"
                    list="marcas-stock-list"
                    value={modalForm.marca}
                    onChange={(e) => handleModalChange('marca', e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="marcas-stock-list">
                    {MARCAS_OPCIONES.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    list="categorias-stock-list"
                    value={modalForm.categoria}
                    onChange={(e) => handleModalChange('categoria', e.target.value.toUpperCase())}
                    placeholder="Escribí o elegí"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-blue-400 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="categorias-stock-list">
                    {categoriasFiltradas.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Cantidad + Costo + Precio */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Cantidad <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={modalForm.cantidad}
                    onChange={(e) => handleModalChange('cantidad', Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Costo <span className="text-red-400">*</span></label>
                  <div className="flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-emerald-500">
                    <span className="text-slate-400 mr-1 text-sm">$</span>
                    <input
                      type="number"
                      value={modalForm.costo || ''}
                      onChange={(e) => handleModalChange('costo', Number(e.target.value))}
                      className="bg-transparent text-white w-full outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Precio venta</label>
                  <div className="flex items-center bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-emerald-500">
                    <span className="text-emerald-400 mr-1 text-sm">$</span>
                    <input
                      type="number"
                      value={modalForm.precioFinal || ''}
                      onChange={(e) => handleModalChange('precioFinal', Number(e.target.value))}
                      className="bg-transparent text-emerald-400 font-bold w-full outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button onClick={() => setModalAbierto(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={guardarProducto}
                disabled={guardando}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium text-sm"
              >
                {guardando ? 'Guardando...' : '✅ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Stock Propio</h1>
          <p className="text-sm text-slate-400 mt-1">Repuestos y accesorios físicos en el taller.</p>
        </div>
        
  <div className="flex gap-3">
  {seleccionados.length > 0 && (
    <button
      onClick={borrarSeleccionados}
      className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
    >
      🗑️ Borrar {seleccionados.length} seleccionado{seleccionados.length > 1 ? 's' : ''}
    </button>
  )}
  <label className="cursor-pointer px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-sm font-medium">
    📊 Importar Excel
    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleArchivoExcel} />
  </label>
  <button
    onClick={abrirModal}
    className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
  >
    + Agregar al stock
  </button>
</div>

      </div>

      {/* ── MÉTRICAS ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-sm text-slate-400">Total en stock</p>
          <p className="text-3xl font-bold text-white mt-1">{stockTotal}</p>
          <p className="text-xs text-slate-500 mt-1">{productos.length} productos distintos</p>
        </div>
        <div className="bg-slate-800/50 border border-amber-500/20 rounded-xl p-4">
          <p className="text-sm text-slate-400">Stock bajo ⚠️</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{stockBajo}</p>
          <p className="text-xs text-slate-500 mt-1">3 unidades o menos</p>
        </div>
        <div className="bg-slate-800/50 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-slate-400">Sin stock 🔴</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{sinStock}</p>
          <p className="text-xs text-slate-500 mt-1">Cantidad = 0</p>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['todos', 'repuesto', 'accesorio'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                filtroTipo === t
                  ? t === 'todos' ? 'bg-slate-600 border-slate-500 text-white'
                    : t === 'repuesto' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {t === 'todos' ? 'Todos' : t === 'repuesto' ? '🔧 Repuestos' : '🎧 Accesorios'}
            </button>
          ))}
        </div>
        <select
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-blue-400 font-semibold focus:outline-none focus:border-emerald-500"
        >
          {marcasUnicas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o marca..."
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <span className="text-xs text-slate-500 ml-2 shrink-0">
          {productosFiltrados.length} de {productos.length}
        </span>
      </div>

      {/* ── TABLA ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700/50 sticky top-0 z-10">
              <tr>
                <th className="p-4">
                  <input type="checkbox"
                    checked={seleccionados.length === productosFiltrados.length && productosFiltrados.length > 0}
                    onChange={toggleTodos}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Marca</th>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4 text-center">Cantidad</th>
                <th className="p-4">Costo</th>
                <th className="p-4">Precio Venta</th>
                <th className="p-4 text-center">Movimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {cargando ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Cargando stock...</td></tr>
              ) : productosFiltrados.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No hay productos. Agregá el primero con el botón de arriba.</td></tr>
              ) : (
                productosFiltrados.map(p => (
                  <tr key={p.id} className={`hover:bg-slate-800/80 transition-colors ${p.cantidad === 0 ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <input type="checkbox"
                        checked={seleccionados.includes(p.id)}
                        onChange={() => toggleSeleccion(p.id)}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                        p.tipo_producto === 'repuesto'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                      }`}>
                        {p.tipo_producto === 'repuesto' ? '🔧' : '🎧'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-300">{p.marca}</td>
                    <td className="p-4 text-white">{p.nombre}</td>
                    <td className="p-4 text-blue-400 text-xs font-semibold">{p.categoria}</td>
                    <td className="p-4 text-center">
                      <span className={`font-bold text-lg ${
                        p.cantidad === 0 ? 'text-red-400' : p.cantidad <= 3 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {p.cantidad}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">${p.costo.toLocaleString('es-AR')}</td>
                    <td className="p-4 text-emerald-400 font-bold">${p.precioFinal.toLocaleString('es-AR')}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => { setModalMovimiento(p); setCantMovimiento(1); }}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
                      >
                        +/− Mover
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