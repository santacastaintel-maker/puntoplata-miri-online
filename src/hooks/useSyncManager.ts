import { useEffect } from 'react';
import { db } from '../lib/db';
import { api } from '../lib/apiClient';
import { base64ToFile } from '../utils/mediaUtils';

export const useSyncManager = () => {
    useEffect(() => {
        let syncing = false;

        const processQueue = async () => {
            if (syncing || !navigator.onLine) return;
            syncing = true;

            try {
                // Obtenemos operaciones pendientes, procesamos en orden de creación
                const pendientes = await db.sync_queue
                    .where('estado')
                    .equals('pendiente')
                    .sortBy('created_at');

                for (const op of pendientes) {
                    try {
                        // Marcamos como procesando
                        await db.sync_queue.update(op.id, { estado: 'procesando' });

                        // Ejecutamos la operación en el backend
                        switch (op.operacion) {
                            case 'CREAR_PRODUCTO': {
                                let payload = { ...op.payload };
                                if (payload.foto_url && payload.foto_url.startsWith('data:image')) {
                                    const file = base64ToFile(payload.foto_url, `sync-${payload.id}.jpg`);
                                    const key = await api.photos.upload(file);
                                    payload.foto_key = key;
                                    payload.foto_url = key;
                                    // Actualizar localmente también para que tenga el key
                                    await db.productos.update(payload.id, { foto_url: key, foto_key: key });
                                }
                                await api.productos.create(payload);
                                break;
                            }
                            case 'ACTUALIZAR_PRODUCTO': {
                                let cambios = { ...op.payload.cambios };
                                if (cambios.foto_url && cambios.foto_url.startsWith('data:image')) {
                                    const file = base64ToFile(cambios.foto_url, `sync-${op.payload.id}.jpg`);
                                    const key = await api.photos.upload(file);
                                    cambios.foto_key = key;
                                    cambios.foto_url = key;
                                    await db.productos.update(op.payload.id, { foto_url: key, foto_key: key });
                                }
                                await api.productos.update(op.payload.id, cambios);
                                break;
                            }
                            case 'ELIMINAR_PRODUCTO':
                                await api.productos.delete(op.payload.id);
                                break;
                            case 'CREAR_VENTA':
                                await api.ventas.create(op.payload);
                                break;
                            case 'CANCELAR_VENTA':
                                await api.ventas.cancelar(op.payload.id);
                                break;
                            default:
                                console.warn('Operación de sincronización desconocida:', op.operacion);
                        }

                        // Si tuvo éxito, la eliminamos de la cola
                        await db.sync_queue.delete(op.id);
                    } catch (err: any) {
                        console.error('Error al sincronizar operación', op.id, err);
                        // Marcamos error y la dejamos en la cola para no bloquear
                        await db.sync_queue.update(op.id, { estado: 'error', error: err.message });
                    }
                }
            } catch (err) {
                console.error('Error general procesando sync_queue', err);
            } finally {
                syncing = false;
            }
        };

        // Procesar al montar si estamos online
        processQueue();

        // Procesar cuando vuelva la conexión
        window.addEventListener('online', processQueue);

        // Procesar periódicamente cada 30 segundos como fallback
        const interval = setInterval(processQueue, 30000);

        return () => {
            window.removeEventListener('online', processQueue);
            clearInterval(interval);
        };
    }, []);
};
