// POST /api/ventas — crear venta + detalles (transacción atómica)
// GET /api/ventas?vendedor_id=&fecha_desde=&fecha_hasta=&sesion_id=
// PATCH /api/ventas?id=&action=cancelar — cancelar venta
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from './_turso.js';
import { handleCors, sendError } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res)) return;

    try {
        // ── GET ──────────────────────────────────────────────────────────────
        if (req.method === 'GET') {
            const { vendedor_id, fecha_desde, fecha_hasta, sesion_id } = req.query as Record<string, string>;
            if (!vendedor_id) return sendError(res, 400, 'vendedor_id requerido');

            let sql = `SELECT v.*, c.nombre as cliente_nombre FROM ventas v
                       LEFT JOIN clientes c ON v.cliente_id = c.id
                       WHERE v.vendedor_id = ?`;
            const args: any[] = [vendedor_id];

            if (sesion_id) { sql += ' AND v.sesion_id = ?'; args.push(sesion_id); }
            if (fecha_desde) { sql += ' AND v.created_at >= ?'; args.push(fecha_desde); }
            if (fecha_hasta) { sql += ' AND v.created_at <= ?'; args.push(fecha_hasta + 'T23:59:59'); }
            sql += ' ORDER BY v.created_at DESC LIMIT 100';

            const r = await turso.execute({ sql, args });
            return res.json(r.rows.map(row => ({
                ...row,
                subtotal: Number(row.subtotal),
                descuento: Number(row.descuento),
                total: Number(row.total),
                monto_abonado: Number(row.monto_abonado),
                clientes: row.cliente_nombre ? { nombre: row.cliente_nombre } : undefined
            })));
        }

        // ── POST (crear venta) ────────────────────────────────────────────────
        if (req.method === 'POST') {
            const payload = req.body;
            const { id: reqId, folio: reqFolio, sesion_id, vendedor_id, cliente_id, subtotal, descuento, total,
                    metodo_pago, notas, detalles, monto_abonado, esApartado } = payload;

            if (!vendedor_id) return sendError(res, 400, 'vendedor_id requerido');

            // Evitar duplicados si ya existe la venta (útil para la sincronización)
            if (reqId) {
                const exist = await turso.execute({
                    sql: 'SELECT id, folio, estado, created_at FROM ventas WHERE id = ? LIMIT 1',
                    args: [reqId]
                });
                if (exist.rows.length > 0) {
                    const row = exist.rows[0] as any;
                    return res.json({ success: true, id: row.id, folio: row.folio, estado: row.estado, created_at: row.created_at, message: 'Venta ya existe' });
                }
            }

            // Generar folio único si no se proporciona uno
            let folio = reqFolio;
            if (!folio) {
                const countR = await turso.execute('SELECT COUNT(*) as cnt FROM ventas');
                const count = Number((countR.rows[0] as any).cnt);
                folio = `FOLIO-${String(count + 1).padStart(5, '0')}`;
            }
            
            const ventaId = reqId || crypto.randomUUID();
            const now = new Date().toISOString();
            const estado = esApartado ? 'apartado' : 'completada';
            const abonado = monto_abonado ?? (esApartado ? 0 : total);

            // Batch de operaciones atómicas
            const batch: any[] = [
                {
                    sql: `INSERT INTO ventas (id,folio,sesion_id,vendedor_id,cliente_id,subtotal,descuento,total,monto_abonado,metodo_pago,estado,notas,created_at)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    args: [ventaId, folio, sesion_id || null, vendedor_id, cliente_id || null,
                           subtotal, descuento, total, abonado, metodo_pago || null, estado, notas || null, now]
                }
            ];

            // Detalles y reducción de stock
            if (detalles && detalles.length > 0) {
                for (const det of detalles) {
                    batch.push({
                        sql: `INSERT INTO venta_detalles (id,venta_id,producto_id,cantidad,precio_unitario,subtotal)
                              VALUES (?,?,?,?,?,?)`,
                        args: [det.id || crypto.randomUUID(), ventaId, det.producto_id, det.cantidad, det.precio_unitario, det.subtotal]
                    });
                    batch.push({
                        sql: `UPDATE productos SET stock = MAX(0, stock - ?) WHERE id = ?`,
                        args: [det.cantidad, det.producto_id]
                    });
                }
            }

            // Actualizar estadísticas del cliente
            if (cliente_id) {
                if (esApartado) {
                    batch.push({
                        sql: `UPDATE clientes SET apartados_pendientes = apartados_pendientes + 1 WHERE id = ?`,
                        args: [cliente_id]
                    });
                } else {
                    batch.push({
                        sql: `UPDATE clientes SET total_compras = total_compras + ?, numero_compras = numero_compras + 1 WHERE id = ?`,
                        args: [total, cliente_id]
                    });
                }
            }

            await turso.batch(batch);
            return res.status(201).json({ success: true, id: ventaId, folio, estado, created_at: now });
        }

        // ── PATCH (cancelar) ──────────────────────────────────────────────────
        if (req.method === 'PATCH') {
            const { id, action } = req.query as Record<string, string>;
            if (!id) return sendError(res, 400, 'id requerido');

            if (action === 'cancelar') {
                // Obtener venta
                const vR = await turso.execute({ sql: 'SELECT * FROM ventas WHERE id=?', args: [id] });
                if (vR.rows.length === 0) return sendError(res, 404, 'Venta no encontrada');
                const venta = vR.rows[0] as any;
                if (venta.estado === 'cancelada') return sendError(res, 400, 'Ya está cancelada');

                const wasApartado = venta.estado === 'apartado';

                // Obtener detalles para restaurar stock
                const detR = await turso.execute({ sql: 'SELECT * FROM venta_detalles WHERE venta_id=?', args: [id] });

                const batch: any[] = [
                    { sql: `UPDATE ventas SET estado='cancelada' WHERE id=?`, args: [id] }
                ];

                // Restaurar stock
                for (const det of detR.rows as any[]) {
                    batch.push({
                        sql: `UPDATE productos SET stock = stock + ? WHERE id = ?`,
                        args: [det.cantidad, det.producto_id]
                    });
                }

                // Actualizar cliente
                if (venta.cliente_id) {
                    if (wasApartado) {
                        batch.push({
                            sql: `UPDATE clientes SET cancelaciones=cancelaciones+1, apartados_pendientes=MAX(0,apartados_pendientes-1) WHERE id=?`,
                            args: [venta.cliente_id]
                        });
                    } else {
                        batch.push({
                            sql: `UPDATE clientes SET cancelaciones=cancelaciones+1 WHERE id=?`,
                            args: [venta.cliente_id]
                        });
                    }
                }

                await turso.batch(batch);
                return res.json({ success: true });
            }

            return sendError(res, 400, 'action no reconocida');
        }

        return sendError(res, 405, 'Method not allowed');
    } catch (err: any) {
        console.error('ventas error:', err);
        return sendError(res, 500, err.message || 'Error interno');
    }
}
