import { useState, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { db } from '../lib/db'; // Dexie como fallback offline
import { Producto, FiltrosProductos } from '../types';

export const useProductos = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buscarProductos = useCallback(async (query: string, filtros?: FiltrosProductos) => {
        try {
            setLoading(true);
            setError(null);

            let data: Producto[];

            if (navigator.onLine) {
                // 🌐 Online — usar API Turso
                data = await api.productos.list(query, {
                    categoria_id: filtros?.categoria_id,
                    marca: filtros?.marca,
                }) as Producto[];
                // Guardar en caché local
                await db.productos.bulkPut(data.map(p => ({ ...p, activo: p.activo ? true : false })));
            } else {
                // 📴 Offline — usar Dexie
                let q = db.productos.filter(p => !!p.activo);
                if (filtros?.categoria_id) q = q.filter(p => p.categoria_id === filtros.categoria_id);
                data = await q.toArray();
                if (query) {
                    const lq = query.toLowerCase();
                    data = data.filter(p =>
                        p.codigo.toLowerCase().includes(lq) ||
                        p.nombre.toLowerCase().includes(lq)
                    );
                }
                // Enriquecer con categorías locales
                const cats = await db.categorias.toArray();
                const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
                data = data.map(p => ({ ...p, categorias: p.categoria_id ? catMap[p.categoria_id] : undefined }));
                data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            }

            setProductos(data);
            return data;
        } catch (err: any) {
            setError(err.message || 'Error buscando productos');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const getProductoByCodigo = useCallback(async (codigo: string) => {
        try {
            setLoading(true);
            if (navigator.onLine) {
                const list = await api.productos.list(codigo) as Producto[];
                return list.find(p => p.codigo.toLowerCase() === codigo.toLowerCase()) || null;
            }
            const data = await db.productos.where('codigo').equals(codigo).filter(p => !!p.activo).first();
            if (data?.categoria_id) {
                const cat = await db.categorias.get(data.categoria_id);
                if (cat) data.categorias = cat;
            }
            return data || null;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const crearProducto = useCallback(async (producto: Producto) => {
        try {
            setLoading(true);
            if (navigator.onLine) {
                try {
                    await api.productos.create(producto);
                } catch (apiErr) {
                    // Si falla, encolar
                    await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'CREAR_PRODUCTO', payload: producto, estado: 'pendiente', created_at: new Date().toISOString() });
                }
            } else {
                await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'CREAR_PRODUCTO', payload: producto, estado: 'pendiente', created_at: new Date().toISOString() });
            }
            await db.productos.put(producto); // siempre en caché local
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const actualizarProducto = useCallback(async (id: string, cambios: Partial<Producto>) => {
        try {
            setLoading(true);
            if (navigator.onLine) {
                try {
                    await api.productos.update(id, cambios);
                } catch (apiErr) {
                    await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'ACTUALIZAR_PRODUCTO', payload: { id, cambios }, estado: 'pendiente', created_at: new Date().toISOString() });
                }
            } else {
                await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'ACTUALIZAR_PRODUCTO', payload: { id, cambios }, estado: 'pendiente', created_at: new Date().toISOString() });
            }
            await db.productos.update(id, cambios);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const eliminarProducto = useCallback(async (id: string) => {
        try {
            setLoading(true);
            if (navigator.onLine) {
                try {
                    await api.productos.delete(id);
                } catch (apiErr) {
                    await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'ELIMINAR_PRODUCTO', payload: { id }, estado: 'pendiente', created_at: new Date().toISOString() });
                }
            } else {
                await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'ELIMINAR_PRODUCTO', payload: { id }, estado: 'pendiente', created_at: new Date().toISOString() });
            }
            await db.productos.update(id, { activo: false });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        productos,
        loading,
        error,
        buscarProductos,
        getProductoByCodigo,
        crearProducto,
        actualizarProducto,
        eliminarProducto,
    };
};
