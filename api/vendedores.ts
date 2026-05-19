// GET /api/vendedores — listar todos (sin pin_auth por seguridad)
// POST /api/vendedores — crear vendedor
// PATCH /api/vendedores?id= — actualizar (nombre, color, pin, activo)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from './_turso.js';
import { handleCors, sendError } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    try {
        if (req.method === 'GET') {
            // Devuelve vendedores activos — el pin_auth se incluye solo para login local
            const r = await turso.execute('SELECT * FROM vendedores ORDER BY rol DESC, nombre ASC');
            return res.json(r.rows.map(v => ({
                id: (v as any).id,
                nombre: (v as any).nombre,
                email: (v as any).email,
                color_identificador: (v as any).color_identificador,
                rol: (v as any).rol,
                activo: (v as any).activo === 1,
                pin_auth: (v as any).pin_auth, // Necesario para login local por PIN
            })));
        }

        if (req.method === 'POST') {
            const { id, nombre, email, color_identificador, rol, activo, pin_auth } = req.body;
            if (!id || !nombre) return sendError(res, 400, 'id y nombre requeridos');
            await turso.execute({
                sql: `INSERT INTO vendedores (id,nombre,email,color_identificador,rol,activo,pin_auth)
                      VALUES (?,?,?,?,?,?,?)`,
                args: [id, nombre, email || null, color_identificador || '#64748B', rol || 'vendedor',
                       activo !== false ? 1 : 0, pin_auth || null]
            });
            return res.status(201).json({ success: true, id });
        }

        if (req.method === 'PATCH') {
            const { id } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id requerido');
            const b = req.body;
            const fields: string[] = [];
            const args: any[] = [];

            if ('nombre' in b) { fields.push('nombre=?'); args.push(b.nombre); }
            if ('color_identificador' in b) { fields.push('color_identificador=?'); args.push(b.color_identificador); }
            if ('activo' in b) { fields.push('activo=?'); args.push(b.activo ? 1 : 0); }
            if ('pin_auth' in b) { fields.push('pin_auth=?'); args.push(b.pin_auth); }

            if (fields.length === 0) return sendError(res, 400, 'Sin campos');
            args.push(id);
            await turso.execute({ sql: `UPDATE vendedores SET ${fields.join(',')} WHERE id=?`, args });
            return res.json({ success: true });
        }

        return sendError(res, 405, 'Method not allowed');
    } catch (err: any) {
        console.error('vendedores error:', err);
        return sendError(res, 500, err.message || 'Error interno');
    }
}
