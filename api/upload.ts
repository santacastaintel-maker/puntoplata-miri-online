// POST /api/upload — sube una imagen a Cloudflare R2
// Content-Type: multipart/form-data con campo 'file'
// Devuelve: { key: 'uuid.jpg' }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { uploadToR2 } from './_r2.js';
import { handleCors, sendError } from './_helpers.js';
import { IncomingForm, File as FormidableFile } from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export const config = {
    api: { bodyParser: false }, // Necesario para manejar multipart
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');

    try {
        // Parsear el formulario multipart
        const form = new IncomingForm({ keepExtensions: true, maxFileSize: 5 * 1024 * 1024 }); // 5MB max

        const { files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
            form.parse(req as any, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        });

        const uploadedFile: FormidableFile = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!uploadedFile) return sendError(res, 400, 'No se recibió ningún archivo');

        const ext = path.extname(uploadedFile.originalFilename || '.jpg').toLowerCase() || '.jpg';
        const key = `${crypto.randomUUID()}${ext}`;
        const buffer = fs.readFileSync(uploadedFile.filepath);
        const contentType = uploadedFile.mimetype || 'image/jpeg';

        await uploadToR2(key, buffer, contentType);

        // Limpiar archivo temporal
        try { fs.unlinkSync(uploadedFile.filepath); } catch {}

        return res.status(201).json({ key, url: `/api/image?key=${key}` });
    } catch (err: any) {
        console.error('upload error:', err);
        return sendError(res, 500, err.message || 'Error al subir archivo');
    }
}
