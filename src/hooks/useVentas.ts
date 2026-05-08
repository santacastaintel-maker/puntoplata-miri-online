import { useState, useCallback } from 'react';
import { api } from '../lib/apiClient';
import { db } from '../lib/db';
import { NuevaVentaPayload, Venta, FiltroVentas } from '../types';

export const useVentas = (_token?: string | null) => {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getMisVentas = useCallback(async (filtros: FiltroVentas, vendedorId: string) => {
        try {
            setLoading(true);
            setError(null);
            let data: Venta[];
            if (navigator.onLine) {
                data = await api.ventas.list(vendedorId, {
                    fecha_desde: filtros.fecha_desde,
                    fecha_hasta: filtros.fecha_hasta,
                    sesion_id: filtros.sesion_id,
                }) as Venta[];
            } else {
                // Fallback offline
                let q = db.ventas.where('vendedor_id').equals(vendedorId);
                data = await q.toArray();
                if (filtros.sesion_id) data = data.filter(v => v.sesion_id === filtros.sesion_id);
                if (filtros.fecha_desde) {
                    const desde = new Date(filtros.fecha_desde).getTime();
                    data = data.filter(v => new Date(v.created_at).getTime() >= desde);
                }
                if (filtros.fecha_hasta) {
                    const hasta = new Date(filtros.fecha_hasta).getTime() + 86400000;
                    data = data.filter(v => new Date(v.created_at).getTime() < hasta);
                }
                data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            setVentas(data);
            return data;
        } catch (err: any) {
            setError(err.message || 'Error al obtener ventas');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const crearVenta = useCallback(async (payload: NuevaVentaPayload) => {
        try {
            setLoading(true);
            setError(null);
            let resultId = crypto.randomUUID();
            let resultEstado: EstadoVenta = 'completada';
            let resultCreatedAt = new Date().toISOString();
            let resultFolio = `FOLIO-${Date.now().toString(36).toUpperCase()}`;

            if (navigator.onLine) {
                try {
                    const result = await api.ventas.create(payload);
                    resultId = result.id;
                    resultEstado = result.estado || 'completada';
                    resultCreatedAt = result.created_at || resultCreatedAt;
                    resultFolio = result.folio;
                } catch (apiErr) {
                    await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'CREAR_VENTA', payload, estado: 'pendiente', created_at: new Date().toISOString() });
                }
            } else {
                await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'CREAR_VENTA', payload, estado: 'pendiente', created_at: new Date().toISOString() });
            }

            // También guardar en Dexie para historial offline
            const nuevaVenta: Venta = {
                id: resultId,
                folio: resultFolio,
                sesion_id: payload.sesion_id,
                vendedor_id: payload.vendedor_id,
                cliente_id: payload.cliente_id,
                subtotal: payload.subtotal,
                descuento: payload.descuento,
                total: payload.total,
                monto_abonado: (payload as any).monto_abonado || payload.total,
                metodo_pago: payload.metodo_pago,
                estado: resultEstado,
                notas: payload.notas || null,
                created_at: resultCreatedAt,
            };
            await db.ventas.put(nuevaVenta);
            return nuevaVenta;
        } catch (err: any) {
            setError(err.message || 'Error al completar la venta');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const cancelarVenta = useCallback(async (ventaId: string) => {
        try {
            setLoading(true);
            setError(null);
            if (navigator.onLine) {
                try {
                    await api.ventas.cancelar(ventaId);
                } catch (apiErr) {
                    await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'CANCELAR_VENTA', payload: { id: ventaId }, estado: 'pendiente', created_at: new Date().toISOString() });
                }
            } else {
                await db.sync_queue.add({ id: crypto.randomUUID(), operacion: 'CANCELAR_VENTA', payload: { id: ventaId }, estado: 'pendiente', created_at: new Date().toISOString() });
            }
            await db.ventas.update(ventaId, { estado: 'cancelada' });
            setVentas(prev => prev.map(v => v.id === ventaId ? { ...v, estado: 'cancelada' } : v));
            return { id: ventaId };
        } catch (err: any) {
            setError(err.message || 'Error al cancelar la venta');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { ventas, loading, error, getMisVentas, crearVenta, cancelarVenta };
};
