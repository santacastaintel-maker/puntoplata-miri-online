/**
 * ============================================================
 *  BACKUP DE BASE DE DATOS — Turso (via HTTP API)  →  Archivos locales
 * ============================================================
 *  ✅ Este script SOLO LEE. No borra, no modifica nada.
 *
 *  Uso:
 *    node backup-db.mjs
 *
 *  Genera dos archivos en ./RESPALDO_BASE_DATOS/:
 *    📄 backup_YYYY-MM-DD.json   ← todos los datos en JSON (fácil de leer)
 *    📄 backup_YYYY-MM-DD.sql    ← script SQL para restaurar (por si se necesita)
 * ============================================================
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

// ── Cargar .env manualmente ────────────────────────────────────
function cargarEnv(ruta = ".env") {
    try {
        const contenido = readFileSync(ruta, "utf-8");
        for (const linea of contenido.split("\n")) {
            const limpia = linea.trim();
            if (!limpia || limpia.startsWith("#")) continue;
            const idx = linea.indexOf("=");
            if (idx === -1) continue;
            const clave = linea.slice(0, idx).trim();
            const valor = linea.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
            if (clave && !process.env[clave]) process.env[clave] = valor;
        }
    } catch (_) { /* Si no existe .env, usar variables del sistema */ }
}
cargarEnv();

// ── Cliente HTTP para Turso (sin binarios nativos) ─────────────
async function consultarTurso(sql, DB_URL, DB_TOKEN) {
    // Convertir libsql:// → https://
    const httpUrl = DB_URL.replace(/^libsql:\/\//, "https://");
    const resp = await fetch(`${httpUrl}/v2/pipeline`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${DB_TOKEN}`,
            "Content-Type":  "application/json",
        },
        body: JSON.stringify({
            requests: [
                { type: "execute", stmt: { sql } },
                { type: "close" }
            ]
        }),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    const result = data.results?.[0]?.response?.result;
    if (!result) return { columns: [], rows: [] };
    const columns = result.cols.map(c => c.name);
    const rows = result.rows.map(row =>
        Object.fromEntries(columns.map((col, i) => [col, row[i]?.value ?? null]))
    );
    return { columns, rows };
}

// ── Configuración ──────────────────────────────────────────────
const DB_URL   = process.env.TURSO_DATABASE_URL;
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;
const CARPETA  = "./RESPALDO_BASE_DATOS";

// ── Tablas a respaldar (en orden para la restauración) ─────────
const TABLAS = [
    "config",
    "categorias",
    "usuarios",
    "clientes",
    "productos",
    "ventas",
    "venta_detalles",
    "abonos",
    "apartados",
    "sesiones",
];

// ── Helpers ────────────────────────────────────────────────────
function fechaHoy() {
    return new Date().toISOString().slice(0, 10); // "2026-06-02"
}

function escaparSQL(valor) {
    if (valor === null || valor === undefined) return "NULL";
    if (typeof valor === "number") return String(valor);
    if (typeof valor === "boolean") return valor ? "1" : "0";
    return `'${String(valor).replace(/'/g, "''")}'`;
}

