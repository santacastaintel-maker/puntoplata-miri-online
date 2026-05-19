// GET /api/productos?q=&categoria_id=&marca=&solo_activos=true
// POST /api/productos — crear producto
// PATCH /api/productos?id= — actualizar producto
// DELETE /api/productos?id= — eliminar (soft delete)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from './_turso';
import { handleCors, sendError } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    try {
        // ── GET ──────────────────────────────────────────────────────────────
        if (req.method === 'GET') {
            const { q = '', categoria_id, marca, solo_activos = 'true', id } = req.query as Record<string, string>;

            // Si viene id, devolver solo ese producto
            if (id) {
                const r = await turso.execute({
                    sql: `SELECT p.*, c.nombre as cat_nombre, c.descripcion as cat_desc, c.orden_visual as cat_orden
                          FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
                          WHERE p.id = ?`,
                    args: [id]
                });
                if (r.rows.length === 0) return sendError(res, 404, 'Producto no encontrado');
                return res.json(formatProducto(r.rows[0]));
            }

            let sql = `SELECT p.*, c.nombre as cat_nombre, c.descripcion as cat_desc, c.orden_visual as cat_orden
                       FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
                       WHERE 1=1`;
            const args: any[] = [];

            if (solo_activos === 'true') { sql += ' AND p.activo = 1'; }
            if (categoria_id) { sql += ' AND p.categoria_id = ?'; args.push(categoria_id); }
            if (marca) { sql += ' AND LOWER(p.marca) LIKE ?'; args.push(`%${marca.toLowerCase()}%`); }
            if (q) {
                sql += ' AND (LOWER(p.nombre) LIKE ? OR LOWER(p.codigo) LIKE ? OR LOWER(p.marca) LIKE ?)';
                const lq = `%${q.toLowerCase()}%`;
                args.push(lq, lq, lq);
            }
            sql += ' ORDER BY p.nombre ASC';

            const result = await turso.execute({ sql, args });
            return res.json(result.rows.map(formatProducto));
        }

        // ── POST ─────────────────────────────────────────────────────────────
        if (req.method === 'POST') {
            const b = req.body;
            const { id, codigo, nombre, descripcion, categoria_id, precio, stock, foto_key, palabras_clave, activo, origen, marca, talla } = b;
            if (!id || !codigo || !nombre) return sendError(res, 400, 'id, codigo y nombre son requeridos');

            await turso.execute({
                sql: `INSERT INTO productos (id,codigo,nombre,descripcion,categoria_id,precio,stock,foto_key,palabras_clave,activo,origen,marca,talla)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                args: [id, codigo, nombre, descripcion || null, categoria_id || null, precio || 0, stock || 0,
                       foto_key || null, palabras_clave ? JSON.stringify(palabras_clave) : null,
                       activo !== false ? 1 : 0, origen || 'app', marca || null, talla || null]
            });
            return res.status(201).json({ success: true, id });
        }

        // ── PATCH ────────────────────────────────────────────────────────────
        if (req.method === 'PATCH') {
            const { id } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id es requerido');
            const b = req.body;

            const fields: string[] = [];
            const args: any[] = [];
            const allowed = ['codigo','nombre','descripcion','categoria_id','precio','stock','foto_key','activo','marca','origen','talla'];
            for (const key of allowed) {
                if (key in b) {
                    fields.push(`${key} = ?`);
                    args.push(key === 'activo' ? (b[key] ? 1 : 0) : b[key]);
                }
            }
            if (fields.length === 0) return sendError(res, 400, 'Sin campos para actualizar');
            args.push(id);
            await turso.execute({ sql: `UPDATE productos SET ${fields.join(', ')} WHERE id = ?`, args });
            return res.json({ success: true });
        }

        // ── DELETE (soft) ─────────────────────────────────────────────────
        if (req.method === 'DELETE') {
            const { id } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id es requerido');
            await turso.execute({ sql: `UPDATE productos SET activo = 0 WHERE id = ?`, args: [id] });
            return res.json({ success: true });
        }

        return sendError(res, 405, 'Method not allowed');
    } catch (err: any) {
        console.error('productos error:', err);
        return sendError(res, 500, err.message || 'Error interno');
    }
}

function formatProducto(row: any) {
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        descripcion: row.descripcion,
        categoria_id: row.categoria_id,
        precio: Number(row.precio),
        stock: Number(row.stock),
        foto_url: row.foto_key,      // El frontend usará /api/image?key=xxx
        foto_key: row.foto_key,
        palabras_clave: row.palabras_clave ? JSON.parse(row.palabras_clave as string) : null,
        activo: row.activo === 1,
        origen: row.origen,
        marca: row.marca,
        talla: row.talla,
        categorias: row.cat_nombre ? {
            id: row.categoria_id,
            nombre: row.cat_nombre,
            descripcion: row.cat_desc,
            orden_visual: Number(row.cat_orden)
        } : undefined
    };
}
