import { generateId } from '../../utils/idUtils';
import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { api } from '../../lib/apiClient';
import { Vendedor } from '../../types';
import { Plus, Edit3, Save, X, ShieldAlert } from 'lucide-react';

export const VendedoresManager = () => {
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
        nombre: '',
        color: '#10B981',
        pin: '',
        confirmPin: ''
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchVendedores();
    }, []);

    const fetchVendedores = async () => {
        setLoading(true);
        const data = await db.vendedores.toArray();
        // Ordenar: Admin primero, luego los demás por nombre
        data.sort((a, b) => {
            if (a.rol === 'admin') return -1;
            if (b.rol === 'admin') return 1;
            return a.nombre.localeCompare(b.nombre);
        });
        setVendedores(data);
        setLoading(false);
    };

    const handleOpenNew = () => {
        setEditingId(null);
        setForm({
            nombre: '',
            color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            pin: '',
            confirmPin: ''
        });
        setFormError('');
        setShowForm(true);
    };

    const handleEdit = (v: Vendedor) => {
        setEditingId(v.id);
        setForm({
            nombre: v.nombre,
            color: v.color_identificador,
            pin: '', // No mostramos el pin actual por seguridad
            confirmPin: ''
        });
        setFormError('');
        setShowForm(true);
    };

    const handleToggleActivo = async (v: Vendedor) => {
        if (v.rol === 'admin') return; // No se puede desactivar al admin
        const confirmMsg = v.activo 
            ? `¿Desactivar a ${v.nombre}? No podrá iniciar sesión.`
            : `¿Reactivar a ${v.nombre}?`;
        if (!confirm(confirmMsg)) return;
        
        await db.vendedores.update(v.id, { activo: !v.activo });
        try {
            await api.vendedores.update(v.id, { activo: !v.activo });
        } catch (e) {
            console.error('Error syncing vendedor activo', e);
        }
        fetchVendedores();
    };

    const handleSave = async () => {
        if (!form.nombre.trim()) {
            setFormError('El nombre es obligatorio.');
            return;
        }

        if (!editingId || (form.pin || form.confirmPin)) {
            // Si es nuevo, o si está editando e ingresó algo en PIN
            if (form.pin !== form.confirmPin) {
                setFormError('Los NIPs no coinciden.');
                return;
            }
            if (form.pin.length !== 4) {
                setFormError('El NIP debe ser exactamente de 4 dígitos.');
                return;
            }
        }

        try {
            if (editingId) {
                const updates: any = {
                    nombre: form.nombre,
                    color_identificador: form.color
                };
                if (form.pin) {
                    updates.pin_auth = form.pin;
                }
                await db.vendedores.update(editingId, updates);
                try {
                    await api.vendedores.update(editingId, updates);
                } catch (e) {
                    console.error('Error syncing vendedor', e);
                }
            } else {
                if (!form.pin) {
                    setFormError('Debes asignar un NIP a la vendedora.');
                    return;
                }
                const newId = generateId();
                const nuevo = {
                    id: newId,
                    nombre: form.nombre,
                    email: null,
                    color_identificador: form.color,
                    rol: 'vendedor' as const,
                    activo: true,
                    pin_auth: form.pin
                };
                await db.vendedores.add(nuevo);
                try {
                    await api.vendedores.create(nuevo);
                } catch (e) {
                    console.error('Error creating vendedor', e);
                }
            }
            setShowForm(false);
            fetchVendedores();
        } catch (err: any) {
            setFormError(err.message || 'Error al guardar.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Gestión de Personal</h2>
                    <p className="text-sm text-slate-500 mt-1">Administra accesos y NIPs individuales.</p>
                </div>
                <button
                    onClick={handleOpenNew}
                    className="px-4 py-2.5 bg-olivo-500 hover:bg-olivo-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Agregar Vendedora
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Cargando personal...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendedores.map(v => (
                        <div key={v.id} className={`bg-white rounded-2xl border p-5 flex flex-col transition-all ${!v.activo ? 'border-dashed border-slate-300 opacity-60 bg-slate-50' : 'border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center gap-4 mb-4">
                                <div 
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold font-serif shadow-inner shrink-0"
                                    style={{ backgroundColor: v.color_identificador || '#CBD5E1' }}
                                >
                                    {v.nombre?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate">{v.nombre}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                                        {v.rol === 'admin' ? 'Dueño (Admin)' : 'Vendedora'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
                                {v.rol !== 'admin' && (
                                    <>
                                        <button 
                                            onClick={() => handleEdit(v)}
                                            className="p-2 text-slate-400 hover:bg-olivo-50 hover:text-olivo-600 rounded-lg transition-colors"
                                            title="Editar y cambiar NIP"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleToggleActivo(v)}
                                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors text-center ${
                                                v.activo 
                                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                                                : 'bg-olivo-50 text-olivo-600 hover:bg-olivo-100'
                                            }`}
                                        >
                                            {v.activo ? 'Desactivar' : 'Activar Acceso'}
                                        </button>
                                    </>
                                )}
                                {v.rol === 'admin' && (
                                    <div className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 bg-slate-50 py-1.5 rounded-lg">
                                        <ShieldAlert className="w-4 h-4" /> Administrador Principal
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Editar/Nuevo */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Personal' : 'Nueva Vendedora'}</h2>
                            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 outline-none"
                                    placeholder="Ej. María López"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Color de Perfil</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={form.color}
                                        onChange={e => setForm({ ...form, color: e.target.value })}
                                        className="h-10 w-14 rounded cursor-pointer border-0 p-0"
                                    />
                                    <span className="text-xs text-slate-500">Escoge un color que identifique a la vendedora en el inicio.</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    {editingId ? 'Cambiar NIP (dejar en blanco si no cambia)' : 'NIP de Ingreso (4 dígitos)'}
                                </label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={form.pin}
                                    onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 outline-none text-center text-xl tracking-[0.5em] font-bold"
                                    placeholder="****"
                                />
                            </div>

                            {(form.pin.length > 0 || !editingId) && (
                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wider text-center">
                                        Confirmar NIP
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={form.confirmPin}
                                        onChange={e => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, '') })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 outline-none text-center text-xl tracking-[0.5em] font-bold"
                                        placeholder="****"
                                    />
                                </div>
                            )}

                            {formError && (
                                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium text-center">
                                    {formError}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100">
                            <button
                                onClick={handleSave}
                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? 'Guardar Cambios' : 'Crear Vendedora'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
