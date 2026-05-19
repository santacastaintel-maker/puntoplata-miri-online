// GET /api/image?key=uuid.jpg — proxy de imágenes desde R2
// Genera URL firmada y redirige al cliente
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPresignedUrl } from './_r2.js';
import { handleCors, sendError } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');

    const { key } = req.query as Record<string, string>;
    if (!key) return sendError(res, 400, 'key requerido');

    try {
        const signedUrl = await getPresignedUrl(key);
        // Redirigir al cliente con la URL firmada de R2 (válida 24h)
        res.setHeader('Cache-Control', 'public, max-age=3600'); // caché 1h en el browser
        res.redirect(302, signedUrl);
    } catch (err: any) {
        console.error('image proxy error:', err);
        return sendError(res, 404, 'Imagen no encontrada');
    }
}
