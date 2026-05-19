import { createClient } from '@libsql/client/http';

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
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
    talla TEXT,
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

INSERT OR IGNORE INTO config (key, value) VALUES
    ('max_descuento', '15'),
    ('banco_nombre', 'BANAMEX'),
    ('clabe_cuenta', ''),
    ('titular_cuenta', 'Miri Montero');

INSERT OR IGNORE INTO categorias (id, nombre, descripcion, orden_visual) VALUES
    ('cat-1', 'Anillos', NULL, 1),
    ('cat-2', 'Collares', NULL, 2),
    ('cat-3', 'Pulseras', NULL, 3),
    ('cat-4', 'Aretes', NULL, 4),
    ('cat-5', 'Sets', NULL, 5),
    ('cat-6', 'Charms', NULL, 6),
    ('cat-7', 'Esclavas', NULL, 7),
    ('cat-8', 'Cadenas', NULL, 8),
    ('cat-9', 'Dijes', NULL, 9),
    ('cat-10', 'Gargantillas', NULL, 10);

INSERT OR IGNORE INTO vendedores (id, nombre, email, color_identificador, rol, activo, pin_auth) VALUES
    ('admin-id-123', 'Dueño', NULL, '#80854b', 'admin', 1, '9999'),
    ('vendedor-id-456', 'Vendedor Estándar', NULL, '#3B82F6', 'vendedor', 1, NULL);
`;

async function run() {
    try {
        const statements = SCHEMA_SQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const sql of statements) {
            console.log('Ejecutando:', sql.substring(0, 50) + '...');
            await turso.execute(sql);
        }
        
        // Add talla column if it doesn't exist
        try {
            await turso.execute('ALTER TABLE productos ADD COLUMN talla TEXT;');
            console.log('Columna talla agregada a productos.');
        } catch (e) {
            console.log('La columna talla ya existe o hubo un error menor:', e.message);
        }

        console.log('Esquema inicializado correctamente.');
    } catch (e) {
        console.error('Error inicializando esquema:', e);
    }
}

run();
