import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginPIN } from '../components/auth/LoginPIN';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    // Redirect if already logged in as Admin
    React.useEffect(() => {
        if (isAdmin) {
            navigate('/admin');
        }
    }, [isAdmin, navigate]);

    const handleLoginSuccess = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Miri Montero <span className="text-[#80854b]">Joyería</span></h1>
                <p className="text-slate-500 font-medium">Selecciona tu perfil e ingresa tu NIP personal</p>
            </div>

            <LoginPIN onSuccess={handleLoginSuccess} />

            <div className="mt-12 text-center text-sm text-slate-400">
                <p>Versión Beta 1.0.0</p>
            </div>
        </div>
    );
};
