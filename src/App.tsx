import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { CatalogoPage } from './pages/CatalogoPage';
import { VentaPage } from './pages/VentaPage';
import { AdminPage } from './pages/AdminPage';
import { MisVentasPage } from './pages/MisVentasPage';
import { ClientesPage } from './pages/ClientesPage';
import { TutorialPage } from './pages/TutorialPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { LicenseGuard } from './components/auth/LicenseGuard';
import { useSyncManager } from './hooks/useSyncManager';

// Rutas de Administrador
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAdmin, loading } = useAuth();

    if (loading) return null;

    if (!isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function App() {
    useSyncManager();

    return (
        <LicenseGuard>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Navegación Base con Layout */}
                <Route
                    path="/"
                    element={<Layout />}
                >
                    <Route index element={<CatalogoPage />} />
                    <Route path="venta" element={<VentaPage />} />
                    <Route path="mis-ventas" element={<MisVentasPage />} />
                    <Route path="clientes" element={<ClientesPage />} />
                    <Route path="features" element={<FeaturesPage />} />

                    {/* Rutas Admin */}
                    <Route
                        path="admin/*"
                        element={
                            <AdminRoute>
                                <AdminPage />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="tutorial"
                        element={
                            <AdminRoute>
                                <TutorialPage />
                            </AdminRoute>
                        }
                    />
                </Route>

            </Routes>
        </LicenseGuard>
    );
}

export default App;
