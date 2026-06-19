import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVentas } from '../hooks/useVentas';
import { useClientes } from '../hooks/useClientes';
import { MetodoPago, Cliente } from '../types';
import { CarritoItem } from '../components/venta/CarritoItem';
import { TotalesVenta } from '../components/venta/TotalesVenta';
import { METODOS_PAGO } from '../constants';
import { Button } from '../components/ui/Button';
import {
    Ban, CheckCircle2, ShoppingCart, X, Search, Check, Copy, Share2,
    Plus, Sparkles, Wallet, Trash2, ChevronRight, AlertTriangle, ClipboardCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { db } from '../lib/db';

// ─── Sub-componente: Barra de Pestañas ────────────────────────────────────────

interface TabsBarProps {
    tabs: ReturnType<typeof useCart>['tabs'];
    activeTabId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onClose: (id: string) => void;
}

const TabsBar = ({ tabs, activeTabId, onSelect, onAdd, onClose }: TabsBarProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll automático a la pestaña activa
    useEffect(() => {
        const el = scrollRef.current?.querySelector(`[data-tabid="${activeTabId}"]`) as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }, [activeTabId]);

    return (
        <div className="flex items-center bg-slate-100 border-b border-slate-200 min-h-[48px] px-2 gap-1 z-10">
            {/* Lista deslizable */}
            <div
                ref={scrollRef}
                className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide py-2"
                style={{ scrollbarWidth: 'none' }}
            >
                {tabs.map(tab => {
                    const isActive = tab.id === activeTabId;
                    const hasItems = tab.cartItems.length > 0 || tab.randomItems.length > 0;
                    const hasAbonos = tab.abonos.length > 0;
                    return (
                        <button
                            key={tab.id}
                            data-tabid={tab.id}
                            onClick={() => onSelect(tab.id)}
                            className={`
                                relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                whitespace-nowrap transition-all flex-shrink-0
                                ${isActive
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'bg-transparent text-slate-500 hover:bg-white/70 hover:text-slate-700'}
                            `}
                        >
                            {/* Indicador de abono pendiente */}
                            {hasAbonos && (
                                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Tiene abono pendiente" />
                            )}
                            {/* Indicador de productos */}
                            {hasItems && !hasAbonos && (
                                <span className="w-2 h-2 rounded-full bg-[#80854b]/60 flex-shrink-0" />
                            )}
                            <span className="max-w-[100px] truncate">{tab.label}</span>
                            {/* Botón cerrar */}
                            <span
                                role="button"
                                onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                                className={`
                                    flex-shrink-0 rounded p-0.5 transition-colors
                                    ${isActive ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'opacity-0 pointer-events-none'}
                                `}
                            >
                                <X className="w-3 h-3" />
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Botón nueva pestaña */}
            <button
                onClick={onAdd}
                title="Nueva cuenta"
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#80854b]/10 text-[#80854b] hover:bg-[#80854b]/20 flex items-center justify-center transition-colors"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
};

// ─── Sub-componente: Fila Objeto Random ───────────────────────────────────────

interface RandomItemRowProps {
    item: ReturnType<typeof useCart>['randomItems'][number];
    onUpdate: (randomId: string, changes: any) => void;
    onRemove: (randomId: string) => void;
}

const RandomItemRow = ({ item, onUpdate, onRemove }: RandomItemRowProps) => {
    return (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl group">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
                <input
                    type="text"
                    value={item.descripcion}
                    onChange={e => onUpdate(item.randomId, { descripcion: e.target.value })}
                    placeholder="Descripción (composturas, refacción, etc.)"
                    className="w-full text-sm font-medium text-slate-800 bg-transparent border-none outline-none placeholder-amber-400 focus:ring-0"
                />
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-600 font-semibold uppercase">Precio:</span>
                    <span className="text-[10px] text-amber-600">$</span>
                    <input
                        type="number"
                        min="0"
                        value={item.precio || ''}
                        onChange={e => onUpdate(item.randomId, { precio: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-20 text-sm font-bold text-amber-700 bg-transparent border-none outline-none placeholder-amber-300 focus:ring-0"
                    />
                    <span className="text-[10px] text-amber-600 font-semibold uppercase ml-2">Cant:</span>
                    <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={e => onUpdate(item.randomId, { cantidad: parseInt(e.target.value) || 1 })}
                        className="w-10 text-sm font-bold text-amber-700 bg-transparent border-none outline-none focus:ring-0"
                    />
                </div>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-amber-800">${item.subtotal.toFixed(2)}</p>
            </div>
            <button
                onClick={() => onRemove(item.randomId)}
                className="flex-shrink-0 p-1 text-amber-400 hover:text-rose-500 rounded transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// ─── Sub-componente: Panel de Abonos ──────────────────────────────────────────

interface AbonosPanelProps {
    abonos: ReturnType<typeof useCart>['abonos'];
    total: number;
    totalAbonado: number;
    saldoPendiente: number;
    onAddAbono: (monto: number, nota?: string) => void;
    onRemoveAbono: (id: string) => void;
}

const AbonosPanel = ({ abonos, total, totalAbonado, saldoPendiente, onAddAbono, onRemoveAbono }: AbonosPanelProps) => {
    const [montoInput, setMontoInput] = useState('');
    const [notaInput, setNotaInput] = useState('');
    const [open, setOpen] = useState(false);

    const handleAdd = () => {
        const monto = parseFloat(montoInput);
        if (!monto || monto <= 0) return;
        onAddAbono(monto, notaInput);
        setMontoInput('');
        setNotaInput('');
    };

    return (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${abonos.length > 0 ? 'bg-amber-50' : 'bg-white'}`}
            >
                <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-800">Abonos</span>
                    {abonos.length > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                            {abonos.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {totalAbonado > 0 && (
                        <span className="text-xs font-bold text-amber-700">
                            Abonado: ${totalAbonado.toFixed(2)}
                        </span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {/* Contenido expandible */}
            {open && (
                <div className="border-t border-amber-100 bg-amber-50/50 p-4 space-y-3">
                    {/* Resumen */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg p-2 border border-amber-100">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Total</p>
                            <p className="text-sm font-black text-slate-800">${total.toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 border border-green-100">
                            <p className="text-[10px] text-green-600 uppercase font-semibold">Abonado</p>
                            <p className="text-sm font-black text-green-700">${totalAbonado.toFixed(2)}</p>
                        </div>
                        <div className={`rounded-lg p-2 border ${saldoPendiente > 0 ? 'bg-rose-50 border-rose-200' : 'bg-green-50 border-green-200'}`}>
                            <p className={`text-[10px] uppercase font-semibold ${saldoPendiente > 0 ? 'text-rose-500' : 'text-green-600'}`}>Pendiente</p>
                            <p className={`text-sm font-black ${saldoPendiente > 0 ? 'text-rose-700' : 'text-green-700'}`}>${saldoPendiente.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Lista de abonos */}
                    {abonos.map(a => (
                        <div key={a.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">${a.monto.toFixed(2)}</p>
                                {a.nota && <p className="text-xs text-slate-500 truncate">{a.nota}</p>}
                                <p className="text-[10px] text-slate-400">
                                    {new Date(a.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                            </div>
                            <button
                                onClick={() => onRemoveAbono(a.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    {/* Formulario añadir abono */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-sm">$</span>
                            <input
                                type="number"
                                min="0"
                                value={montoInput}
                                onChange={e => setMontoInput(e.target.value)}
                                placeholder="Monto"
                                className="w-full pl-6 pr-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-300"
                            />
                        </div>
                        <input
                            type="text"
                            value={notaInput}
                            onChange={e => setNotaInput(e.target.value)}
                            placeholder="Nota (opcional)"
                            className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-slate-600 outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <button
                            onClick={handleAdd}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Modal de Confirmación de Cierre ─────────────────────────────────────────

interface CloseConfirmModalProps {
    label: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const CloseConfirmModal = ({ label, onConfirm, onCancel }: CloseConfirmModalProps) => (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onCancel}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">¿Cerrar esta cuenta?</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        <strong>"{label}"</strong> tiene productos. Si la cierras, se perderán.
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    Sí, cerrar
                </button>
            </div>
        </div>
    </div>
);

// ─── Página Principal ─────────────────────────────────────────────────────────

export const VentaPage = () => {
    const {
        tabs, activeTabId, activeTab,
        addTab, removeTab, setActiveTabId, updateActiveTab,
        cartItems, addToCart, removeFromCart, incrementQuantity, decrementQuantity, clearCart,
        randomItems, addRandomItem, updateRandomItem, removeRandomItem,
        abonos, addAbono, removeAbono,
        subtotal, descuento, total, totalAbonado, saldoPendiente, totalItems,
    } = useCart();

    const { vendedorActual, token, isAdmin } = useAuth();
    const { crearVenta, loading } = useVentas(token);
    const { buscarClientes } = useClientes();
    const navigate = useNavigate();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ── Estado de la UI ───────────────────────────────────────────────────────
    interface ItemTicket {
        nombre: string;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
    }

    interface VentaExitosaData {
        folio: string;
        total: number;
        subtotal: number;
        descuento: number;
        metodoPago: string;
        totalAbonado: number;
        saldoPendiente: number;
        items: ItemTicket[];
        fechaHora: string;
    }

    const [ventaExitosa, setVentaExitosa] = useState<VentaExitosaData | null>(null);
    const [ticketCopiado, setTicketCopiado] = useState(false);
    const [showClienteModal, setShowClienteModal] = useState(false);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
    const [maxDescuento, setMaxDescuento] = useState<number>(15);
    const [bancoNombre, setBancoNombre] = useState('');
    const [clabeCuenta, setClabeCuenta] = useState('');
    const [titularCuenta, setTitularCuenta] = useState('');
    const [copiado, setCopiado] = useState(false);
    const [tabToClose, setTabToClose] = useState<string | null>(null);

    // Datos del carrito activo
    const clienteSeleccionado = activeTab.clienteSeleccionado;
    const metodoPago = activeTab.metodoPago;
    const descuentoPorcentaje = activeTab.descuentoPorcentaje;

    // ── Efectos ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
    }, []);

    useEffect(() => {
        if (showClienteModal) {
            buscarClientes(busquedaCliente).then(setClientesEncontrados);
        }
    }, [busquedaCliente, showClienteModal]);

    useEffect(() => {
        const loadConfig = async () => {
            const confDesc = await db.config.get('max_descuento');
            if (confDesc?.value !== undefined) setMaxDescuento(Number(confDesc.value));
            const confBanco = await db.config.get('banco_nombre');
            if (confBanco) setBancoNombre(confBanco.value);
            const confClabe = await db.config.get('clabe_cuenta');
            if (confClabe) setClabeCuenta(confClabe.value);
            const confTitular = await db.config.get('titular_cuenta');
            if (confTitular) setTitularCuenta(confTitular.value);
        };
        loadConfig();
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleDescuentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value) || 0;
        if (val < 0) val = 0;
        if (!isAdmin && val > maxDescuento) {
            alert(`El descuento máximo permitido es de ${maxDescuento}%.`);
            val = maxDescuento;
        }
        updateActiveTab({ descuentoPorcentaje: val });
    };

    const handleSelectCliente = (c: Cliente) => {
        updateActiveTab({
            clienteSeleccionado: c,
            // Auto-renombrar la pestaña con el nombre del cliente
            label: c.id === '__ocasional__' ? activeTab.label : c.nombre,
        });
        setShowClienteModal(false);
    };

    const handleRequestCloseTab = (id: string) => {
        const tab = tabs.find(t => t.id === id);
        if (!tab) return;
        const hasContent = tab.cartItems.length > 0 || tab.randomItems.length > 0 || tab.abonos.length > 0;
        if (hasContent) {
            setTabToClose(id);
        } else {
            removeTab(id);
        }
    };

    const handleConfirmarVenta = async () => {
        if (!vendedorActual?.id) {
            alert('Error: No hay un vendedor activo para registrar la venta.');
            return;
        }
        const totalItems = cartItems.length + randomItems.length;
        if (totalItems === 0) {
            alert('El carrito está vacío.');
            return;
        }

        try {
            // Preparar notas con objetos random si los hay
            const notasRandom = randomItems.length > 0
                ? '\nConceptos extra: ' + randomItems.map(r => `${r.descripcion} x${r.cantidad} $${r.precio}`).join(', ')
                : '';
            // Notas de abonos si los hay
            const notasAbonos = abonos.length > 0
                ? '\nAbonos: ' + abonos.map(a => `$${a.monto}${a.nota ? ` (${a.nota})` : ''}`).join(', ')
                : '';

            const payload = {
                vendedor_id: vendedorActual.id,
                cliente_id: (clienteSeleccionado?.id === '__ocasional__') ? null : (clienteSeleccionado?.id || null),
                sesion_id: null,
                metodo_pago: metodoPago,
                subtotal,
                descuento,
                total,
                notas: (notasRandom + notasAbonos).trim() || undefined,
                detalles: cartItems.map(item => ({
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.producto.precio,
                    subtotal: item.subtotal
                }))
            };

            const itemsParaTicket = [
                ...cartItems.map(item => ({
                    nombre: item.producto.nombre,
                    cantidad: item.cantidad,
                    precioUnitario: item.producto.precio,
                    subtotal: item.subtotal,
                })),
                ...randomItems.map(item => ({
                    nombre: item.descripcion || 'Concepto extra',
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                    subtotal: item.subtotal,
                }))
            ];

            const nuevaVenta = await crearVenta(payload);
            clearCart();
            setVentaExitosa({
                folio: nuevaVenta.folio,
                total: nuevaVenta.total,
                subtotal,
                descuento,
                metodoPago: metodoPago,
                totalAbonado,
                saldoPendiente,
                items: itemsParaTicket,
                fechaHora: nuevaVenta.created_at,
            });
        } catch (error: any) {
            alert(`Error al cobrar: ${error.message}`);
        }
    };

    const METODO_PAGO_LABEL: Record<string, string> = {
        efectivo: '💵 Efectivo',
        tarjeta: '💳 Tarjeta',
        transferencia: '🏦 Transferencia',
        deposito: '📄 Depósito',
    };

    const generarTextoTicket = (): string => {
        if (!ventaExitosa) return '';
        const fecha = new Date(ventaExitosa.fechaHora);
        const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        let txt = '';
        txt += '━━━━━━━━━━━━━━━━━━━\n';
        txt += '  ✨ MIRI MONTERO JOYERÍA ✨\n';
        txt += '━━━━━━━━━━━━━━━━━━━\n';
        txt += `📅 ${fechaStr} · ${horaStr}\n`;
        txt += `🎫 Folio: ${ventaExitosa.folio}\n\n`;
        txt += '📦 *DETALLE DE COMPRA:*\n';
        txt += '─────────────────────\n';

        for (const item of ventaExitosa.items) {
            txt += `  • ${item.nombre} ×${item.cantidad}\n`;
            if (item.cantidad > 1) {
                txt += `    $${item.subtotal.toFixed(2)} ($${item.precioUnitario.toFixed(2)} c/u)\n`;
            } else {
                txt += `    $${item.subtotal.toFixed(2)}\n`;
            }
        }

        txt += '─────────────────────\n';
        if (ventaExitosa.descuento > 0) {
            txt += `  Subtotal:    $${ventaExitosa.subtotal.toFixed(2)}\n`;
            txt += `  Descuento:   -$${ventaExitosa.descuento.toFixed(2)}\n`;
        }
        txt += '━━━━━━━━━━━━━━━━━━━\n';
        txt += `  💰 *TOTAL:    $${ventaExitosa.total.toFixed(2)}*\n`;
        txt += `  Método: ${METODO_PAGO_LABEL[ventaExitosa.metodoPago] || ventaExitosa.metodoPago}\n`;
        
        if (ventaExitosa.totalAbonado > 0) {
            txt += `  Abonado:    $${ventaExitosa.totalAbonado.toFixed(2)}\n`;
        }
        if (ventaExitosa.saldoPendiente > 0) {
            txt += `  Pendiente:  $${ventaExitosa.saldoPendiente.toFixed(2)}\n`;
        }
        
        txt += '━━━━━━━━━━━━━━━━━━━\n';
        txt += '  ¡Gracias por tu preferencia! 💎\n';

        return txt;
    };

    const handleWhatsApp = () => {
        if (!ventaExitosa) return;
        const texto = generarTextoTicket();
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    const handleCopiarTicket = async () => {
        const texto = generarTextoTicket();
        try {
            await navigator.clipboard.writeText(texto);
            setTicketCopiado(true);
            setTimeout(() => setTicketCopiado(false), 2500);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = texto;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setTicketCopiado(true);
            setTimeout(() => setTicketCopiado(false), 2500);
        }
    };

    // ── Vista de Éxito ────────────────────────────────────────────────────────
    if (ventaExitosa) {
        return (
            <div className="flex-1 flex flex-col items-center justify-start h-full bg-slate-50 p-4 md:p-6 overflow-y-auto">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center animate-in zoom-in-95 duration-300 my-4 flex flex-col items-center">
                    <div className="w-16 h-16 bg-olivo-50 text-olivo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-olivo-600 mb-1">¡Venta Exitosa!</h2>
                    <p className="text-slate-400 text-sm mb-5">Folio: {ventaExitosa.folio}</p>

                    {/* Desglose de productos */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 text-left mb-4 overflow-hidden w-full">
                        <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detalle de compra</p>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                            {ventaExitosa.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{item.nombre}</p>
                                        {item.cantidad > 1 && (
                                            <p className="text-[11px] text-slate-400">${item.precioUnitario.toFixed(2)} c/u</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className="text-sm font-black text-slate-800">${item.subtotal.toFixed(2)}</p>
                                        {item.cantidad > 1 && (
                                            <p className="text-[10px] font-bold text-slate-400">×{item.cantidad}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3 mb-6 space-y-1.5 w-full">
                        {ventaExitosa.descuento > 0 && (
                            <>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Subtotal</span>
                                    <span className="font-medium">${ventaExitosa.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-rose-500">
                                    <span>Descuento</span>
                                    <span className="font-medium">-${ventaExitosa.descuento.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-1.5" />
                            </>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Total cobrado</span>
                            <span className="text-2xl font-black text-[#80854b]">${ventaExitosa.total.toFixed(2)}</span>
                        </div>
                        {ventaExitosa.totalAbonado > 0 && (
                            <div className="flex justify-between text-sm text-amber-600 font-semibold">
                                <span>Abonado</span>
                                <span>${ventaExitosa.totalAbonado.toFixed(2)}</span>
                            </div>
                        )}
                        {ventaExitosa.saldoPendiente > 0 && (
                            <div className="flex justify-between text-sm text-rose-500 font-semibold">
                                <span>Saldo Pendiente</span>
                                <span>${ventaExitosa.saldoPendiente.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-center pt-1">
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {METODO_PAGO_LABEL[ventaExitosa.metodoPago] || ventaExitosa.metodoPago}
                            </span>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="space-y-2.5 w-full">
                        <Button
                            className="w-full h-12 text-base font-bold bg-[#25D366] hover:bg-[#20B958] text-white shadow-lg shadow-[#25D366]/20"
                            onClick={handleWhatsApp}
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.347-.272.271-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                            Enviar Ticket por WhatsApp
                        </Button>
                        <Button
                            className={`w-full h-12 text-base font-bold transition-all ${
                                ticketCopiado
                                    ? 'bg-[#80854b] hover:bg-[#64683a] text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            onClick={handleCopiarTicket}
                        >
                            {ticketCopiado ? (
                                <><ClipboardCheck className="w-5 h-5 mr-2" /> ¡Ticket Copiado!</>
                            ) : (
                                <><Copy className="w-5 h-5 mr-2" /> Copiar Ticket al Portapapeles</>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-400 hover:text-slate-600"
                            onClick={() => navigate('/')}
                        >
                            Volver al Catálogo
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Vista Principal ───────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-50 md:flex-row">
            {/* ── Panel Izquierdo: Carrito ─────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Barra de Pestañas */}
                <TabsBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onSelect={setActiveTabId}
                    onAdd={addTab}
                    onClose={handleRequestCloseTab}
                />

                {/* Header del carrito activo */}
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-10">
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 truncate">{activeTab.label}</h1>
                        {activeTab.abonos.length > 0 && (
                            <span className="flex-shrink-0 text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase">
                                Abonando
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Escaner */}
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#80854b] transition-colors" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Escanear producto..."
                                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none w-48"
                                onChange={async (e) => {
                                    e.target.value = e.target.value.toUpperCase();
                                    const val = e.target.value.trim();
                                    if (val.length >= 3) {
                                        const prod = await db.productos.filter(p => p.codigo.toUpperCase() === val).first();
                                        if (prod) {
                                            addToCart(prod);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                        {/* Botón Objeto Random */}
                        <button
                            onClick={addRandomItem}
                            title="Añadir concepto libre"
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-xs font-bold transition-colors border border-amber-200"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Extra</span>
                        </button>
                        {/* Vaciar carrito */}
                        {(cartItems.length > 0 || randomItems.length > 0) && (
                            <button
                                onClick={clearCart}
                                className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1"
                            >
                                <Ban className="w-4 h-4" /> <span className="hidden sm:inline">Vaciar</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de productos */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
                    {cartItems.length === 0 && randomItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">El carrito está vacío</p>
                            <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>Ir al Catálogo</Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Productos del catálogo */}
                            {cartItems.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    {cartItems.map(item => (
                                        <CarritoItem
                                            key={item.producto.id}
                                            item={item}
                                            onIncrement={incrementQuantity}
                                            onDecrement={decrementQuantity}
                                            onRemove={removeFromCart}
                                        />
                                    ))}
                                </div>
                            )}
                            {/* Objetos Random */}
                            {randomItems.map(r => (
                                <RandomItemRow
                                    key={r.randomId}
                                    item={r}
                                    onUpdate={updateRandomItem}
                                    onRemove={removeRandomItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Panel Derecho: Checkout ──────────────────────────────────── */}
            <div className="w-full md:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
                <div className="p-6 flex-1 overflow-y-auto space-y-6">

                    {/* Sección Cliente */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Vendido a...</h3>
                        {clienteSeleccionado ? (
                            <div className="p-4 border border-[#80854b]/20 rounded-xl bg-[#80854b]/5 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#80854b]/10 text-[#80854b] rounded-lg flex items-center justify-center font-bold text-sm">
                                        {clienteSeleccionado.nombre[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{clienteSeleccionado.nombre}</p>
                                        <p className="text-[10px] text-[#80854b] font-medium uppercase">{clienteSeleccionado.tipo_cliente}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateActiveTab({ clienteSeleccionado: null, label: activeTab.label.startsWith('Carrito') ? activeTab.label : `Carrito ${tabs.indexOf(activeTab) + 1}` })}
                                    className="p-1 hover:bg-[#80854b]/10 rounded-md text-[#80854b]/40 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div
                                    onClick={() => setShowClienteModal(true)}
                                    className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition-colors border-dashed"
                                >
                                    <span className="text-sm font-medium text-[#80854b]">🔍 Buscar Cliente</span>
                                </div>
                                <div
                                    onClick={() => handleSelectCliente({
                                        id: '__ocasional__', nombre: 'Cliente Ocasional', telefono: null,
                                        email: null, tipo_cliente: 'normal', notas: null,
                                        total_compras: 0, numero_compras: 0, apartados_pendientes: 0,
                                        cancelaciones: 0, created_at: new Date().toISOString()
                                    })}
                                    className="p-3 border border-slate-200 rounded-xl bg-white text-center cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-colors"
                                >
                                    <span className="text-sm font-medium text-amber-600">👤 Cliente Ocasional (Turista)</span>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Sección Método de Pago */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Método de Pago</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {METODOS_PAGO.map(metodo => (
                                <button
                                    key={metodo.id}
                                    onClick={() => updateActiveTab({ metodoPago: metodo.id as MetodoPago })}
                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${metodoPago === metodo.id
                                        ? 'border-[#80854b] bg-[#80854b]/5 text-[#80854b] shadow-sm'
                                        : 'border-slate-100 hover:border-slate-200 bg-white text-slate-600'
                                        }`}
                                >
                                    <span className="text-2xl">{metodo.icon}</span>
                                    <span className="text-xs font-semibold">{metodo.label}</span>
                                </button>
                            ))}
                        </div>

                        {metodoPago === 'transferencia' && clabeCuenta && (
                            <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Datos para Transferencia</h4>
                                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <div className="text-sm">
                                        <p className="font-bold text-slate-800">{bancoNombre}</p>
                                        <p className="font-mono text-slate-600 font-semibold tracking-wider text-base">{clabeCuenta}</p>
                                        <p className="text-xs text-slate-500">{titularCuenta}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => {
                                                const text = `Banco: ${bancoNombre}\nCLABE/Cuenta: ${clabeCuenta}\nTitular: ${titularCuenta}`;
                                                navigator.clipboard.writeText(text);
                                                setCopiado(true);
                                                setTimeout(() => setCopiado(false), 2000);
                                            }}
                                            className="p-2 bg-slate-100 text-slate-600 hover:bg-olivo-100 hover:text-olivo-600 rounded-lg transition-colors flex items-center justify-center h-9 w-9"
                                            title="Copiar datos"
                                        >
                                            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const text = `Hola! Aquí están los datos para la transferencia:\n\n*Banco:* ${bancoNombre}\n*CLABE/Cuenta:* ${clabeCuenta}\n*Titular:* ${titularCuenta}\n\n¡Gracias!`;
                                                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                                                window.open(url, '_blank');
                                            }}
                                            className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg transition-colors flex items-center justify-center h-9 w-9"
                                            title="Compartir por WhatsApp"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Sección Abonos */}
                    <section>
                        <AbonosPanel
                            abonos={abonos}
                            total={total}
                            totalAbonado={totalAbonado}
                            saldoPendiente={saldoPendiente}
                            onAddAbono={addAbono}
                            onRemoveAbono={removeAbono}
                        />
                    </section>
                </div>

                {/* Footer Checkout */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 pb-safe">
                    <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-sm font-semibold text-slate-700">Descuento (%)</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max={isAdmin ? "100" : maxDescuento}
                                value={descuentoPorcentaje || ''}
                                onChange={handleDescuentoChange}
                                className="w-20 px-3 py-1.5 bg-slate-100 border-none rounded-lg text-right font-bold text-[#80854b] focus:ring-2 focus:ring-[#80854b] outline-none"
                                placeholder="0"
                            />
                            <span className="text-slate-500 font-bold">%</span>
                        </div>
                    </div>

                    <TotalesVenta subtotal={subtotal} descuento={descuento} total={total} />

                    {/* Resumen de saldo si hay abonos */}
                    {totalAbonado > 0 && (
                        <div className="mt-3 flex items-center justify-between text-sm px-1">
                            <span className="text-amber-600 font-semibold">Abonado:</span>
                            <span className="text-amber-700 font-bold">${totalAbonado.toFixed(2)}</span>
                        </div>
                    )}
                    {saldoPendiente > 0 && totalAbonado > 0 && (
                        <div className="flex items-center justify-between text-sm px-1">
                            <span className="text-rose-500 font-semibold">Pendiente:</span>
                            <span className="text-rose-700 font-bold">${saldoPendiente.toFixed(2)}</span>
                        </div>
                    )}

                    <Button
                        className="w-full mt-6 h-14 text-lg font-bold shadow-lg shadow-[#80854b]/20 bg-[#80854b] hover:bg-[#64683a]"
                        disabled={totalItems === 0 || loading}
                        isLoading={loading}
                        onClick={handleConfirmarVenta}
                    >
                        <CheckCircle2 className="w-6 h-6 mr-2" />
                        Completar Venta
                    </Button>
                </div>
            </div>

            {/* MODAL: Selector de Cliente */}
            {showClienteModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowClienteModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 text-lg">Seleccionar Cliente</h3>
                            <button onClick={() => setShowClienteModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-slate-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text" autoFocus
                                    placeholder="Buscar cliente..."
                                    value={busquedaCliente}
                                    onChange={e => setBusquedaCliente(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {clientesEncontrados.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => handleSelectCliente(c)}
                                    className="p-3 bg-white border border-slate-100 rounded-xl hover:border-[#80854b] cursor-pointer transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                                            {c.nombre[0]}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">{c.nombre}</span>
                                    </div>
                                    <Check className="w-4 h-4 text-[#80854b] opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                            {clientesEncontrados.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-400">No se encontraron clientes.</p>
                                    <Button variant="ghost" className="mt-2 text-[#80854b]" onClick={() => navigate('/clientes')}>Ir a Directorio</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Confirmación de cierre de pestaña */}
            {tabToClose && (
                <CloseConfirmModal
                    label={tabs.find(t => t.id === tabToClose)?.label ?? ''}
                    onConfirm={() => { removeTab(tabToClose); setTabToClose(null); }}
                    onCancel={() => setTabToClose(null)}
                />
            )}
        </div>
    );
};
