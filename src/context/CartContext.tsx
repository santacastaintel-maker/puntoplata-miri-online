import {
    createContext, useContext, useState,
    ReactNode, useCallback, useEffect, useRef
} from 'react';
import { CartItem, Producto, MetodoPago, Cliente } from '../types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Ítem "libre" que no necesita existir en la BD de productos */
export interface RandomItem {
    randomId: string;       // Identificador único en el carrito
    descripcion: string;    // Editable por el vendedor
    precio: number;
    cantidad: number;
    subtotal: number;
}

/** Abono parcial registrado en una pestaña (antes de cerrar la venta) */
export interface AbonoLocal {
    id: string;
    monto: number;
    fecha: string;          // ISO string
    nota: string;
}

/** Una pestaña = un carrito independiente */
export interface CartTab {
    id: string;
    label: string;                          // Ej. "Carrito 1" o "Juan García"
    cartItems: CartItem[];
    randomItems: RandomItem[];
    clienteSeleccionado: Cliente | null;
    metodoPago: MetodoPago;
    descuentoPorcentaje: number;
    abonos: AbonoLocal[];                   // Pagos parciales registrados
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

interface CartContextType {
    // Estado
    tabs: CartTab[];
    activeTabId: string;
    activeTab: CartTab;

    // Gestión de pestañas
    addTab: () => void;
    removeTab: (id: string) => void;
    setActiveTabId: (id: string) => void;
    updateActiveTab: (changes: Partial<Omit<CartTab, 'id'>>) => void;

    // Carrito activo - Productos del catálogo
    cartItems: CartItem[];
    addToCart: (producto: Producto) => void;
    removeFromCart: (productoId: string) => void;
    incrementQuantity: (productoId: string) => void;
    decrementQuantity: (productoId: string) => void;
    clearCart: () => void;

    // Carrito activo - Objetos Random
    randomItems: RandomItem[];
    addRandomItem: () => void;
    updateRandomItem: (randomId: string, changes: Partial<Omit<RandomItem, 'randomId'>>) => void;
    removeRandomItem: (randomId: string) => void;

    // Abonos del carrito activo
    abonos: AbonoLocal[];
    addAbono: (monto: number, nota?: string) => void;
    removeAbono: (id: string) => void;

    // Totales calculados del carrito activo
    subtotal: number;
    descuento: number;
    total: number;
    totalAbonado: number;
    saldoPendiente: number;
    totalItems: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LS_TABS_KEY = 'pp_sales_tabs';
const LS_ACTIVE_KEY = 'pp_active_tab_id';

let tabCounter = 0;

const makeTabId = () => `tab_${Date.now()}_${++tabCounter}`;

const defaultTab = (label = 'Carrito 1'): CartTab => ({
    id: makeTabId(),
    label,
    cartItems: [],
    randomItems: [],
    clienteSeleccionado: null,
    metodoPago: 'efectivo',
    descuentoPorcentaje: 0,
    abonos: [],
});

const loadFromStorage = (): { tabs: CartTab[]; activeTabId: string } => {
    try {
        const rawTabs = localStorage.getItem(LS_TABS_KEY);
        const rawActive = localStorage.getItem(LS_ACTIVE_KEY);
        if (rawTabs) {
            const tabs: CartTab[] = JSON.parse(rawTabs);
            // Migrar pestañas que no tengan randomItems o abonos (versiones anteriores)
            const migrated = tabs.map(t => ({
                ...t,
                randomItems: t.randomItems ?? [],
                abonos: t.abonos ?? [],
            }));
            if (migrated.length > 0) {
                const activeTabId = rawActive && migrated.find(t => t.id === rawActive)
                    ? rawActive
                    : migrated[0].id;
                return { tabs: migrated, activeTabId };
            }
        }
    } catch (_) { /* ignore */ }
    const initial = defaultTab();
    return { tabs: [initial], activeTabId: initial.id };
};

// ─── Contexto Creado ──────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const initial = loadFromStorage();
    const [tabs, setTabs] = useState<CartTab[]>(initial.tabs);
    const [activeTabId, setActiveTabIdState] = useState<string>(initial.activeTabId);

