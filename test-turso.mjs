import { createClient } from '@libsql/client/http';

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        const res = await turso.execute('SELECT * FROM categorias');
        console.log('Categorias encontradas:', res.rows.length);
        console.log(res.rows);
    } catch (e) {
        console.error('Error querying Turso:', e);
    }
}

run();
