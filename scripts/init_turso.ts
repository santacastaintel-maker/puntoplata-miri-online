import { createClient } from '@libsql/client/http';
import fs from 'fs';

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN as string,
});

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS vendedores (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT,
    color_identificador TEXT NOT NULL DEFAULT '#80854b',
    rol TEXT NOT NULL DEFAULT 'vendedor',
    activo INTEGER NOT NULL DEFAULT 1,
    pin_auth TEXT
);

CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    orden_visual INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id TEXT,
    precio REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    foto_key TEXT,
    palabras_clave TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    origen TEXT,
    marca TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    tipo_cliente TEXT NOT NULL DEFAULT 'normal',
    notas TEXT,
    total_compras REAL DEFAULT 0,
    numero_compras INTEGER DEFAULT 0,
    apartados_pendientes INTEGER DEFAULT 0,
    cancelaciones INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones_live (
    id TEXT PRIMARY KEY,
    vendedor_id TEXT,
    nombre_sesion TEXT,
    color_sesion TEXT,
    fecha_inicio TEXT,
    activa INTEGER DEFAULT 1,
    total_ventas_sesion REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ventas (
    id TEXT PRIMARY KEY,
    folio TEXT NOT NULL UNIQUE,
    sesion_id TEXT,
    vendedor_id TEXT NOT NULL,
    cliente_id TEXT,
    subtotal REAL DEFAULT 0,
    descuento REAL DEFAULT 0,
    total REAL DEFAULT 0,
    monto_abonado REAL DEFAULT 0,
    metodo_pago TEXT,
    estado TEXT DEFAULT 'completada',
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS venta_detalles (
    id TEXT PRIMARY KEY,
    venta_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
`;

async function initDB() {
    console.log('Inicializando tablas...');
    const statements = SCHEMA_SQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const sql of statements) {
        await turso.execute(sql);
    }
    
    // Clear products
    await turso.execute('DELETE FROM productos;');
    
    console.log('Tablas inicializadas en Turso.');
}

initDB().catch(console.error);