    // Persistir en localStorage cuando cambie el estado
    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        localStorage.setItem(LS_TABS_KEY, JSON.stringify(tabs));
    }, [tabs]);
    useEffect(() => {
        localStorage.setItem(LS_ACTIVE_KEY, activeTabId);
    }, [activeTabId]);

    // Pestaña activa derivada
    const activeTab: CartTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

    // Utilidad interna: actualiza la pestaña activa
    const mutateActive = useCallback((fn: (tab: CartTab) => CartTab) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? fn(t) : t));
    }, [activeTabId]);

    // ── Gestión de Pestañas ───────────────────────────────────────────────────
    const addTab = useCallback(() => {
        setTabs(prev => {
            const existingLabels = prev.map(t => t.label);
            let idx = prev.length + 1;
            let label = `Carrito ${idx}`;
            while (existingLabels.includes(label)) { idx++; label = `Carrito ${idx}`; }
            const newTab = defaultTab(label);
            setActiveTabIdState(newTab.id);
            return [...prev, newTab];
        });
    }, []);

    const removeTab = useCallback((id: string) => {
        setTabs(prev => {
            if (prev.length === 1) {
                // Última pestaña: limpiarla en vez de borrarla
                const cleared: CartTab = {
                    ...prev[0],
                    cartItems: [], randomItems: [], clienteSeleccionado: null,
                    descuentoPorcentaje: 0, metodoPago: 'efectivo', abonos: [],
                    label: 'Carrito 1',
                };
                return [cleared];
            }
            const idx = prev.findIndex(t => t.id === id);
            const next = prev.filter(t => t.id !== id);
            setActiveTabIdState(curActive => {
                if (curActive !== id) return curActive;
                // Activar la pestaña anterior, o la primera disponible
                const newActive = next[Math.max(0, idx - 1)];
                return newActive ? newActive.id : next[0].id;
            });
            return next;
        });
    }, []);

    const setActiveTabId = useCallback((id: string) => {
        setActiveTabIdState(id);
    }, []);

    const updateActiveTab = useCallback((changes: Partial<Omit<CartTab, 'id'>>) => {
        mutateActive(t => ({ ...t, ...changes }));
    }, [mutateActive]);

    // ── Carrito - Productos del Catálogo ──────────────────────────────────────
    const addToCart = useCallback((producto: Producto) => {
        mutateActive(t => {
            const existing = t.cartItems.find(i => i.producto.id === producto.id);
            const cartItems = existing
                ? t.cartItems.map(i =>
                    i.producto.id === producto.id
                        ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.producto.precio }
                        : i
                )
                : [...t.cartItems, { producto, cantidad: 1, subtotal: producto.precio }];
            return { ...t, cartItems };
        });
    }, [mutateActive]);

    const removeFromCart = useCallback((productoId: string) => {
        mutateActive(t => ({ ...t, cartItems: t.cartItems.filter(i => i.producto.id !== productoId) }));
    }, [mutateActive]);

    const incrementQuantity = useCallback((productoId: string) => {
        mutateActive(t => ({
            ...t,
            cartItems: t.cartItems.map(i =>
                i.producto.id === productoId
                    ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.producto.precio }
                    : i
            )
        }));
    }, [mutateActive]);

    const decrementQuantity = useCallback((productoId: string) => {
        mutateActive(t => ({
            ...t,
            cartItems: t.cartItems.map(i =>
                i.producto.id === productoId && i.cantidad > 1
                    ? { ...i, cantidad: i.cantidad - 1, subtotal: (i.cantidad - 1) * i.producto.precio }
                    : i
            )
        }));
    }, [mutateActive]);

    const clearCart = useCallback(() => {
        mutateActive(t => ({
            ...t, cartItems: [], randomItems: [], clienteSeleccionado: null,
            descuentoPorcentaje: 0, metodoPago: 'efectivo', abonos: [],
        }));
    }, [mutateActive]);

    // ── Carrito - Objetos Random ───────────────────────────────────────────────
    const addRandomItem = useCallback(() => {
        mutateActive(t => ({
            ...t,
            randomItems: [
                ...t.randomItems,
                {
                    randomId: `rand_${Date.now()}`,
                    descripcion: 'Servicio / Refacción extra',
                    precio: 0,
                    cantidad: 1,
                    subtotal: 0,
                }
            ]
        }));
    }, [mutateActive]);

    const updateRandomItem = useCallback((randomId: string, changes: Partial<Omit<RandomItem, 'randomId'>>) => {
        mutateActive(t => ({
            ...t,
            randomItems: t.randomItems.map(r => {
                if (r.randomId !== randomId) return r;
                const updated = { ...r, ...changes };
                updated.subtotal = updated.precio * updated.cantidad;
                return updated;
            })
        }));
    }, [mutateActive]);

    const removeRandomItem = useCallback((randomId: string) => {
        mutateActive(t => ({
            ...t,
            randomItems: t.randomItems.filter(r => r.randomId !== randomId)
        }));
    }, [mutateActive]);

    // ── Abonos ────────────────────────────────────────────────────────────────
    const addAbono = useCallback((monto: number, nota: string = '') => {
        if (monto <= 0) return;
        mutateActive(t => ({
            ...t,
            abonos: [
                ...t.abonos,
                {
                    id: `abono_${Date.now()}`,
                    monto,
                    nota,
                    fecha: new Date().toISOString(),
                }
            ]
        }));
    }, [mutateActive]);

    const removeAbono = useCallback((id: string) => {
        mutateActive(t => ({
            ...t,
            abonos: t.abonos.filter(a => a.id !== id)
        }));
    }, [mutateActive]);

    // ── Totales ───────────────────────────────────────────────────────────────
    const cartItems = activeTab.cartItems;
    const randomItems = activeTab.randomItems;
    const abonos = activeTab.abonos;
    const descuentoPorcentaje = activeTab.descuentoPorcentaje;

    const subtotalCatalogo = cartItems.reduce((acc, i) => acc + i.subtotal, 0);
    const subtotalRandom = randomItems.reduce((acc, r) => acc + r.subtotal, 0);
    const subtotal = subtotalCatalogo + subtotalRandom;
    const descuento = (subtotal * descuentoPorcentaje) / 100;
    const total = subtotal - descuento;
    const totalAbonado = abonos.reduce((acc, a) => acc + a.monto, 0);
    const saldoPendiente = Math.max(0, total - totalAbonado);
    const totalItems = cartItems.reduce((acc, i) => acc + i.cantidad, 0) + randomItems.reduce((acc, r) => acc + r.cantidad, 0);

    return (
        <CartContext.Provider
            value={{
                tabs, activeTabId, activeTab,
                addTab, removeTab, setActiveTabId, updateActiveTab,
                cartItems, addToCart, removeFromCart, incrementQuantity, decrementQuantity, clearCart,
                randomItems, addRandomItem, updateRandomItem, removeRandomItem,
                abonos, addAbono, removeAbono,
                subtotal, descuento, total, totalAbonado, saldoPendiente, totalItems,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
