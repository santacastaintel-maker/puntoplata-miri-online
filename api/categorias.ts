// GET /api/categorias — listar todas
// POST /api/categorias — crear categoría
// PATCH /api/categorias?id= — actualizar
// DELETE /api/categorias?id= — eliminar
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from './_turso.js';
import { handleCors, sendError } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    try {
        if (req.method === 'GET') {
            const r = await turso.execute('SELECT * FROM categorias ORDER BY orden_visual ASC, nombre ASC');
            return res.json(r.rows);
        }

        if (req.method === 'POST') {
            const { id, nombre, descripcion, orden_visual } = req.body;
            if (!id || !nombre) return sendError(res, 400, 'id y nombre son requeridos');
            await turso.execute({
                sql: 'INSERT INTO categorias (id, nombre, descripcion, orden_visual) VALUES (?,?,?,?)',
                args: [id, nombre, descripcion || null, orden_visual || 0]
            });
            return res.status(201).json({ success: true, id });
        }

        if (req.method === 'PATCH') {
            const { id } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id requerido');
            const { nombre, descripcion, orden_visual } = req.body;
            await turso.execute({
                sql: 'UPDATE categorias SET nombre=?, descripcion=?, orden_visual=? WHERE id=?',
                args: [nombre, descripcion || null, orden_visual, id]
            });
            return res.json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { id } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id requerido');
            await turso.execute({ sql: 'DELETE FROM categorias WHERE id=?', args: [id] });
            return res.json({ success: true });
        }

        return sendError(res, 405, 'Method not allowed');
    } catch (err: any) {
        console.error('categorias error:', err);
        return sendError(res, 500, err.message || 'Error interno');
    }
}
