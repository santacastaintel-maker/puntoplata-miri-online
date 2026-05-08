import Dexie, { Table } from 'dexie';
import { Vendedor, Categoria, Producto, Cliente, SesionLive, Venta, VentaDetalle, SyncOperation } from '../types';

export class PuntoPlataDB extends Dexie {
    vendedores!: Table<Vendedor, string>;
    categorias!: Table<Categoria, string>;
    productos!: Table<Producto, string>;
    clientes!: Table<Cliente, string>;
    sesiones_live!: Table<SesionLive, string>;
    ventas!: Table<Venta, string>;
    venta_detalles!: Table<VentaDetalle, string>;
    config!: Table<{ key: string, value: any, updated_at: string }, string>;
    sync_queue!: Table<SyncOperation, string>;

    constructor() {
        super('PuntoPlataDB');
        this.version(1).stores({
            vendedores: 'id, rol, nombre',
            categorias: 'id, nombre, orden_visual',
            productos: 'id, codigo, nombre, categoria_id, activo',
            clientes: 'id, nombre, telefono',
            sesiones_live: 'id, activa',
            ventas: 'id, folio, fecha',
            venta_detalles: 'id, venta_id, producto_id'
        }).upgrade(tx => {
            // Add default values for new client fields
            return tx.table('clientes').toCollection().modify(cliente => {
                if (cliente.apartados_pendientes === undefined) cliente.apartados_pendientes = 0;
                if (cliente.cancelaciones === undefined) cliente.cancelaciones = 0;
            });
        });

        // v3: Add config table and product origin
        this.version(3).stores({
            vendedores: 'id, rol, nombre',
            categorias: 'id, nombre, orden_visual',
            productos: 'id, codigo, nombre, categoria_id, activo, origen',
            clientes: 'id, nombre, telefono, apartados_pendientes',
            sesiones_live: 'id, activa',
            ventas: 'id, folio, fecha, estado, cliente_id, vendedor_id',
            venta_detalles: 'id, venta_id, producto_id',
            config: 'key'
        });

        // v4: Add marca field to productos
        this.version(4).stores({
            vendedores: 'id, rol, nombre',
            categorias: 'id, nombre, orden_visual',
            productos: 'id, codigo, nombre, categoria_id, activo, origen, marca',
            clientes: 'id, nombre, telefono, apartados_pendientes',
            sesiones_live: 'id, activa',
            ventas: 'id, folio, fecha, estado, cliente_id, vendedor_id',
            venta_detalles: 'id, venta_id, producto_id',
            config: 'key'
        });

        // v5: Add sync_queue and clear productos (user requested fresh start)
        this.version(5).stores({
            vendedores: 'id, rol, nombre',
            categorias: 'id, nombre, orden_visual',
            productos: 'id, codigo, nombre, categoria_id, activo, origen, marca',
            clientes: 'id, nombre, telefono, apartados_pendientes',
            sesiones_live: 'id, activa',
            ventas: 'id, folio, fecha, estado, cliente_id, vendedor_id',
            venta_detalles: 'id, venta_id, producto_id',
            config: 'key',
            sync_queue: 'id, operacion, estado'
        }).upgrade(async tx => {
            // Clear products as requested
            await tx.table('productos').clear();
        });
    }
}

export const db = new PuntoPlataDB();

// Poblar datos iniciales si la DB está vacía
db.on('populate', async () => {
    await db.vendedores.add({
        id: 'admin-id-123',
        nombre: 'Dueño',
        email: null,
        color_identificador: '#80854b',
        rol: 'admin',
        activo: true,
        pin_auth: '9999' as any
    });

    await db.vendedores.add({
        id: 'vendedor-id-456',
        nombre: 'Vendedor Estándar',
        email: null,
        color_identificador: '#3B82F6',
        rol: 'vendedor',
        activo: true,
        pin_auth: null as any
    });

    const initialCats = [
        { id: 'cat-1', nombre: 'Anillos', orden_visual: 1 },
        { id: 'cat-2', nombre: 'Collares', orden_visual: 2 },
        { id: 'cat-3', nombre: 'Pulseras', orden_visual: 3 },
        { id: 'cat-4', nombre: 'Aretes', orden_visual: 4 },
        { id: 'cat-5', nombre: 'Sets', orden_visual: 5 },
        { id: 'cat-6', nombre: 'Charms', orden_visual: 6 },
        { id: 'cat-7', nombre: 'Esclavas', orden_visual: 7 },
        { id: 'cat-8', nombre: 'Cadenas', orden_visual: 8 },
        { id: 'cat-9', nombre: 'Dijes', orden_visual: 9 },
        { id: 'cat-10', nombre: 'Gargantillas', orden_visual: 10 },
    ];

    for (const cat of initialCats) {
        await db.categorias.add({ ...cat, descripcion: null });
    }

    // Configuración por defecto
    const now = new Date().toISOString();
    await db.config.bulkAdd([
        { key: 'max_descuento', value: 15, updated_at: now },
        { key: 'banco_nombre', value: 'BANAMEX', updated_at: now },
        { key: 'clabe_cuenta', value: '123456789012345678', updated_at: now },
        { key: 'titular_cuenta', value: 'Dueño de la Platería', updated_at: now }
    ]);
});
