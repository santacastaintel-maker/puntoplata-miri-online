import { generateId } from '../../utils/idUtils';
import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FolderOpen, Check, Edit3, Trash2, Loader2, FileImage } from 'lucide-react';
import { resizeImage } from '../../utils/mediaUtils';
import { db } from '../../lib/db';
import { api } from '../../lib/apiClient';
import { Producto } from '../../types';

interface PendingPhoto {
    id: string;
    file: File;
    previewUrl: string;
    nombre: string;
    codigo: string;
    categoria_id: string;
    marca: string;
    precio: number;
    stock: number;
    base64?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    categorias: { id: string; nombre: string }[];
    onComplete: () => void;
}

export const BulkPhotoUploader: React.FC<Props> = ({ open, onClose, categorias, onComplete }) => {
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [bulkCategoria, setBulkCategoria] = useState('');
    const [bulkMarca, setBulkMarca] = useState('');
    const [bulkPrecio, setBulkPrecio] = useState(0);
    const [bulkStock, setBulkStock] = useState(1);
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // ── Derive a friendly name from filename ──
    const cleanFileName = (filename: string, folderName?: string): string => {
        // Remove extension
        const base = filename.replace(/\.[^.]+$/, '');
        // Replace underscores and hyphens with spaces
        let clean = base.replace(/[_-]+/g, ' ').trim();
        // If it looks like a camera file (IMG_2034, DSC_0023, etc.), use folder name
        if (/^(IMG|DSC|DCIM|Photo|Screenshot|PXL|WIN|SAM)\s*\d+/i.test(clean) && folderName) {
            return folderName;
        }
        return clean || folderName || 'Producto';
    };

    // ── Generate SKU ──
    const generateSKU = async (prefix: string, index: number): Promise<string> => {
        const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
        return `${cleanPrefix || 'AM'}-${String(index).padStart(3, '0')}`;
    };

    // ── Process files into PendingPhoto list ──
    const processFiles = useCallback(async (files: FileList, folderName?: string) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        // Determine base count from existing products
        const existingCount = await db.productos.count();

        const newPhotos: PendingPhoto[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const nombre = cleanFileName(file.name, folderName);
            const idx = existingCount + pendingPhotos.length + i + 1;
            const codigo = await generateSKU(folderName || nombre, idx);
            const previewUrl = URL.createObjectURL(file);

            // Add index suffix if there are multiple files with same name
            const displayName = imageFiles.length > 1 && folderName
                ? `${folderName} ${String(i + 1).padStart(2, '0')}`
                : nombre;

            newPhotos.push({
                id: generateId(),
                file,
                previewUrl,
                nombre: displayName,
                codigo,
                categoria_id: bulkCategoria,
                marca: bulkMarca,
                precio: bulkPrecio,
                stock: bulkStock,
            });
        }

        setPendingPhotos(prev => [...prev, ...newPhotos]);
    }, [pendingPhotos.length, bulkCategoria, bulkPrecio, bulkStock]);

    // ── Handle file selection (multiple) ──
    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        processFiles(files);
        e.target.value = ''; // reset for re-use
    };

    // ── Handle folder selection ──
    const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Extract folder name from the first file's path
        const firstPath = files[0].webkitRelativePath || '';
        const folderName = firstPath.split('/')[0] || 'Productos';

        processFiles(files, folderName);
        e.target.value = '';
    };

    // ── Update a single photo's data ──
    const updatePhoto = (id: string, updates: Partial<PendingPhoto>) => {
        setPendingPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    // ── Remove a photo ──
    const removePhoto = (id: string) => {
        setPendingPhotos(prev => {
            const photo = prev.find(p => p.id === id);
            if (photo) URL.revokeObjectURL(photo.previewUrl);
            return prev.filter(p => p.id !== id);
        });
    };

    // ── Apply bulk settings to all photos ──
    const applyBulkSettings = () => {
        setPendingPhotos(prev => prev.map(p => ({
            ...p,
            categoria_id: bulkCategoria || p.categoria_id,
            marca: bulkMarca !== '' ? bulkMarca : p.marca,
            precio: bulkPrecio > 0 ? bulkPrecio : p.precio,
            stock: bulkStock > 0 ? bulkStock : p.stock,
        })));
    };

    // ── Save all photos as products ──
    const handleSaveAll = async () => {
        if (pendingPhotos.length === 0) return;
        setSaving(true);
        setSavedCount(0);

        try {
            for (let i = 0; i < pendingPhotos.length; i++) {
                const photo = pendingPhotos[i];

                // Resize the image
                let base64 = '';
                try {
                    const resized = await resizeImage(photo.file, 400, 400, 0.8);
                    base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(resized);
                    });
                } catch {
                    // Fallback: read original
                    base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(photo.file);
                    });
                }

                const nuevoProd: Producto = {
                    id: generateId(),
                    codigo: photo.codigo,
                    nombre: photo.nombre,
                    descripcion: null,
                    categoria_id: photo.categoria_id || null,
                    precio: photo.precio,
                    stock: photo.stock,
                    foto_url: base64, // local will display this
                    palabras_clave: null,
                    activo: true,
                    marca: photo.marca || null,
                    origen: 'app'
                };

                // Add to Dexie cache
                await db.productos.add(nuevoProd);

                // Add to Sync Queue or upload immediately
                if (navigator.onLine) {
                    try {
                        const file = await resizeImage(photo.file, 400, 400, 0.8);
                        const key = await api.photos.upload(file);
                        nuevoProd.foto_url = key;
                        nuevoProd.foto_key = key;
                        await db.productos.update(nuevoProd.id, { foto_url: key, foto_key: key });
                        await api.productos.create(nuevoProd);
                    } catch {
                        await db.sync_queue.add({ id: generateId(), operacion: 'CREAR_PRODUCTO', payload: nuevoProd, estado: 'pendiente', created_at: new Date().toISOString() });
                    }
                } else {
                    await db.sync_queue.add({ id: generateId(), operacion: 'CREAR_PRODUCTO', payload: nuevoProd, estado: 'pendiente', created_at: new Date().toISOString() });
                }

                setSavedCount(i + 1);
            }

            // Clean up
            pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
            setPendingPhotos([]);
            setSaving(false);
            onComplete();
            onClose();

        } catch (err: any) {
            alert('Error al guardar: ' + (err.message || 'Error desconocido'));
            setSaving(false);
        }
    };

    // ── Clear all ──
    const handleClearAll = () => {
        pendingPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
        setPendingPhotos([]);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">📸 Subida Masiva de Fotos</h2>
                        <p className="text-sm text-slate-500 mt-1">Sube archivos sueltos o una carpeta completa. Los productos se crean automáticamente.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Upload area */}
                    {pendingPhotos.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Individual Files */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-8 border-2 border-dashed border-olivo-300 rounded-2xl bg-olivo-50/50 hover:bg-olivo-50 transition-all flex flex-col items-center gap-3 group"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-olivo-100 text-olivo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileImage className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-olivo-700">Archivos Sueltos</p>
                                    <p className="text-xs text-olivo-500 mt-1">Selecciona 1 a 50 fotos.<br />Ideal si son poquitas.</p>
                                </div>
                            </button>

                            {/* Folder */}
                            <button
                                onClick={() => folderInputRef.current?.click()}
                                className="p-8 border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50/50 hover:bg-blue-50 transition-all flex flex-col items-center gap-3 group"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FolderOpen className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-blue-700">Carpeta Completa</p>
                                    <p className="text-xs text-blue-500 mt-1">Sube una carpeta como "Anillos".<br />Se auto-nombran con SKU.</p>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* ── Bulk Settings Bar ── */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-3 items-end">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Categoría (todas)</label>
                                    <select
                                        value={bulkCategoria}
                                        onChange={e => setBulkCategoria(e.target.value)}
                                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Marca (todas)</label>
                                    <input
                                        type="text"
                                        value={bulkMarca}
                                        onChange={e => setBulkMarca(e.target.value)}
                                        placeholder="Ej: Swarovski..."
                                        className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Precio todas ($)</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={bulkPrecio === 0 ? '' : bulkPrecio}
                                        onChange={e => setBulkPrecio(parseFloat(e.target.value) || 0)}
                                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Stock todas</label>
                                    <input
                                        type="number" min="0"
                                        value={bulkStock === 0 ? '' : bulkStock}
                                        onChange={e => setBulkStock(parseInt(e.target.value) || 0)}
                                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={applyBulkSettings}
                                    className="px-4 py-2 bg-olivo-500 text-white text-sm font-bold rounded-xl hover:bg-olivo-600 transition-colors"
                                >
                                    Aplicar a Todas
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> + Más fotos
                                </button>
                            </div>

                            {/* ── Photo Grid with editable names ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {pendingPhotos.map((photo) => (
                                    <div key={photo.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group relative">
                                        {/* Thumbnail */}
                                        <div className="aspect-square bg-slate-100 relative overflow-hidden">
                                            <img
                                                src={photo.previewUrl}
                                                alt={photo.nombre}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Remove button */}
                                            <button
                                                onClick={() => removePhoto(photo.id)}
                                                className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Info */}
                                        <div className="p-2 space-y-1">
                                            {editingId === photo.id ? (
                                                <input
                                                    type="text" autoFocus
                                                    value={photo.nombre}
                                                    onChange={e => updatePhoto(photo.id, { nombre: e.target.value })}
                                                    onBlur={() => setEditingId(null)}
                                                    onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                                                    className="w-full px-2 py-1 text-xs bg-olivo-50 border border-olivo-300 rounded-lg outline-none focus:ring-1 focus:ring-olivo-500"
                                                />
                                            ) : (
                                                <div
                                                    className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 transition-colors"
                                                    onClick={() => setEditingId(photo.id)}
                                                >
                                                    <p className="text-xs font-bold text-slate-700 truncate flex-1">{photo.nombre}</p>
                                                    <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
                                                </div>
                                            )}
                                            <p className="text-[10px] font-mono text-slate-400 px-1">{photo.codigo}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="text-sm text-slate-600">
                        {saving ? (
                            <span className="flex items-center gap-2 text-olivo-600 font-bold">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Guardando... {savedCount} / {pendingPhotos.length}
                            </span>
                        ) : (
                            <span className="font-medium">
                                {pendingPhotos.length > 0
                                    ? `${pendingPhotos.length} foto${pendingPhotos.length !== 1 ? 's' : ''} listas`
                                    : 'Selecciona fotos para comenzar'
                                }
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {pendingPhotos.length > 0 && !saving && (
                            <button
                                onClick={handleClearAll}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-sm"
                            >
                                Limpiar Todo
                            </button>
                        )}
                        <button
                            onClick={handleSaveAll}
                            disabled={pendingPhotos.length === 0 || saving}
                            className="px-6 py-2.5 bg-olivo-500 hover:bg-olivo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2 shadow-lg shadow-olivo-500/20 disabled:shadow-none"
                        >
                            <Check className="w-4 h-4" />
                            Crear {pendingPhotos.length} Producto{pendingPhotos.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>

                {/* Hidden file inputs */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                />
                <input
                    ref={folderInputRef}
                    type="file"
                    accept="image/*"
                    // @ts-ignore — webkitdirectory is not in standard types
                    webkitdirectory=""
                    className="hidden"
                    onChange={handleFolderSelected}
                />
            </div>
        </div>
    );
};
