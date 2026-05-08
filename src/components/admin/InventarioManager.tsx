import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Plus, Search, Edit3, Trash2, Save, X, Image, Package, Tag, Upload, FileSpreadsheet, Printer, CheckSquare, Square, LayoutGrid, ScrollText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarcodeLabel } from './BarcodeLabel';
import { cn } from '../ui/Button';
import { Producto } from '../../types';
import { db } from '../../lib/db';
import { useCategorias } from '../../hooks/useCategorias';
import { resizeImage } from '../../utils/mediaUtils';
import { BulkPhotoUploader } from './BulkPhotoUploader';

interface ProductoForm {
    codigo: string;
    nombre: string;
    descripcion: string;
    categoria_id: string;
    precio: number;
    stock: number;
    foto_url: string;
    marca: string;
}

const EMPTY_FORM: ProductoForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria_id: '',
    precio: 0,
    stock: 0,
    foto_url: '',
    marca: ''
};

export const InventarioManager = () => {
    const { categorias, crearCategoria } = useCategorias();
    const [productos, setProductos] = useState<Producto[]>([]);
    const [filtro, setFiltro] = useState('');
    const [filtroCat, setFiltroCat] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal/Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductoForm>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Category modal
    const [showBulkUploader, setShowBulkUploader] = useState(false);
    const [isImportingExcel, setIsImportingExcel] = useState(false);
    const excelInputRef = useRef<HTMLInputElement>(null);

    // Category modal
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    // Label printing state
    const [selectedForLabels, setSelectedForLabels] = useState<string[]>([]);
    const [labelQuantities, setLabelQuantities] = useState<Record<string, number>>({});
    const [bulkLabelCopies, setBulkLabelCopies] = useState<number>(1);
    const [printMode, setPrintMode] = useState<'hoja' | 'rollo'>('hoja');
    const [showPrintModal, setShowPrintModal] = useState(false);

    const fetchProductos = async () => {
        setLoading(true);
        let data = await db.productos.toArray();

        // One-time sync for missing default categories (Silent)
        const catsExistentes = await db.categorias.toArray();
        if (catsExistentes.length <= 2) {
            const defaults = [
                { id: 'cat-3', nombre: 'Pulseras', orden_visual: 3 },
                { id: 'cat-4', nombre: 'Aretes', orden_visual: 4 },
                { id: 'cat-5', nombre: 'Sets', orden_visual: 5 },
                { id: 'cat-6', nombre: 'Charms', orden_visual: 6 },
                { id: 'cat-7', nombre: 'Esclavas', orden_visual: 7 },
                { id: 'cat-8', nombre: 'Cadenas', orden_visual: 8 },
                { id: 'cat-9', nombre: 'Dijes', orden_visual: 9 },
                { id: 'cat-10', nombre: 'Gargantillas', orden_visual: 10 },
            ];
            for (const d of defaults) {
                if (!catsExistentes.find(c => c.nombre === d.nombre)) {
                    await db.categorias.add({ ...d, descripcion: null });
                }
            }
            // No reload, just continue
        }

        if (filtroCat) {
            data = data.filter(p => p.categoria_id === filtroCat);
        }
        if (filtroMarca) {
            const mq = filtroMarca.toLowerCase();
            data = data.filter(p => (p.marca || '').toLowerCase().includes(mq));
        }
        if (filtro) {
            const q = filtro.toLowerCase();
            data = data.filter(p =>
                p.nombre.toLowerCase().includes(q) ||
                p.codigo.toLowerCase().includes(q) ||
                (p.marca || '').toLowerCase().includes(q)
            );
        }

        data.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setProductos(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProductos();
    }, [filtro, filtroCat, filtroMarca]);

    // Intervalo de refresco automático (3 minutos)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!showForm && !showCatModal && !showBulkUploader && !showPrintModal) {
                fetchProductos();
            }
        }, 180000); // 180,000 ms = 3 minutos

        return () => clearInterval(interval);
    }, [showForm, showCatModal, showBulkUploader, showPrintModal]);

    const handleOpenNew = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, codigo: `AM-${Date.now().toString(36).toUpperCase()}` });
        setFormError('');
        setShowForm(true);
    };

    const handleEdit = (p: Producto) => {
        setEditingId(p.id);
        setForm({
            codigo: p.codigo,
            nombre: p.nombre,
            descripcion: p.descripcion || '',
            categoria_id: p.categoria_id || '',
            precio: p.precio,
            stock: p.stock,
            foto_url: p.foto_url || '',
            marca: p.marca || ''
        });
        setFormError('');
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este producto? Se marcará como inactivo.')) return;
        await db.productos.update(id, { activo: false });
        fetchProductos();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const resized = await resizeImage(file, 400, 400, 0.8);
            // Convert blob to base64 for local storage
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, foto_url: reader.result as string }));
            };
            reader.readAsDataURL(resized);
        } catch (err) {
            // Fallback: read original
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, foto_url: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!form.nombre.trim() || !form.codigo.trim()) {
            setFormError('Nombre y Código son obligatorios.');
            return;
        }
        if (form.precio <= 0) {
            setFormError('El precio debe ser mayor a 0.');
            return;
        }

        try {
            if (editingId) {
                await db.productos.update(editingId, {
                    codigo: form.codigo,
                    nombre: form.nombre,
                    descripcion: form.descripcion || null,
                    categoria_id: form.categoria_id || null,
                    precio: form.precio,
                    stock: form.stock,
                    foto_url: form.foto_url || null,
                    marca: form.marca || null,
                });
            } else {
                await db.productos.add({
                    id: crypto.randomUUID(),
                    codigo: form.codigo,
                    nombre: form.nombre,
                    descripcion: form.descripcion || null,
                    categoria_id: form.categoria_id || null,
                    precio: form.precio,
                    stock: form.stock,
                    foto_url: form.foto_url || null,
                    palabras_clave: null,
                    activo: true,
                    marca: form.marca || null,
                });
            }
            setShowForm(false);
            fetchProductos();
        } catch (err: any) {
            setFormError(err.message || 'Error al guardar.');
        }
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsImportingExcel(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const bstr = event.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws) as any[];

                    if (data.length === 0) {
                        alert('El archivo está vacío.');
                        return;
                    }

                    if (!confirm(`Se detectaron ${data.length} filas en el Excel. ¿Deseas importarlas al inventario?`)) {
                        return;
                    }

                    let importCount = 0;
                    await db.transaction('rw', db.productos, async () => {
                        for (const row of data) {
                            // Mapeo flexible de columnas comunes (Sabiduría para detectar sinónimos)
                            const findVal = (keys: string[]) => {
                                for (const k of keys) {
                                    if (row[k] !== undefined && row[k] !== null) return row[k];
                                }
                                return null;
                            };

                            const codigo = (findVal(['Codigo', 'codigo', 'SKU', 'sku', 'ID', 'id', 'Ref', 'ref']) || `AM-EX-${Date.now().toString(36)}-${importCount}`).toString();
                            const nombre = (findVal(['Nombre', 'nombre', 'Producto', 'producto', 'Articulo', 'articulo']) || 'Producto sin nombre').toString();
                            const precioVal = findVal(['Precio', 'precio', 'Costo', 'costo', 'Valor', 'valor', 'Importe', 'importe']);
                            const stockVal = findVal(['Stock', 'stock', 'Existencia', 'existencia', 'Cantidad', 'cantidad', 'Cant', 'cant', 'Piezas', 'piezas', 'Pzas', 'pzas', 'Qty', 'qty']);
                            const marcaVal = findVal(['Marca', 'marca', 'Brand', 'brand']);
                            
                            const precio = parseFloat(precioVal?.toString() || '0');
                            const stock = parseInt(stockVal?.toString() || '0');
                            const descripcion = findVal(['Descripcion', 'descripcion', 'Notas', 'notas', 'Comentarios', 'comentarios'])?.toString() || null;
                            const marca = marcaVal?.toString() || null;

                            await db.productos.add({
                                id: crypto.randomUUID(),
                                codigo,
                                nombre,
                                descripcion,
                                categoria_id: filtroCat || null, // Usar categoría actual del filtro si existe
                                precio: isNaN(precio) ? 0 : precio,
                                stock: isNaN(stock) ? 0 : stock,
                                foto_url: null,
                                palabras_clave: null,
                                activo: true,
                                origen: 'excel',
                                marca: marca
                            });
                            importCount++;
                        }
                    });

                    alert(`¡Éxito! Se importaron ${importCount} productos.`);
                    fetchProductos();
                } catch (err) {
                    console.error(err);
                    alert('Error al procesar el contenido del Excel. Asegúrate de que las columnas tengan encabezados como "Nombre", "Codigo", "Precio", "Stock".');
                } finally {
                    setIsImportingExcel(false);
                    if (excelInputRef.current) excelInputRef.current.value = '';
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            alert('Error al leer el archivo.');
            setIsImportingExcel(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        await crearCategoria({ nombre: newCatName.trim(), descripcion: null, orden_visual: categorias.length + 1 });
        setNewCatName('');
        setShowCatModal(false);
    };

    const getCategoryName = (catId: string | null) => {
        if (!catId) return 'Sin categoría';
        return categorias.find(c => c.id === catId)?.nombre || 'Sin categoría';
    };

    const handleDownloadRolloPDF = async () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [60, 11]
        });

        const selectedProducts = productos.filter(p => selectedForLabels.includes(p.id));
        let isFirstPage = true;
        const canvas = document.createElement('canvas');

        selectedProducts.forEach(p => {
            const copies = labelQuantities[p.id] || 1;
            for (let i = 0; i < copies; i++) {
                if (!isFirstPage) {
                    doc.addPage([60, 11], 'landscape');
                }
                isFirstPage = false;

                // 1. Nombre (Arriba centrado en los 15mm)
                doc.setFontSize(5);
                doc.setTextColor(51, 65, 85);
                const shortName = p.nombre.length > 20 ? p.nombre.substring(0, 18) + '..' : p.nombre;
                doc.text(shortName.toUpperCase(), 7.5, 2.2, { align: 'center' });

                // 2. Código de Barras (Centro de los 15mm)
                JsBarcode(canvas, p.codigo.toUpperCase(), {
                    format: "CODE128",
                    width: 2,
                    height: 40,
                    displayValue: true,
                    fontSize: 16,
                    margin: 0
                });
                const barcodeImg = canvas.toDataURL("image/png");
                doc.addImage(barcodeImg, 'PNG', 1, 3, 13, 5);

                // 3. Precio (Abajo centrado en los 15mm)
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(128, 133, 75);
                doc.text(`$${p.precio.toFixed(2)}`, 7.5, 10, { align: 'center' });

                // El resto (15mm a 60mm) queda blanco
            }
        });

        doc.save(`Etiquetas_Joyeria_${Date.now()}.pdf`);
    };

    const handleExportBarTender = () => {
        const selectedProducts = productos.filter(p => selectedForLabels.includes(p.id));
        if (selectedProducts.length === 0) return;

        const data: any[] = [];
        selectedProducts.forEach(p => {
            const copies = labelQuantities[p.id] || 1;
            for (let i = 0; i < copies; i++) {
                data.push({
                    Codigo: p.codigo,
                    Nombre: p.nombre,
                    Precio: p.precio,
                    Marca: p.marca || ''
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Etiquetas");
        
        // El nombre fijo solicitado:
        XLSX.writeFile(wb, "mirietiquetas.xlsx");
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-1 w-full sm:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código..."
                            value={filtro}
                            onChange={e => setFiltro(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none"
                        />
                    </div>
                    <select
                        value={filtroCat}
                        onChange={e => setFiltroCat(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none"
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Filtrar por marca..."
                        value={filtroMarca}
                        onChange={e => setFiltroMarca(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none w-36"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setShowCatModal(true)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <Tag className="w-4 h-4" /> Categorías
                    </button>
                    <button
                        onClick={() => setShowBulkUploader(true)}
                        className="px-4 py-2.5 bg-olivo-500 hover:bg-olivo-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Upload className="w-4 h-4" /> 📸 Fotos Masiva
                    </button>
                    <button
                        onClick={() => excelInputRef.current?.click()}
                        disabled={isImportingExcel}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isImportingExcel ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div> Procesando...</span>
                        ) : (
                            <><FileSpreadsheet className="w-4 h-4" /> 📊 Importar Inventario</>
                        )}
                    </button>
                    <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} />
                    <button
                        onClick={handleOpenNew}
                        className="px-4 py-2.5 bg-[#80854b] hover:bg-[#64683a] text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Producto
                    </button>
                    {selectedForLabels.length > 0 && (
                        <button
                            onClick={() => setShowPrintModal(true)}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm animate-bounce"
                        >
                            <Printer className="w-4 h-4" /> Imprimir {selectedForLabels.length} Etiquetas
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{productos.length}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Productos visibles</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-black text-[#80854b]">{categorias.length}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categorías</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-black text-olivo-600">{productos.reduce((s, p) => s + p.stock, 0)}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Piezas en Stock</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <p className="text-2xl font-black text-amber-600">${productos.reduce((s, p) => s + (p.precio * p.stock), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valor inventario</p>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">Cargando...</div>
            ) : productos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">Sin productos todavía</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-4">Haz clic en "Nuevo Producto" para añadir tu primera joya.</p>
                    <button onClick={handleOpenNew} className="px-6 py-2.5 bg-[#80854b] text-white rounded-xl font-bold text-sm hover:bg-[#64683a] transition-colors">
                        <Plus className="w-4 h-4 inline mr-1" /> Agregar
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {productos.filter(p => p.activo).map(p => (
                        <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden group hover:shadow-lg transition-shadow">
                            {/* Image */}
                            <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                {p.foto_url ? (
                                    <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-12 h-12 text-slate-300" />
                                    </div>
                                )}
                                {/* Actions overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button onClick={() => handleEdit(p)} className="p-2.5 bg-white rounded-full text-slate-700 hover:bg-[#80854b]/10 hover:text-[#80854b] transition-colors shadow-lg">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-white rounded-full text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Stock badge */}
                                <div className={cn(
                                    "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold",
                                    p.stock > 0 ? "bg-[#80854b]/10 text-[#80854b]" : "bg-rose-100 text-rose-700"
                                )}>
                                    {p.stock > 0 ? `${p.stock} pzas` : 'Agotado'}
                                </div>
                                {/* Selection checkbox */}
                                <button 
                                    onClick={() => {
                                        setSelectedForLabels(prev => {
                                            const isSelected = prev.includes(p.id);
                                            if (isSelected) {
                                                return prev.filter(id => id !== p.id);
                                            } else {
                                                setLabelQuantities(q => ({ ...q, [p.id]: 1 }));
                                                return [...prev, p.id];
                                            }
                                        });
                                    }}
                                    className={cn(
                                        "absolute top-2 left-2 p-1.5 rounded-lg shadow-md transition-colors",
                                        selectedForLabels.includes(p.id) ? "bg-amber-500 text-white" : "bg-white/80 text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {selectedForLabels.includes(p.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </button>
                            </div>
                            {/* Info */}
                            <div className="p-4">
                                <p className="text-xs font-mono text-slate-400 mb-1">{p.codigo}</p>
                                <h4 className="font-bold text-slate-800 truncate">{p.nombre}</h4>
                                <div className="flex items-center justify-between mt-0.5 gap-1">
                                    <p className="text-xs text-slate-500">{getCategoryName(p.categoria_id)}</p>
                                    {p.marca && (
                                        <span className="text-[10px] font-bold bg-olivo-50 text-olivo-700 px-1.5 py-0.5 rounded-full border border-olivo-200 truncate max-w-[70px]">{p.marca}</span>
                                    )}
                                </div>
                                <p className="text-lg font-black text-[#80854b] mt-2">${p.precio.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== MODAL: Producto Form ===== */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Image preview + upload */}
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#80854b] transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {form.foto_url ? (
                                        <img src={form.foto_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Image className="w-8 h-8 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-sm font-semibold text-[#80854b] hover:text-[#64683a]"
                                    >
                                        {form.foto_url ? 'Cambiar Imagen' : 'Subir Imagen'}
                                    </button>
                                    <p className="text-xs text-slate-400 mt-1">JPG, PNG. Se redimensiona a 400px automáticamente.</p>
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>

                            {/* Código */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Código (SKU)</label>
                                <input
                                    type="text"
                                    value={form.codigo}
                                    onChange={e => setForm({ ...form, codigo: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm font-mono"
                                    placeholder="AM-001"
                                />
                            </div>

                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto</label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm"
                                    placeholder="Anillo de Plata 925 con Zirconia"
                                />
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción (opcional)</label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm resize-none"
                                    placeholder="Descripción breve..."
                                />
                            </div>

                            {/* Marca */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Marca (opcional)</label>
                                <input
                                    type="text"
                                    value={form.marca}
                                    onChange={e => setForm({ ...form, marca: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm"
                                    placeholder="Ej: Swarovski, Pandora, Propia..."
                                />
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                                <select
                                    value={form.categoria_id}
                                    onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm"
                                >
                                    <option value="">Seleccionar...</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>

                            {/* Precio + Stock */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Precio ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.precio === 0 ? '' : form.precio}
                                        onFocus={e => e.target.select()}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setForm({ ...form, precio: parseFloat(val) || 0 });
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Stock (piezas)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.stock === 0 ? '' : form.stock}
                                        onFocus={e => e.target.select()}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setForm({ ...form, stock: parseInt(val) || 0 });
                                        }}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#80854b] outline-none text-sm font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium">{formError}</div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 bg-[#80854b] hover:bg-[#64683a] text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: Categorías ===== */}
            {showCatModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCatModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Categorías</h2>
                            <button onClick={() => setShowCatModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="p-6">
                            <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                {categorias.map(c => (
                                    <li key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <span className="text-sm font-medium text-slate-700">{c.nombre}</span>
                                        <button onClick={async () => {
                                            if (confirm(`¿Eliminar la categoría "${c.nombre}"?`)) {
                                                await db.categorias.delete(c.id);
                                            }
                                        }} className="text-rose-400 hover:text-rose-600 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                                {categorias.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay categorías aún.</p>}
                            </ul>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    placeholder="Nueva categoría..."
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none"
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                />
                                <button onClick={handleAddCategory} className="px-4 py-2.5 bg-[#80854b] text-white rounded-xl font-bold text-sm hover:bg-[#64683a] transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: Subida Masiva ===== */}
            <BulkPhotoUploader
                open={showBulkUploader}
                onClose={() => setShowBulkUploader(false)}
                categorias={categorias}
                onComplete={fetchProductos}
            />

            {/* ===== MODAL: Impresión de Etiquetas ===== */}
            {showPrintModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Generador de Etiquetas</h2>
                                <p className="text-sm text-slate-500">
                                    {printMode === 'hoja' ? 'Mosaico para hojas' : 'Modo Rollo (Ribetec)'} - {selectedForLabels.length} productos.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 bg-slate-100/50 p-2 rounded-2xl border border-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-wider">Modo de Impresión</span>
                                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setPrintMode('hoja')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200", 
                                            printMode === 'hoja' ? "bg-white text-olivo-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                        )}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                        Hoja (Mosaico)
                                    </button>
                                    <button 
                                        onClick={() => setPrintMode('rollo')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200", 
                                            printMode === 'rollo' ? "bg-white text-olivo-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                        )}
                                    >
                                        <ScrollText className="w-3.5 h-3.5" />
                                        Rollo (Ribetec)
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase px-2">Copias rápidas:</span>
                                <input 
                                    type="number" min="1" max="100"
                                    value={bulkLabelCopies}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 1;
                                        setBulkLabelCopies(val);
                                        const next: Record<string, number> = {};
                                        selectedForLabels.forEach(id => next[id] = val);
                                        setLabelQuantities(next);
                                    }}
                                    className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-olivo-500"
                                />
                                <button 
                                    onClick={() => {
                                        const next: Record<string, number> = {};
                                        selectedForLabels.forEach(id => next[id] = bulkLabelCopies);
                                        setLabelQuantities(next);
                                    }}
                                    className="px-3 py-1 bg-olivo-500 text-white text-xs font-bold rounded-lg hover:bg-olivo-600 transition-colors"
                                >
                                    Aplicar a todos
                                </button>
                            </div>
                            <button onClick={() => setShowPrintModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors self-end sm:self-center">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
                            {/* Editor de cantidades (Solo pantalla) */}
                            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
                                {productos.filter(p => selectedForLabels.includes(p.id)).map(p => (
                                    <div key={`qty-${p.id}`} className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex-shrink-0 flex items-center justify-center border border-slate-100 overflow-hidden">
                                                {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <Tag className="w-5 h-5 text-slate-300" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{p.nombre}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{p.codigo}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => setLabelQuantities(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }))}
                                                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                                            >-</button>
                                            <input 
                                                type="number" min="1"
                                                value={labelQuantities[p.id] || 1}
                                                onChange={e => setLabelQuantities(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 1 }))}
                                                className="w-10 text-center text-sm font-bold bg-transparent outline-none"
                                            />
                                            <button 
                                                onClick={() => setLabelQuantities(prev => ({ ...prev, [p.id]: (prev[p.id] || 1) + 1 }))}
                                                className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                                            >+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* El Mosaico o Rollo Real */}
                            <div 
                                className={cn(
                                    "bg-white p-4 sm:p-8 rounded-3xl shadow-inner min-h-[100px] mx-auto print:shadow-none print:p-0 print:m-0",
                                    printMode === 'hoja' ? "flex flex-wrap gap-[1mm] print:gap-[0.5mm] justify-center sm:justify-start w-full max-w-[210mm]" : "flex flex-col items-center w-full max-w-[65mm]"
                                )} 
                                id="labels-to-print"
                            >
                                {productos.filter(p => selectedForLabels.includes(p.id)).flatMap(p => {
                                    const copies = labelQuantities[p.id] || 1;
                                    return Array.from({ length: copies }).map((_, i) => (
                                        <div key={`${p.id}-${i}`} className={cn("print:m-0", printMode === 'rollo' && "print:break-after-page")}>
                                            <BarcodeLabel 
                                                codigo={p.codigo} 
                                                nombre={p.nombre} 
                                                precio={p.precio} 
                                                ancho={printMode === 'rollo' ? '60mm' : '15mm'}
                                            />
                                        </div>
                                    ));
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 print:hidden">
                            <button
                                onClick={() => setSelectedForLabels([])}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                            >
                                Limpiar Selección
                            </button>
                            {printMode === 'rollo' ? (
                                <div className="flex-1 flex gap-2">
                                    <button
                                        onClick={handleExportBarTender}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <FileSpreadsheet className="w-5 h-5" />
                                        Excel para BarTender
                                    </button>
                                    <button
                                        onClick={handleDownloadRolloPDF}
                                        className="flex-1 py-3 bg-olivo-600 hover:bg-olivo-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <FileSpreadsheet className="w-5 h-5" />
                                        PDF Rollo (60x11mm)
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-5 h-5" />
                                    Imprimir Etiquetas Ahora
                                </button>
                            )}
                        </div>
                    </div>

                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #labels-to-print, #labels-to-print * {
                                visibility: visible;
                            }
                             #labels-to-print {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                display: ${printMode === 'hoja' ? 'flex' : 'block'} !important;
                                flex-wrap: wrap !important;
                                gap: 0.5mm !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                background: white !important;
                                justify-content: flex-start !important;
                            }
                            ${printMode === 'rollo' ? `
                            @page {
                                size: 60mm 11mm;
                                margin: 0;
                            }
                            #labels-to-print > div {
                                width: 60mm !important;
                                height: 11mm !important;
                                break-after: page;
                            }
                            ` : `
                            #labels-to-print > div {
                                width: 15mm !important;
                                height: 11mm !important;
                                page-break-inside: avoid;
                            }
                            `}
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};
