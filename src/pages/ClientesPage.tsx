import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Phone, History, ArrowLeft, Trash2, MoreVertical, ShoppingBag, X, Package } from 'lucide-react';
import { useClientes } from '../hooks/useClientes';
import { Cliente, Venta } from '../types';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';

type SortMode = 'recientes' | 'mas_gastado' | 'mas_compras' | 'mas_apartados';

// 🚦 Semáforo logic
const getSemaforoColor = (c: Cliente) => {
    if ((c.cancelaciones || 0) >= 3) return 'red';
    if ((c.apartados_pendientes || 0) > 0) return 'orange';
    return 'green';
};

const semaforoStyles = {
    green: {
        dot: 'bg-olivo-400',
        ring: 'ring-olivo-200',
        bg: 'bg-olivo-50',
        text: 'text-olivo-700',
        label: '✓ Al día'
    },
    orange: {
        dot: 'bg-amber-400',
        ring: 'ring-amber-200',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        label: '📦 Apartados'
    },
    red: {
        dot: 'bg-rose-400',
        ring: 'ring-rose-200',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        label: '⚠ Atención'
    }
};

export const ClientesPage = () => {
    const { buscarClientes, crearCliente, loading } = useClientes();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [historial, setHistorial] = useState<Venta[]>([]);
    const [showNewForm, setShowNewForm] = useState(false);
    const [sortMode, setSortMode] = useState<SortMode>('recientes');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState({ nombre: '', telefono: '' });
    const [successMsg, setSuccessMsg] = useState('');

    const handleSearch = async () => {
        let res = await buscarClientes(query);
        // Apply sorting
        switch (sortMode) {
            case 'mas_gastado':
                res = [...res].sort((a, b) => (b.total_compras || 0) - (a.total_compras || 0));
                break;
            case 'mas_compras':
                res = [...res].sort((a, b) => (b.numero_compras || 0) - (a.numero_compras || 0));
                break;
            case 'mas_apartados':
                res = [...res].sort((a, b) => (b.apartados_pendientes || 0) - (a.apartados_pendientes || 0));
                break;
            default: // recientes - already sorted by date
                break;
        }
        setClientes(res);
    };

    useEffect(() => {
        handleSearch();
    }, [query, sortMode]);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSelectCliente = async (c: Cliente) => {
        setSelectedCliente(c);
        setMenuOpenId(null);
        const ventas = await db.ventas.where('cliente_id').equals(c.id).toArray();
        ventas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHistorial(ventas);
    };

    const handleCrear = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nombre.trim()) return;
        try {
            const nuevo = await crearCliente(form);
            setForm({ nombre: '', telefono: '' });
            setSuccessMsg(`¡${nuevo.nombre} agregado! 🎉`);
            setTimeout(() => setSuccessMsg(''), 2500);
            handleSearch(); // refresh list without leaving
            // DO NOT navigate or select — stay in the list
        } catch (err) {
            alert('Error al crear cliente');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
        await db.clientes.delete(id);
        setSelectedCliente(null);
        setMenuOpenId(null);
        handleSearch();
    };

    // ── Detail View ──
    if (selectedCliente) {
        const semaforo = getSemaforoColor(selectedCliente);
        const styles = semaforoStyles[semaforo];

        return (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
                    <button onClick={() => setSelectedCliente(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">{selectedCliente.nombre}</h1>
                            <span className={`w-3 h-3 rounded-full ${styles.dot} ring-2 ${styles.ring}`}></span>
                        </div>
                        <p className="text-sm text-slate-500">Historial de Compras</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Info Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm h-fit">
                            <div className="flex justify-center">
                                <div className={`w-20 h-20 ${styles.bg} ${styles.text} rounded-full flex items-center justify-center text-3xl font-black`}>
                                    {selectedCliente.nombre[0].toUpperCase()}
                                </div>
                            </div>
                            <div className="text-center pb-4 border-b border-slate-100">
                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase ${styles.bg} ${styles.text}`}>
                                    {styles.label}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {selectedCliente.telefono && (
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <Phone className="w-4 h-4" />
                                        <span className="text-sm">{selectedCliente.telefono}</span>
                                    </div>
                                )}
                                <div className="pt-4 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Total Compras</span>
                                        <span className="font-bold text-olivo-600">${(selectedCliente.total_compras || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-white font-semibold italic">Andrés Montero Joyería</span>
                                        <span className="font-bold text-slate-700">{selectedCliente.numero_compras || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Apartados Activos</span>
                                        <span className="font-bold text-amber-600">{selectedCliente.apartados_pendientes || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Cancelaciones</span>
                                        <span className="font-bold text-rose-500">{selectedCliente.cancelaciones || 0}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(selectedCliente.id)}
                                className="w-full py-2 bg-rose-50 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar Cliente
                            </button>
                        </div>

                        {/* History Table */}
                        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800">Compras Pasadas</h3>
                            </div>
                            {historial.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>Este cliente aún no tiene ventas registradas.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {historial.map(v => {
                                        const estadoColor = v.estado === 'apartado'
                                            ? 'bg-amber-100 text-amber-700'
                                            : v.estado === 'cancelada'
                                                ? 'bg-rose-100 text-rose-600'
                                                : 'bg-emerald-100 text-emerald-700';
                                        return (
                                            <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                                <div>
                                                    <p className="font-mono text-xs font-bold text-slate-400">FOLIO: {v.folio}</p>
                                                    <p className="text-xs text-slate-500">{new Date(v.created_at).toLocaleDateString()} {new Date(v.created_at).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${estadoColor}`}>
                                                        {v.estado}
                                                    </span>
                                                    <p className="font-black text-slate-800">${v.total.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main List View ──
    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Directorio de Clientes</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona tu cartera y visualiza el semáforo.</p>
                </div>
                <button
                    onClick={() => setShowNewForm(!showNewForm)}
                    className={`px-6 py-3 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap ${showNewForm
                        ? 'bg-slate-200 text-slate-600 shadow-none hover:bg-slate-300'
                        : 'bg-olivo-500 hover:bg-olivo-600 text-white shadow-olivo-500/20'
                        }`}
                >
                    {showNewForm ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {showNewForm ? 'Cancelar' : 'Nuevo Cliente'}
                </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-4">

                    {/* ── Inline New Client Form ── */}
                    {showNewForm && (
                        <form onSubmit={handleCrear} className="bg-white p-5 rounded-2xl border border-olivo-200 shadow-sm flex flex-col sm:flex-row gap-3 animate-in slide-in-from-top-2 duration-200">
                            <input
                                type="text" required autoFocus
                                placeholder="Nombre del cliente..."
                                value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 outline-none text-sm"
                            />
                            <input
                                type="tel"
                                placeholder="WhatsApp (opcional)"
                                value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                                className="w-full sm:w-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 outline-none text-sm"
                            />
                            <button type="submit" className="px-6 py-3 bg-olivo-500 text-white font-bold rounded-xl hover:bg-olivo-600 transition-all shadow-lg shadow-olivo-500/20 whitespace-nowrap">
                                + Registrar
                            </button>
                        </form>
                    )}

                    {/* ── Success Toast ── */}
                    {successMsg && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold text-center animate-in zoom-in-95 duration-200">
                            {successMsg}
                        </div>
                    )}

                    {/* ── Search + Sort Bar ── */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar cliente por nombre o teléfono..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-700 outline-none focus:ring-2 focus:ring-olivo-500 transition-all"
                            />
                        </div>
                        <select
                            value={sortMode}
                            onChange={e => setSortMode(e.target.value as SortMode)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-olivo-500"
                        >
                            <option value="recientes">Más Recientes</option>
                            <option value="mas_gastado">💰 Más Dinero Gastado</option>
                            <option value="mas_compras">🛒 Más Compras</option>
                            <option value="mas_apartados">📦 Más Apartados</option>
                        </select>
                    </div>

                    {/* ── Results Grid ── */}
                    {loading && clientes.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">Cargando clientes...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ref={menuRef}>
                            {clientes.map(c => {
                                const semaforo = getSemaforoColor(c);
                                const styles = semaforoStyles[semaforo];

                                return (
                                    <div
                                        key={c.id}
                                        className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-olivo-500 transition-all hover:shadow-md group relative"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar with semáforo dot */}
                                            <div className="relative">
                                                <div className={`w-12 h-12 ${styles.bg} ${styles.text} rounded-xl flex items-center justify-center text-xl font-bold transition-colors`}>
                                                    {c.nombre[0].toUpperCase()}
                                                </div>
                                                <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${styles.dot} ring-2 ring-white`}></span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 truncate">{c.nombre}</h4>
                                                <p className="text-xs text-slate-500 truncate">{c.telefono || 'Sin teléfono'}</p>
                                            </div>

                                            {/* ⋮ Three dots menu */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpenId(menuOpenId === c.id ? null : c.id);
                                                }}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* ── Dropdown Menu ── */}
                                        {menuOpenId === c.id && (
                                            <div className="absolute right-4 top-16 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-2 w-52 animate-in zoom-in-95 fade-in duration-150">
                                                <button onClick={() => handleSelectCliente(c)} className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                                                    <History className="w-4 h-4 text-slate-400" /> Ver Historial
                                                </button>
                                                <button onClick={() => { setMenuOpenId(null); navigate('/venta'); }} className="w-full px-4 py-2.5 text-left text-sm font-medium text-olivo-600 hover:bg-olivo-50 flex items-center gap-3 transition-colors">
                                                    <ShoppingBag className="w-4 h-4" /> Nueva Venta
                                                </button>
                                                <div className="border-t border-slate-100 my-1"></div>
                                                <button onClick={() => handleDelete(c.id)} className="w-full px-4 py-2.5 text-left text-sm font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-colors">
                                                    <Trash2 className="w-4 h-4" /> Eliminar
                                                </button>
                                            </div>
                                        )}

                                        {/* ── Footer Stats ── */}
                                        <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>{c.numero_compras || 0} Compras</span>
                                            {(c.apartados_pendientes || 0) > 0 && (
                                                <span className="text-amber-500 flex items-center gap-1">
                                                    <Package className="w-3 h-3" /> {c.apartados_pendientes} Aparts.
                                                </span>
                                            )}
                                            <span className="text-olivo-500">${(c.total_compras || 0).toFixed(0)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {clientes.length === 0 && !loading && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                            <UserPlus className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <h3 className="text-lg font-bold text-slate-700">Comienza tu Directorio</h3>
                            <p className="text-slate-500 text-sm mt-1 mb-6">Agrega a tus clientes para premiar su fidelidad.</p>
                            <button
                                onClick={() => setShowNewForm(true)}
                                className="px-6 py-2.5 border-2 border-olivo-500 text-olivo-600 font-bold rounded-xl hover:bg-olivo-50 transition-colors"
                            >
                                Crear mi primer cliente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
