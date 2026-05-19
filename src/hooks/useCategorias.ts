import { generateId } from '../utils/idUtils';
import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { db } from '../lib/db';
import { Categoria } from '../types';

export const useCategorias = () => {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCategorias = useCallback(async () => {
        try {
            setLoading(true);
            let data: Categoria[];
            if (navigator.onLine) {
                data = await api.categorias.list() as Categoria[];
                await db.categorias.bulkPut(data);
            } else {
                data = await db.categorias.orderBy('orden_visual').toArray();
            }
            setCategorias(data);
            return data;
        } catch (err: any) {
            setError(err.message || 'Error cargando categorías');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategorias(); }, [fetchCategorias]);

    const crearCategoria = useCallback(async (categoria: Omit<Categoria, 'id'>) => {
        try {
            setLoading(true);
            const newId = generateId();
            const newCat = { ...categoria, id: newId };
            await api.categorias.create(newCat);
            await db.categorias.add(newCat);
            await fetchCategorias();
            return { success: true, data: newCat };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [fetchCategorias]);

    const actualizarCategoria = useCallback(async (id: string, cambios: Partial<Categoria>) => {
        try {
            setLoading(true);
            await api.categorias.update(id, cambios);
            await db.categorias.update(id, cambios);
            await fetchCategorias();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [fetchCategorias]);

    const eliminarCategoria = useCallback(async (id: string) => {
        try {
            setLoading(true);
            await api.categorias.delete(id);
            await db.categorias.delete(id);
            await fetchCategorias();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [fetchCategorias]);

    return { categorias, loading, error, fetchCategorias, crearCategoria, actualizarCategoria, eliminarCategoria };
};
