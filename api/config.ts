// GET /api/config — obtener todas las configuraciones
// POST /api/config — guardar/actualizar múltiples configuraciones
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from './_turso.js';
import { handleCors, sendError } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    try {
        if (req.method === 'GET') {
            const r = await turso.execute('SELECT key, value FROM config');
            const config: Record<string, string> = {};
            for (const row of r.rows as any[]) {
                config[row.key] = row.value;
            }
            return res.json(config);
        }

        if (req.method === 'POST') {
            const updates = req.body as Record<string, string>;
            const now = new Date().toISOString();
            const batch = Object.entries(updates).map(([key, value]) => ({
                sql: 'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?,?,?)',
                args: [key, String(value), now]
            }));
            if (batch.length > 0) await turso.batch(batch);
            return res.json({ success: true });
        }

        return sendError(res, 405, 'Method not allowed');
    } catch (err: any) {
        console.error('config error:', err);
        return sendError(res, 500, err.message || 'Error interno');
    }
}
