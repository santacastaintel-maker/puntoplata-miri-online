// Cliente S3/R2 de Cloudflare compartido para todas las Vercel Functions
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const BUCKET   = process.env.R2_BUCKET_NAME || 'puntoplata-miri-fotos';

export const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
    },
});

/** Sube un buffer a R2 y devuelve la key */
export const uploadToR2 = async (
    key: string,
    body: Buffer,
    contentType: string
): Promise<string> => {
    await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return key;
};

/** Genera una URL firmada temporal para ver la imagen (24h) */
export const getPresignedUrl = async (key: string): Promise<string> => {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(r2, cmd, { expiresIn: 86400 }); // 24 horas
};
