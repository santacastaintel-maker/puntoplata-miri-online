import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

// Cargar variables del .env (sin credenciales hardcodeadas)
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
    } catch (_) {}
}
cargarEnv();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET     = process.env.R2_BUCKET_NAME || "puntoplata-miri-fotos";

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
    }
});

async function run() {
    try {
        console.log("--- CLOUDFLARE R2 FILE LIST ---");
        console.log(`Bucket: ${BUCKET}`);
        const command = new ListObjectsV2Command({ Bucket: BUCKET });
        const response = await s3.send(command);
        if (!response.Contents || response.Contents.length === 0) {
            console.log("No files found in the R2 bucket.");
        } else {
            console.log(`Found ${response.Contents.length} files in the bucket:`);
            response.Contents.forEach(file => {
                console.log(`- File: ${file.Key}, Size: ${file.Size} bytes, Last Modified: ${file.LastModified}`);
            });
        }
    } catch (e) {
        console.error("Error connecting to R2:", e);
    }
}

run();
