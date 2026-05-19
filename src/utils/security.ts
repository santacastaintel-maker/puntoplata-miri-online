// Archivo para utilidades de seguridad y licencias

// Esta es la SAL SECRETA. Debe ser la misma que uses en tu generador portátil.
const SECRET_SALT = 'WACHAMONOS-AGRADECIDO1234';

export type LicenseType = 'mensual' | 'vitalicia';

export interface LicenseData {
    key: string;
    businessName: string;
    type: LicenseType;
    generatedAt: number;
    expiresAt?: number; // Solo para mensuales
}

// Función simple de hash (similar a Java String.hashCode) para evitar dependencias pesadas crypto en cliente
const createHash = (str: string): number => {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export const generateLicenseKey = (businessName: string, type: LicenseType): LicenseData => {
    const timestamp = Date.now();
    let expiresAt: number | undefined = undefined;

    if (type === 'mensual') {
        // 30 días en milisegundos
        expiresAt = timestamp + (30 * 24 * 60 * 60 * 1000);
    }

    // El Hash se basa en: Nombre limpio + Tipo + Fecha + SAL
    const cleanName = businessName.trim().toUpperCase();
    const dataString = `${cleanName}|${type}|${expiresAt || 'PERM'}|${SECRET_SALT}`;
    const hashSignature = createHash(dataString).toString(16).toUpperCase();

    // Formato de llave: TIPO-HASH-FECHA(opcional)
    const key = `MM-${type === 'vitalicia' ? 'VIT' : 'MES'}-${hashSignature}${expiresAt ? '-' + expiresAt.toString(36).toUpperCase() : ''}`;

    return {
        key,
        businessName: cleanName,
        type,
        generatedAt: timestamp,
        expiresAt
    };
};

export const validateLicenseKey = (key: string, expectedBusinessName: string): { valid: boolean; reason?: string } => {
    try {
        if (!key || !expectedBusinessName) return { valid: false, reason: 'Datos incompletos.' };

        const cleanName = expectedBusinessName.trim().toUpperCase();
        const parts = key.split('-');

        if (parts.length < 3 || (parts[0] !== 'PP' && parts[0] !== 'AM' && parts[0] !== 'MM')) {
            return { valid: false, reason: 'Formato de llave inválido.' };
        }

        const typeCode = parts[1];
        const hashSignature = parts[2];
        const expiresStr = parts[3];

        const type: LicenseType = typeCode === 'VIT' ? 'vitalicia' : 'mensual';
        let expiresAt: number | undefined = undefined;

        if (type === 'mensual' && expiresStr) {
            expiresAt = parseInt(expiresStr, 36);
            if (Date.now() > expiresAt) {
                return { valid: false, reason: 'La licencia mensual ha expirado.' };
            }
        }

        // Reconstruimos el hash esperado para verificar
        const dataString = `${cleanName}|${type}|${expiresAt || 'PERM'}|${SECRET_SALT}`;
        const expectedHash = createHash(dataString).toString(16).toUpperCase();

        if (hashSignature !== expectedHash) {
            return { valid: false, reason: 'La llave no corresponde a este dispositivo/negocio o fue alterada.' };
        }

        return { valid: true };

    } catch (e) {
        return { valid: false, reason: 'Error al validar la licencia.' };
    }
};

export const getDaysRemaining = (key: string): number | null => {
    const parts = key.split('-');
    if (parts[1] === 'VIT') return null; // Infinito

    if (parts[3]) {
        const expiresAt = parseInt(parts[3], 36);
        const diff = expiresAt - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
};
