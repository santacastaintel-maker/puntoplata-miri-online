import { useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProductos } from '../hooks/useProductos';
import { Buscador } from '../components/catalogo/Buscador';
import { ProductoCard } from '../components/catalogo/ProductoCard';
import { Producto } from '../types';
import { ShoppingCart, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { generateCatalogPDF } from '../utils/mediaUtils';
import { useCategorias } from '../hooks/useCategorias';

export const CatalogoPage = () => {
    const { vendedorActual } = useAuth();
    const { productos, loading, error, buscarProductos } = useProductos();
    const { categorias } = useCategorias();
    const { totalItems, addToCart } = useCart();
    const navigate = useNavigate();

    // Initial load
    useEffect(() => {
        buscarProductos('');
    }, [buscarProductos]);

    const handleSearch = useCallback((query: string, categoriaId?: string) => {
        buscarProductos(query, { categoria_id: categoriaId });
    }, [buscarProductos]);

    const handleAddToCart = useCallback((producto: Producto) => {
        addToCart(producto);
    }, [addToCart]);

    const handleProductClick = useCallback((producto: Producto) => {
        // Podría abrir un modal con detalles del producto
        console.log('Detalle de:', producto.nombre);
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header Fijo */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Catálogo</h1>
                        <p className="text-sm text-slate-500 font-medium">Hola, {vendedorActual?.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => generateCatalogPDF(productos, 'Andrés Montero Joyería')}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                            title="Descargar Catálogo PDF"
                        >
                            <FileDown className="w-5 h-5" />
                            <span className="hidden md:inline">PDF</span>
                        </button>
                        <button
                            onClick={() => navigate('/venta')}
                            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            {totalItems > 0 && (
                                <span className="absolute top-0 right-0 w-5 h-5 bg-[#80854b] text-white text-[10px] font-bold rounded-full flex items-center justify-center -translate-y-1 translate-x-1 shadow-sm border-2 border-white">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <Buscador onSearch={handleSearch} categorias={categorias} />
            </div>

            {/* Grid de Productos */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {error && (
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#80854b]"></div>
                    </div>
                ) : productos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron productos</p>
                        <p className="text-sm">Intenta con otra búsqueda o filtro</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {productos.map(producto => (
                            <ProductoCard
                                key={producto.id}
                                producto={producto}
                                onAdd={handleAddToCart}
                                onClick={handleProductClick}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente helper para el icono vacío (Search no se importó arriba para limpiar)
const SearchIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
