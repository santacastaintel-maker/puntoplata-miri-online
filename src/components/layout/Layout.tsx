
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, ListOrdered, Users, Settings, LogOut, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { OnlineStatus } from '../ui/OnlineStatus';

export const Layout = () => {
    const { vendedorActual, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { to: '/', icon: <Home className="w-5 h-5" />, label: 'Catálogo' },
        { to: '/venta', icon: <ShoppingCart className="w-5 h-5" />, label: 'Venta' },
        { to: '/mis-ventas', icon: <ListOrdered className="w-5 h-5" />, label: 'Ventas' },
        { to: '/clientes', icon: <Users className="w-5 h-5" />, label: 'Clientes' },
        { to: '/features', icon: <Sparkles className="w-5 h-5" />, label: 'Funciones' },
        { to: '/admin', icon: <Settings className="w-5 h-5" />, label: 'Admin' },
        { to: '/tutorial', icon: <BookOpen className="w-5 h-5" />, label: 'Tutorial' },
    ];

    const mobileMenuItems = [
        { to: '/', icon: <Home className="w-5 h-5" />, label: 'Catálogo' },
        { to: '/venta', icon: <ShoppingCart className="w-5 h-5" />, label: 'Venta' },
        { to: '/mis-ventas', icon: <ListOrdered className="w-5 h-5" />, label: 'Tickets' },
        { to: '/tutorial', icon: <BookOpen className="w-5 h-5" />, label: 'Ayuda' },
        { to: isAdmin ? '/admin' : '/login', icon: <Settings className="w-5 h-5" />, label: 'Admin' },
    ];

    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900">

            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
                <div className="p-6 flex flex-col items-start gap-3">
                    <div className="flex items-center gap-3">
                        <img
                            src="/MIRIlogo.png"
                            alt="Logo Andrés Montero"
                            className="w-9 h-9 rounded-lg object-cover opacity-80"
                        />
                        <h1 className="text-xl font-bold tracking-tight text-[#80854b]">Andrés Montero <span className="text-slate-900">Joyería</span></h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive
                                    ? 'bg-[#80854b]/10 text-[#80854b]'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-4 pb-2">
                    <OnlineStatus />
                </div>

                <div className="p-4 border-t border-slate-100 pb-safe">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                                style={{ backgroundColor: vendedorActual?.color_identificador || '#64748B' }}
                            >
                                {vendedorActual?.nombre?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900 leading-tight">{vendedorActual?.nombre}</span>
                                <span className="text-[#80854b] capitalize font-medium text-[10px] tracking-wider uppercase">{vendedorActual?.rol}</span>
                            </div>
                        </div>
                        {isAdmin ? (
                            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Cerrar sesión de Admin">
                                <LogOut className="w-5 h-5" />
                            </button>
                        ) : (
                            <button onClick={() => navigate('/login')} className="p-2 text-[#80854b] hover:text-[#64683a] transition-colors" title="Acceso Administrativo">
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-16 md:pb-0">
                <div className="flex-1 overflow-y-auto w-full mx-auto">
                    {/* Header Mobile Opcional */}
                    <div className="md:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 px-4 py-3 flex justify-between items-center pt-safe">
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Andrés Montero Joyería</h1>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-pointer"
                            style={{ backgroundColor: vendedorActual?.color_identificador || '#64748B' }}
                            onClick={() => isAdmin ? handleLogout() : navigate('/login')}
                        >
                            {vendedorActual?.nombre?.charAt(0)}
                        </div>
                    </div>

                    {/* Router Outlet content injection */}
                    <div className="h-full">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Bottom Nav Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 px-2">
                    {mobileMenuItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-[#80854b]' : 'text-slate-400 hover:text-slate-600'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="text-[10px] font-medium leading-none">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

        </div>
    );
};
