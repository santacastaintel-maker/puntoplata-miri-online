/**
 * ============================================================
 *  BACKUP DE FOTOS — Cloudflare R2  →  Carpeta local
 * ============================================================
 *  ✅ Este script SOLO LEE y DESCARGA. No borra, no modifica.
 *
 *  Uso:
 *    node backup-r2-fotos.mjs
 *
 *  Las fotos se guardan en:
 *    ./RESPALDO_FOTOS_R2/  (se crea automáticamente)
 * ============================================================
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { pipeline } from "stream/promises";

// Cargar variables del .env manualmente (sin depender del paquete dotenv)
function cargarEnv(ruta = ".env") {
    try {
        const contenido = readFileSync(ruta, "utf-8");
        for (const linea of contenido.split("\n")) {
            const limpia = linea.trim();
            if (!limpia || limpia.startsWith("#")) continue;
            const idx = limpia.indexOf("=");
            if (idx === -1) continue;
            const clave = limpia.slice(0, idx).trim();
            const valor = limpia.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
            if (clave && !process.env[clave]) process.env[clave] = valor;
        }
    } catch (_) { /* Si no existe .env, usar variables del sistema */ }
}
cargarEnv();

// ── Configuración ─────────────────────────────────────────────
const ACCOUNT_ID     = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID  = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY     = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME    = process.env.R2_BUCKET_NAME || "puntoplata-miri-fotos";

const CARPETA_SALIDA = "./RESPALDO_FOTOS_R2";

// ── Validar credenciales ───────────────────────────────────────
if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_KEY) {
    console.error("\n❌  ERROR: Faltan credenciales en el archivo .env");
    console.error("   Asegúrate de tener: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY\n");
    process.exit(1);
}

// ── Cliente R2 ────────────────────────────────────────────────
const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_KEY,
    },
});

// ── Helpers ───────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function barra(actual, total) {
    const ancho  = 30;
    const lleno  = Math.round((actual / total) * ancho);
    const vacio  = ancho - lleno;
    return `[${"█".repeat(lleno)}${"░".repeat(vacio)}] ${actual}/${total}`;
}

// ── Función principal ─────────────────────────────────────────
async function hacerRespaldo() {
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║   RESPALDO DE FOTOS — Cloudflare R2          ║");
    console.log("╚══════════════════════════════════════════════╝\n");
    console.log(`📦  Bucket:  ${BUCKET_NAME}`);
    console.log(`💾  Destino: ${CARPETA_SALIDA}\n`);

    // 1. Listar todos los archivos del bucket
    console.log("📋  Listando archivos en el bucket...\n");
    const archivos = [];
    let continuationToken = undefined;

    do {
        const cmd = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            ContinuationToken: continuationToken,
        });
        const resp = await s3.send(cmd);
        if (resp.Contents) archivos.push(...resp.Contents);
        continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);

    if (archivos.length === 0) {
        console.log("⚠️   No se encontraron fotos en el bucket.");
        return;
    }

    const totalBytes = archivos.reduce((s, f) => s + (f.Size || 0), 0);
    console.log(`✅  Se encontraron ${archivos.length} archivos (${formatBytes(totalBytes)} en total)\n`);
    console.log("─".repeat(50));

    // 2. Crear carpeta de salida
    if (!existsSync(CARPETA_SALIDA)) {
        mkdirSync(CARPETA_SALIDA, { recursive: true });
        console.log(`\n📁  Carpeta creada: ${CARPETA_SALIDA}`);
    } else {
        console.log(`\n📁  Usando carpeta existente: ${CARPETA_SALIDA}`);
    }
    console.log("");

    // 3. Descargar cada archivo
    let descargados  = 0;
    let omitidos     = 0;
    let errores      = 0;
    let bytesDesc    = 0;

    for (const archivo of archivos) {
        const key        = archivo.Key;
        const rutaLocal  = join(CARPETA_SALIDA, key);
        const carpetaDir = dirname(rutaLocal);

        // Crear subcarpetas si las hay en la key (ej. "productos/img-abc.jpg")
        if (!existsSync(carpetaDir)) {
            mkdirSync(carpetaDir, { recursive: true });
        }

        // Saltar si ya existe el archivo local (respaldo incremental)
        if (existsSync(rutaLocal)) {
            omitidos++;
            process.stdout.write(
                `\r${barra(descargados + omitidos, archivos.length)}  ⏭  Omitido (ya existe): ${key.substring(0, 40)}`
            );
            continue;
        }

        try {
            const getCmd  = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
            const { Body } = await s3.send(getCmd);
            await pipeline(Body, createWriteStream(rutaLocal));
            descargados++;
            bytesDesc += archivo.Size || 0;
            process.stdout.write(
                `\r${barra(descargados + omitidos, archivos.length)}  ✅  ${key.substring(0, 45).padEnd(45)}`
            );
        } catch (err) {
            errores++;
            process.stdout.write(`\r❌  Error descargando: ${key} — ${err.message}\n`);
        }
    }

    // 4. Resumen final
    console.log("\n\n" + "═".repeat(50));
    console.log("📊  RESUMEN DEL RESPALDO");
    console.log("═".repeat(50));
    console.log(`  ✅  Descargados:  ${descargados} archivos (${formatBytes(bytesDesc)})`);
    if (omitidos  > 0) console.log(`  ⏭   Omitidos:     ${omitidos} (ya existían localmente)`);
    if (errores   > 0) console.log(`  ❌  Con error:    ${errores}`);
    console.log(`  💾  Guardados en: ${CARPETA_SALIDA}`);
    console.log("═".repeat(50));

    if (errores === 0) {
        console.log("\n🎉  ¡Respaldo completado con éxito! Tus fotos están seguras.\n");
    } else {
        console.log(`\n⚠️   Respaldo completado con ${errores} errores. Revisa los mensajes de arriba.\n`);
    }
}

// ── Ejecutar ──────────────────────────────────────────────────
hacerRespaldo().catch(err => {
    console.error("\n❌  Error inesperado:", err.message);
    process.exit(1);
});
