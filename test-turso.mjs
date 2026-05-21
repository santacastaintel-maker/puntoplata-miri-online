import { createClient } from '@libsql/client/http';

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
    try {
        console.log('Querying categories...');
        const resCats = await turso.execute('SELECT * FROM categorias');
        console.log('Categorias:', resCats.rows.length);

        console.log('Querying products...');
        const resProds = await turso.execute('SELECT * FROM productos');
        console.log('Productos:', resProds.rows.length);
        if (resProds.rows.length > 0) {
            console.log('First 3 products:', resProds.rows.slice(0, 3));
        }

        console.log('Querying sellers...');
        const resSells = await turso.execute('SELECT * FROM vendedores');
        console.log('Vendedores:', resSells.rows.length);
        console.log(resSells.rows);
        
        console.log('Querying sales...');
        const resVentas = await turso.execute('SELECT * FROM ventas');
        console.log('Ventas:', resVentas.rows.length);
    } catch (e) {
        console.error('Error querying Turso:', e);
    }
}

run();
