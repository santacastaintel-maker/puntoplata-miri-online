// GET /api/clientes?q=
// POST /api/clientes — crear o encontrar cliente existente
// PATCH /api/clientes?id= — actualizar datos del cliente
// GET /api/clientes?id=&historial=true — historial de ventas
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from './_turso.js';
import { handleCors, sendError } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    try {
        if (req.method === 'GET') {
            const { q = '', id, historial } = req.query as Record<string, string>;

            // Historial de un cliente
            if (id && historial === 'true') {
                const r = await turso.execute({
                    sql: `SELECT * FROM ventas WHERE cliente_id = ? ORDER BY created_at DESC`,
                    args: [id]
                });
                return res.json(r.rows.map(row => ({
                    ...row,
                    subtotal: Number((row as any).subtotal),
                    total: Number((row as any).total),
                })));
            }

            // Un cliente por id
            if (id) {
                const r = await turso.execute({ sql: 'SELECT * FROM clientes WHERE id=?', args: [id] });
                if (r.rows.length === 0) return sendError(res, 404, 'Cliente no encontrado');
                return res.json(formatCliente(r.rows[0]));
            }

            // Búsqueda
            const r = await turso.execute({
                sql: `SELECT * FROM clientes
                      WHERE LOWER(nombre) LIKE ? OR telefono LIKE ?
                      ORDER BY created_at DESC LIMIT 20`,
                args: [`%${q.toLowerCase()}%`, `%${q}%`]
            });
            return res.json(r.rows.map(formatCliente));
        }

        if (req.method === 'POST') {
            const { id: reqId, nombre, telefono, email } = req.body;
            if (!nombre?.trim()) return sendError(res, 400, 'nombre requerido');

            // Deduplicación (solo si no se proporciona un id explícito para evitar colisión de re-creación)
            if (!reqId && telefono) {
                const exist = await turso.execute({
                    sql: 'SELECT * FROM clientes WHERE telefono = ? LIMIT 1',
                    args: [telefono]
                });
                if (exist.rows.length > 0) return res.json(formatCliente(exist.rows[0]));
            }

            const id = reqId || crypto.randomUUID();
            const now = new Date().toISOString();
            await turso.execute({
                sql: `INSERT INTO clientes (id,nombre,telefono,email,tipo_cliente,notas,total_compras,numero_compras,apartados_pendientes,cancelaciones,created_at)
                      VALUES (?,?,?,?,'normal',NULL,0,0,0,0,?)`,
                args: [id, nombre.trim(), telefono || null, email || null, now]
            });
            return res.status(201).json({ id, nombre: nombre.trim(), telefono: telefono || null, email: email || null,
                tipo_cliente: 'normal', total_compras: 0, numero_compras: 0, apartados_pendientes: 0, cancelaciones: 0, created_at: now });
        }

        if (req.method === 'PATCH') {
            const { id } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id requerido');
            const { nombre, telefono, email, tipo_cliente, notas } = req.body;
            await turso.execute({
                sql: `UPDATE clientes SET nombre=?, telefono=?, email=?, tipo_cliente=?, notas=? WHERE id=?`,
                args: [nombre, telefono || null, email || null, tipo_cliente || 'normal', notas || null, id]
            });
            return res.json({ success: true });
        }

        return sendError(res, 405, 'Method not allowed');
    } catch (err: any) {
        console.error('clientes error:', err);
        return sendError(res, 500, err.message || 'Error interno');
    }
}

function formatCliente(row: any) {
    return {
        ...row,
        total_compras: Number(row.total_compras),
        numero_compras: Number(row.numero_compras),
        apartados_pendientes: Number(row.apartados_pendientes),
        cancelaciones: Number(row.cancelaciones),
    };
}
