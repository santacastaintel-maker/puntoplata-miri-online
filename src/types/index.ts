// Entidades Base de Datos
export interface Vendedor {
    id: string;
    nombre: string;
    email: string | null;
    color_identificador: string;
    rol: 'vendedor' | 'admin';
    activo: boolean;
    pin_auth?: string; // Solo para uso local offline
}

export interface Categoria {
    id: string;
    nombre: string;
    descripcion: string | null;
    orden_visual: number;
}

export interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    categoria_id: string | null;
    precio: number;
    stock: number;
    foto_url: string | null;
    palabras_clave: string[] | null;
    activo: boolean;
    origen?: 'excel' | 'app';
    marca?: string | null;       // Campo Marca añadido
    talla?: string | null;       // Campo Talla añadido para anillos y pulseras
    categorias?: Categoria;      // Relacionado
}

export type TipoCliente = 'premium' | 'normal' | 'conflictivo';

export interface Cliente {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    tipo_cliente: TipoCliente;
    notas: string | null;
    total_compras: number;
    numero_compras: number;
    apartados_pendientes: number; // cuántos apartados activos tiene
    cancelaciones: number; // cuántas cancelaciones acumuladas
    created_at: string;
}

export interface SesionLive {
    id: string;
    vendedor_id: string;
    nombre_sesion: string | null;
    color_sesion: string | null;
    fecha_inicio: string;
    activa: boolean;
    total_ventas_sesion: number;
}

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'deposito';
export type EstadoVenta = 'completada' | 'cancelada' | 'pendiente' | 'apartado';

export interface Venta {
    id: string;
    folio: string;
    sesion_id: string | null;
    vendedor_id: string;
    cliente_id: string | null;
    subtotal: number;
    descuento: number;
    total: number;
    monto_abonado: number; // Para apartados: cuánto ha pagado hasta ahora
    metodo_pago: MetodoPago | null;
    estado: EstadoVenta;
    notas: string | null;
    created_at: string;
    venta_detalles?: VentaDetalle[]; // Para reportes
    clientes?: Partial<Cliente>; // Relación
}

export interface VentaDetalle {
    id?: string;
    venta_id?: string;
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    productos?: Partial<Producto>; // Relación
}

// Interfaces de la App
export interface CartItem {
    producto: Producto;
    cantidad: number;
    subtotal: number;
}

export interface AuthSession {
    token: string;
    vendedor: Vendedor;
}

// Filtros y Requests
export interface FiltrosProductos {
    categoria_id?: string;
    stock_minimo?: number;
    marca?: string;
}

export interface FiltroVentas {
    fecha_desde?: string;
    fecha_hasta?: string;
    sesion_id?: string;
}

export interface NuevaVentaPayload {
    sesion_id: string | null;
    vendedor_id: string;
    cliente_id: string | null;
    subtotal: number;
    descuento: number;
    total: number;
    metodo_pago: MetodoPago | null;
    notas?: string;
    detalles: Partial<VentaDetalle>[];
}

// Configuración del Sistema
export interface AppConfig {
    key: string;
    value: any;
    updated_at: string;
}

export interface SyncOperation {
    id: string;
    operacion: 'CREAR_PRODUCTO' | 'ACTUALIZAR_PRODUCTO' | 'ELIMINAR_PRODUCTO' | 'CREAR_VENTA' | 'CANCELAR_VENTA' | 'SUBIR_IMAGEN';
    payload: any;
    estado: 'pendiente' | 'procesando' | 'error';
    error?: string;
    created_at: string;
}

