import { createClient } from '@libsql/client/http';

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN as string,
});

async function clearDB() {
    console.log('Borrando todos los productos...');
    await turso.execute('DELETE FROM productos;');
    console.log('Productos borrados en Turso.');
}

clearDB().catch(console.error);
