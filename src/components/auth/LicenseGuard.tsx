import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, AlertTriangle, X, ClipboardPaste } from 'lucide-react';
import { validateLicenseKey, getDaysRemaining } from '../../utils/security';

interface LicenseGuardProps {
    children: React.ReactNode;
}

export const LicenseGuard = ({ children }: LicenseGuardProps) => {
    const [isChecking, setIsChecking] = useState(true);
    const [isLicensed, setIsLicensed] = useState(false);

    // Estado para el formulario de activación
    const [businessName, setBusinessName] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const checkLicense = () => {
            const savedData = localStorage.getItem('pos_license');

            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    const validation = validateLicenseKey(parsed.key, parsed.businessName);

                    if (validation.valid) {
                        setIsLicensed(true);
                        // Verificar días restantes para aviso
                        const days = getDaysRemaining(parsed.key);
                        setDaysLeft(days);
                        if (days !== null && days <= 3 && days >= 0) {
                            setShowWarning(true);
                        }
                        // Configurar el nombre del negocio para uso global si se necesita
                        localStorage.setItem('pos_business_name', parsed.businessName);
                    } else {
                        // Licencia inválida o expirada
                        setIsLicensed(false);
                        setErrorMsg(validation.reason || 'Licencia inválida.');
                    }
                } catch (e) {
                    setIsLicensed(false);
                }
            } else {
                setIsLicensed(false);
            }
            setIsChecking(false);
        };

        checkLicense();
    }, []);

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!businessName.trim() || !licenseKey.trim()) {
            setErrorMsg('Por favor completa ambos campos.');
            return;
        }

        const validation = validateLicenseKey(licenseKey, businessName);

        if (validation.valid) {
            // Guardar localmente
            localStorage.setItem('pos_license', JSON.stringify({
                key: licenseKey,
                businessName: businessName.trim()
            }));
            localStorage.setItem('pos_business_name', businessName.trim().toUpperCase());

            setSuccessMsg('¡Licencia Activada Correctamente!');
            setTimeout(() => {
                setIsLicensed(true);
            }, 1500);
        } else {
            setErrorMsg(validation.reason || 'La llave no es válida para este negocio.');
        }
    };

    const handlePasteKey = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setLicenseKey(text.trim());
        } catch (err) {
            setErrorMsg('No se pudo pegar. Asegúrate de dar permisos de portapapeles.');
        }
    };

    if (isChecking) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <ShieldAlert className="w-12 h-12 text-slate-300 animate-pulse" />
                    <p className="text-slate-500 font-medium">Verificando seguridad...</p>
                </div>
            </div>
        );
    }

    if (!isLicensed) {
        return (
            <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                    {/* Header Decorativo */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-slate-800 to-slate-900 -z-0"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-olivo-500 rounded-2xl shadow-lg flex items-center justify-center mb-6 rotate-3">
                            <KeyRound className="w-10 h-10 text-white -rotate-3" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 text-center">Activación Requerida</h1>
                        <p className="text-slate-500 text-center mt-2 mb-8">
                            Andrés Montero Joyería requiere una licencia válida para funcionar en este dispositivo.
                        </p>

                        <form onSubmit={handleActivate} className="w-full space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Negocio (Exacto)</label>
                                <input
                                    type="text"
                                    inputMode="text"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Ej: Joyería Doña Mari"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 focus:border-olivo-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <label className="block text-sm font-semibold text-slate-700">Llave de Activación</label>
                                    <button 
                                        type="button" 
                                        onClick={handlePasteKey}
                                        className="text-xs font-bold text-olivo-600 hover:text-olivo-700 flex items-center gap-1 bg-olivo-50 px-2 py-1 rounded-md transition-colors"
                                    >
                                        <ClipboardPaste className="w-3 h-3" /> Pegar
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    inputMode="text"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    autoCapitalize="characters"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    placeholder="MM-MES-XXXX..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-olivo-500 focus:border-olivo-500 outline-none font-mono text-sm transition-all"
                                    required
                                />
                            </div>

                            <div className="h-10 flex items-center justify-center">
                                {errorMsg && <p className="text-rose-500 text-sm font-medium animate-pulse">{errorMsg}</p>}
                                {successMsg && (
                                    <p className="text-olivo-500 text-sm font-medium flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {successMsg}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                            >
                                Activar Sistema
                            </button>
                        </form>

                        <p className="mt-8 text-xs text-slate-400 text-center">
                            Sistema protegido por Fingerprinting y Sal Criptográfica. El uso no autorizado está prohibido.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {showWarning && (
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-3 shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-bold text-sm">
                            {daysLeft === 0
                                ? "¡Tu licencia expira HOY! Contacta al administrador para renovar."
                                : `Atención: Tu licencia expira en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}.`}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowWarning(false)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {children}
        </>
    );
};
