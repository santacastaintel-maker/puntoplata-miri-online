import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProductos } from '../hooks/useProductos';
import { Buscador } from '../components/catalogo/Buscador';
import { ProductoCard } from '../components/catalogo/ProductoCard';
import { Producto } from '../types';
import { ShoppingCart, FileDown, AlertTriangle, CheckCircle2, Loader2, Image as ImageIcon, FileText, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { useCart } from '../context/CartContext';
import { generateCatalogPDF } from '../utils/mediaUtils';
import { useCategorias } from '../hooks/useCategorias';

export const CatalogoPage = () => {
    const { vendedorActual } = useAuth();
    const { productos, loading, error, buscarProductos } = useProductos();
    const { categorias } = useCategorias();
    const { totalItems, addToCart } = useCart();
    const navigate = useNavigate();

    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [hidePrices, setHidePrices] = useState(false);

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

    const handleExportText = () => {
        generateCatalogPDF(productos, 'Miri Montero Joyería', { includeImages: false, hidePrices });
        setIsExportModalOpen(false);
    };

    const handleExportSingle = () => {
        generateCatalogPDF(productos, 'Miri Montero Joyería', { includeImages: true, hidePrices });
        setIsExportModalOpen(false);
    };

    const handleExportBatch = async () => {
        setExportStatus('processing');
        const BATCH_SIZE = 100;
        const totalBatches = Math.ceil(productos.length / BATCH_SIZE);
        setExportProgress({ current: 0, total: totalBatches });

        try {
            for (let i = 0; i < totalBatches; i++) {
                const chunk = productos.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                setExportProgress({ current: i + 1, total: totalBatches });

                // Permitir que la UI se actualice
                await new Promise(resolve => setTimeout(resolve, 500));

                generateCatalogPDF(chunk, 'Miri Montero Joyería', {
                    includeImages: true,
                    hidePrices,
                    batchInfo: { current: i + 1, total: totalBatches }
                });
                
                // Pausa extra entre descargas para no abrumar al navegador
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            setExportStatus('success');
        } catch (err) {
            console.error(err);
            setExportStatus('error');
        }
    };

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
                            onClick={() => {
                                setExportStatus('idle');
                                setHidePrices(false);
                                setIsExportModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                            title="Opciones de Catálogo PDF"
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

            {/* Modal de Opciones de Exportación */}
            <Modal
                isOpen={isExportModalOpen}
                onClose={() => exportStatus !== 'processing' && setIsExportModalOpen(false)}
                title="Generar Catálogo PDF"
            >
                <div className="space-y-6">
                    {/* Status de Éxito */}
                    {exportStatus === 'success' && (
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                            <p className="font-bold">¡Catálogo Generado con Éxito!</p>
                            <p className="text-sm">Se generaron {exportProgress.total} archivos PDF. Revisa tu carpeta de descargas.</p>
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                className="mt-4 px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}

                    {/* Contenido Principal (Opciones o Progreso) */}
                    {exportStatus !== 'success' && (
                        <>
                            {exportStatus === 'processing' ? (
                                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                                    <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
                                    <h3 className="text-lg font-bold text-slate-700">Generando Archivos...</h3>
                                    <p className="text-sm font-medium text-slate-500">
                                        Parte {exportProgress.current} de {exportProgress.total}
                                    </p>
                                    
                                    <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                                        <div 
                                            className="bg-olivo-500 h-full transition-all duration-300"
                                            style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                                        />
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-6">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-800">
                                                <p className="font-bold mb-1">¡Importante!</p>
                                                <p className="mb-2">Por favor ten paciencia, <strong>no cierres esta pestaña</strong> y procura que sea la única ventana en uso.</p>
                                                <p>Si tu navegador bloquea las descargas, por favor haz clic en <strong>"Permitir descargas múltiples"</strong> en la barra de direcciones superior.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <p className="text-sm text-slate-600">
                                        Se generará el catálogo con los <strong>{productos.length}</strong> productos actualmente filtrados en pantalla.
                                    </p>

                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative flex items-center justify-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={hidePrices}
                                                    onChange={(e) => setHidePrices(e.target.checked)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-olivo-500 peer-checked:border-olivo-500 transition-colors"></div>
                                                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">Ocultar Precios (Modo Cliente Final)</p>
                                                <p className="text-xs text-slate-500">Útil para que tus clientes no vean tu precio de mayoreo.</p>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={handleExportText}
                                            className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-left"
                                        >
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Catálogo de Texto</h4>
                                                <p className="text-xs text-slate-500 mt-1">Super rápido. Solo información y precios, sin fotografías.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={handleExportSingle}
                                            className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-left"
                                        >
                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                                                <ImageIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Catálogo Completo</h4>
                                                <p className="text-xs text-slate-500 mt-1">Un solo archivo PDF con todas las fotos. Recomendado para menos de 150 piezas.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={handleExportBatch}
                                            className="flex items-start gap-4 p-4 border-2 border-olivo-100 bg-olivo-50/30 rounded-xl hover:bg-olivo-50 hover:border-olivo-200 transition-all text-left relative overflow-hidden"
                                        >
                                            <div className="p-2 bg-white rounded-lg text-olivo-600 shrink-0 shadow-sm">
                                                <Layers className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">Catálogo en Tandas (100 pz)</h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Divide automáticamente y descarga múltiples archivos PDF. <strong>¡Recomendado para evitar fallos de memoria!</strong>
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

// Componente helper para el icono vacío (Search no se importó arriba para limpiar)
const SearchIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
