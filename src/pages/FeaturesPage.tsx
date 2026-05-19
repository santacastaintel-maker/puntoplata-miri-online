import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  CloudOff, 
  Key, 
  ShoppingCart, 
  Image as ImageIcon, 
  Smartphone,
  Database
} from 'lucide-react';

export const FeaturesPage = () => {
    const features = [
        {
            title: 'Punto de Venta (POS)',
            description: 'Ventas rápidas, carrito inteligente y múltiples métodos de pago.',
            icon: <ShoppingCart className="w-8 h-8 text-olivo-500" />,
            color: 'bg-olivo-50'
        },
        {
            title: 'Live Sales (Streaming)',
            description: 'Registra ventas en vivo para TikTok y Facebook con control por vendedor.',
            icon: <Zap className="w-8 h-8 text-purple-500" />,
            color: 'bg-purple-50'
        },
        {
            title: 'Inventario de Joyería',
            description: 'Catálogo con fotos, categorías y multiplicador masivo de precios.',
            icon: <ImageIcon className="w-8 h-8 text-blue-500" />,
            color: 'bg-blue-50'
        },
        {
            title: 'Offline First',
            description: 'Funciona 100% sin internet. Los datos viven en tu dispositivo.',
            icon: <CloudOff className="w-8 h-8 text-amber-500" />,
            color: 'bg-amber-50'
        },
        {
            title: 'Licencia Independiente',
            description: 'Tú controlas las llaves. Sin pagos mensuales obligatorios a terceros.',
            icon: <Key className="w-8 h-8 text-rose-500" />,
            color: 'bg-rose-50'
        },
        {
            title: 'PWA (App Instalable)',
            description: 'Instala el sistema en iPads, Android y PC como una app nativa.',
            icon: <Smartphone className="w-8 h-8 text-indigo-500" />,
            color: 'bg-indigo-50'
        },
        {
            title: 'Backups y Seguridad',
            description: 'Exporta e importa tus datos en segundos para mayor tranquilidad.',
            icon: <Database className="w-8 h-8 text-cyan-500" />,
            color: 'bg-cyan-50'
        },
        {
            title: 'Análisis de Ventas',
            description: 'Gráficas de ingresos y reportes de los productos más vendidos.',
            icon: <BarChart3 className="w-8 h-8 text-olivo-600" />,
            color: 'bg-olivo-50'
        }
    ];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-olivo-100 text-olivo-700 rounded-full text-sm font-bold tracking-wide uppercase">
                    <Sparkles className="w-4 h-4" />
                    Tecnología de Vanguardia
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                    Funciones de <span className="text-olivo-600 italic">Andrés Montero Joyería</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                    Un sistema diseñado específicamente para el mercado de joyería mexicana, enfocado en rapidez, diseño y total independencia.
                </p>
            </div>

            {/* Grid de Funciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, idx) => (
                    <div 
                        key={idx} 
                        className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-olivo-100 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                            {feature.icon}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                        <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                    </div>
                ))}
            </div>

            {/* Banner Premium */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-olivo-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-olivo-500/10 rounded-full blur-[80px]" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 max-w-xl">
                        <div className="inline-flex items-center gap-2 text-olivo-400 font-bold tracking-widest uppercase text-xs">
                            <ShieldCheck className="w-4 h-4" />
                            Seguridad de Grado Bancario
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tus datos nunca salen de tu dispositivo</h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            A diferencia de otros sistemas que dependen de la nube, <span className="text-white font-semibold italic">PUNTOPLATA</span> prioriza tu privacidad. Si no hay internet, el negocio no se detiene.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-4 bg-white/5 p-8 rounded-3xl backdrop-blur-sm border border-white/10">
                        <div className="text-5xl font-black text-olivo-400">100%</div>
                        <div className="text-sm font-bold tracking-widest uppercase text-slate-300">Desconectado</div>
                    </div>
                </div>
            </div>

            {/* Footer de Ventas */}
            <div className="text-center pt-8">
                <p className="text-slate-400 font-medium">
                    Desarrollado con pasión para maximizar tus ventas de joyería.
                </p>
            </div>
        </div>
    );
};
