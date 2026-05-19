import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVentas } from '../hooks/useVentas';
import { useClientes } from '../hooks/useClientes';
import { MetodoPago, Cliente } from '../types';
import { CarritoItem } from '../components/venta/CarritoItem';
import { TotalesVenta } from '../components/venta/TotalesVenta';
import { METODOS_PAGO } from '../constants';
import { Button } from '../components/ui/Button';
import { Ban, CheckCircle2, ShoppingCart, X, Search, Check, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { db } from '../lib/db';
import { useRef } from 'react';

export const VentaPage = () => {
    const {
        cartItems,
        incrementQuantity,
        decrementQuantity,
        removeFromCart,
        clearCart,
        subtotal
    } = useCart();

    const { vendedorActual, token, isAdmin } = useAuth();
    const { crearVenta, loading } = useVentas(token);
    const { buscarClientes } = useClientes();
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Autofocus del escaner al entrar
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
    const [ventaExitosa, setVentaExitosa] = useState<{ folio: string, total: number } | null>(null);

    // Client selection state
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
    const [showClienteModal, setShowClienteModal] = useState(false);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);

    useEffect(() => {
        if (showClienteModal) {
            buscarClientes(busquedaCliente).then(setClientesEncontrados);
        }
    }, [busquedaCliente, showClienteModal]);

    const handleIncrement = (id: string) => incrementQuantity(id);
    const handleDecrement = (id: string) => decrementQuantity(id);
    const handleRemove = (id: string) => removeFromCart(id);

    const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
    const [maxDescuento, setMaxDescuento] = useState<number>(15);
    const [bancoNombre, setBancoNombre] = useState('');
    const [clabeCuenta, setClabeCuenta] = useState('');
    const [titularCuenta, setTitularCuenta] = useState('');
    const [copiado, setCopiado] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const confDesc = await db.config.get('max_descuento');
            if (confDesc && confDesc.value !== undefined) setMaxDescuento(Number(confDesc.value));
            
            const confBanco = await db.config.get('banco_nombre');
            if (confBanco) setBancoNombre(confBanco.value);
            
            const confClabe = await db.config.get('clabe_cuenta');
            if (confClabe) setClabeCuenta(confClabe.value);
            
            const confTitular = await db.config.get('titular_cuenta');
            if (confTitular) setTitularCuenta(confTitular.value);
        };
        loadConfig();
    }, []);

    const handleDescuentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value) || 0;
        if (val < 0) val = 0;
        
        if (!isAdmin && val > maxDescuento) {
            alert(`El descuento máximo permitido por el administrador es de ${maxDescuento}%.`);
            val = maxDescuento;
        }
        setDescuentoPorcentaje(val);
    };

    const descuento = (subtotal * descuentoPorcentaje) / 100;
    const total = subtotal - descuento;

    const handleConfirmarVenta = async () => {
        if (!vendedorActual?.id) {
            alert('Error: No hay un vendedor activo para registrar la venta.');
            return;
        }
        if (cartItems.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

        try {
            const payload = {
                vendedor_id: vendedorActual.id,
                cliente_id: (clienteSeleccionado?.id === '__ocasional__') ? null : (clienteSeleccionado?.id || null),
                sesion_id: null,
                metodo_pago: metodoPago,
                subtotal,
                descuento,
                total,
                detalles: cartItems.map(item => ({
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.producto.precio,
                    subtotal: item.subtotal
                }))
            };

            const nuevaVenta = await crearVenta(payload);
            clearCart();
            setVentaExitosa({ folio: nuevaVenta.folio, total: nuevaVenta.total });
        } catch (error: any) {
            alert(`Error al cobrar: ${error.message}`);
        }
    };

    const handleWhatsApp = () => {
        if (!ventaExitosa) return;
        const texto = `💎 *RECIBO DE COMPRA*\nGracias por su compra!\n\n*Folio:* ${ventaExitosa.folio}\n*Total:* $${ventaExitosa.total.toFixed(2)}\n\n¡Vuelva pronto!`;
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
        navigate('/');
    };

    if (ventaExitosa) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-olivo-50 text-olivo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-olivo-600 mb-2">¡Venta Exitosa!</h2>
                    <p className="text-slate-500 mb-6">Folio: {ventaExitosa.folio}</p>

                    <div className="bg-slate-50 p-4 rounded-xl mb-8">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Cobrado</p>
                        <p className="text-3xl font-black text-[#80854b]">${ventaExitosa.total.toFixed(2)}</p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#20B958] text-white shadow-lg shadow-[#25D366]/20"
                            onClick={handleWhatsApp}
                        >
                            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.347-.272.271-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                            Enviar Recibo
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500"
                            onClick={() => navigate('/')}
                        >
                            No enviar, Volver al Catálogo
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 md:flex-row">
            {/* Panel Izquierdo: Carrito de Compras */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Carrito de Venta</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#80854b] transition-colors" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Escanear producto..."
                                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#80854b] outline-none w-48"
                                onChange={async (e) => {
                                    // Forzar mayúsculas visualmente en el input
                                    e.target.value = e.target.value.toUpperCase();
                                    const val = e.target.value.trim();
                                    
                                    if (val.length >= 3) {
                                        // Buscar ignorando mayúsculas/minúsculas para mayor seguridad
                                        const prod = await db.productos.filter(p => p.codigo.toUpperCase() === val).first();
                                        if (prod) {
                                            addToCart(prod);
                                            e.target.value = ''; // Limpiar para el siguiente scan
                                            // Feedback visual o sonido opcional
                                        }
                                    }
                                }}
                            />
                        </div>
                        {cartItems.length > 0 && (
                            <button onClick={() => clearCart()} className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1">
                                <Ban className="w-4 h-4" /> Vaciar
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">El carrito está vacío</p>
                            <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>Ir al Catálogo</Button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            {cartItems.map(item => (
                                <CarritoItem
                                    key={item.producto.id}
                                    item={item}
                                    onIncrement={handleIncrement}
                                    onDecrement={handleDecrement}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Panel Derecho: Checkout */}
            <div className="w-full md:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {/* Seccion Cliente */}
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
                                <button onClick={() => setClienteSeleccionado(null)} className="p-1 hover:bg-[#80854b]/10 rounded-md text-[#80854b]/40 transition-colors">
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
                                    onClick={() => {
                                        // Set a 'virtual' occasional client — no DB entry
                                        setClienteSeleccionado({
                                            id: '__ocasional__',
                                            nombre: 'Cliente Ocasional',
                                            telefono: null,
                                            email: null,
                                            tipo_cliente: 'normal',
                                            notas: null,
                                            total_compras: 0,
                                            numero_compras: 0,
                                            apartados_pendientes: 0,
                                            cancelaciones: 0,
                                            created_at: new Date().toISOString()
                                        });
                                    }}
                                    className="p-3 border border-slate-200 rounded-xl bg-white text-center cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-colors"
                                >
                                    <span className="text-sm font-medium text-amber-600">👤 Cliente Ocasional (Turista)</span>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Seccion Metodo Pago */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Método de Pago</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {METODOS_PAGO.map(metodo => (
                                <button
                                    key={metodo.id}
                                    onClick={() => setMetodoPago(metodo.id)}
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
                                            className="p-2 bg-slate-100 text-slate-600 hover:bg-olivo-100 hover:text-olivo-600 rounded-lg transition-colors flex items-center justify-center gap-1 h-9 w-9"
                                            title="Copiar datos al portapapeles"
                                        >
                                            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const text = `Hola! Aquí están los datos para la transferencia:\n\n*Banco:* ${bancoNombre}\n*CLABE/Cuenta:* ${clabeCuenta}\n*Titular:* ${titularCuenta}\n\n¡Gracias!`;
                                                const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                                                window.open(url, '_blank');
                                            }}
                                            className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg transition-colors flex items-center justify-center gap-1 h-9 w-9"
                                            title="Compartir por WhatsApp"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer Checkout Fijo */}
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

                    <Button
                        className="w-full mt-6 h-14 text-lg font-bold shadow-lg shadow-[#80854b]/20 bg-[#80854b] hover:bg-[#64683a]"
                        disabled={cartItems.length === 0 || loading}
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
                                    onClick={() => {
                                        setClienteSeleccionado(c);
                                        setShowClienteModal(false);
                                    }}
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
        </div>
    );
};