// ── Función principal ──────────────────────────────────────────
async function hacerRespaldo() {
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║   RESPALDO DE BASE DE DATOS — Turso          ║");
    console.log("╚══════════════════════════════════════════════╝\n");

    // Validar credenciales
    if (!DB_URL || !DB_TOKEN) {
        console.error("❌  ERROR: Faltan credenciales en el archivo .env");
        console.error("   Necesitas: TURSO_DATABASE_URL y TURSO_AUTH_TOKEN\n");
        process.exit(1);
    }

    console.log(`🌐  Base de datos: ${DB_URL}`);
    console.log(`💾  Destino:       ${CARPETA}\n`);

    // Probar conexión
    console.log("🔌  Probando conexión a la base de datos...");
    await consultarTurso("SELECT 1", DB_URL, DB_TOKEN);
    console.log("✅  Conexión exitosa!\n");

    // Crear carpeta de salida
    if (!existsSync(CARPETA)) {
        mkdirSync(CARPETA, { recursive: true });
    }

    const fecha    = fechaHoy();
    const archivoJSON = join(CARPETA, `backup_${fecha}.json`);
    const archivoSQL  = join(CARPETA, `backup_${fecha}.sql`);

    const respaldoJSON = {
        fecha_respaldo: new Date().toISOString(),
        base_de_datos:  DB_URL,
        tablas: {}
    };

    const lineasSQL = [
        `-- ============================================================`,
        `--  RESPALDO DE BASE DE DATOS — Puntoplata Miri Online`,
        `--  Fecha: ${new Date().toISOString()}`,
        `--  Base: ${DB_URL}`,
        `-- ============================================================`,
        ``,
        `PRAGMA foreign_keys = OFF;`,
        ``,
    ];

    let totalRegistros = 0;

    // Respaldar cada tabla
    for (const tabla of TABLAS) {
        try {
            // Verificar si la tabla existe
            const existeR = await consultarTurso(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='${tabla}'`,
                DB_URL, DB_TOKEN
            );
            if (existeR.rows.length === 0) {
                console.log(`   ⏭  Tabla '${tabla}' no existe — omitida`);
                continue;
            }

            // Leer todos los registros
            const resultado = await consultarTurso(`SELECT * FROM ${tabla}`, DB_URL, DB_TOKEN);
            const filas    = resultado.rows;
            const columnas = resultado.columns;

            respaldoJSON.tablas[tabla] = {
                columnas,
                registros: filas.length,
                datos: filas
            };

            // Generar SQL de restauración
            lineasSQL.push(`-- ── Tabla: ${tabla} (${filas.length} registros) ──`);
            lineasSQL.push(`DELETE FROM ${tabla};`);

            for (const fila of filas) {
                const cols = columnas.join(", ");
                const vals = columnas.map(c => escaparSQL(fila[c])).join(", ");
                lineasSQL.push(`INSERT INTO ${tabla} (${cols}) VALUES (${vals});`);
            }
            lineasSQL.push("");

            totalRegistros += filas.length;
            console.log(`   ✅  ${tabla.padEnd(20)} → ${String(filas.length).padStart(5)} registros`);

        } catch (err) {
            console.log(`   ⚠️   ${tabla.padEnd(20)} → Error: ${err.message}`);
        }
    }

    lineasSQL.push(`PRAGMA foreign_keys = ON;`);
    lineasSQL.push(`-- Fin del respaldo`);

    // Guardar archivos
    writeFileSync(archivoJSON, JSON.stringify(respaldoJSON, null, 2), "utf-8");
    writeFileSync(archivoSQL, lineasSQL.join("\n"), "utf-8");

    const tamJSON = (readFileSync(archivoJSON).length / 1024).toFixed(1);
    const tamSQL  = (readFileSync(archivoSQL).length / 1024).toFixed(1);

    // Resumen final
    console.log("\n" + "═".repeat(50));
    console.log("📊  RESUMEN DEL RESPALDO");
    console.log("═".repeat(50));
    console.log(`  ✅  Total registros: ${totalRegistros}`);
    console.log(`  📄  JSON:  backup_${fecha}.json  (${tamJSON} KB)`);
    console.log(`  📄  SQL:   backup_${fecha}.sql   (${tamSQL} KB)`);
    console.log(`  💾  Guardados en: ${CARPETA}`);
    console.log("═".repeat(50));
    console.log("\n🎉  ¡Respaldo completado! Puedes abrir el JSON para ver todos los datos.");
    console.log("    El archivo .sql sirve para restaurar la BD si algún día se necesita.\n");
}

// ── Ejecutar ───────────────────────────────────────────────────
hacerRespaldo().catch(err => {
    console.error("\n❌  Error inesperado:", err.message);
    process.exit(1);
});
