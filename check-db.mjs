import { createClient } from '@libsql/client/http';

const dbMain = createClient({
    url: 'libsql://puntoplata-miri-online-santacastaintel-maker.aws-us-east-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkzMjQ3MzMsImlkIjoiMDE5ZTQ4MDQtNjkwMS03NTQ2LTlhZDYtYzA1NGJmMmFhZDA1IiwicmlkIjoiMGZiYzFkZjktNGQzYi00YTFhLTk0MjYtYTQ5Y2EwZjJhM2I4In0.qUjH9PqCwnW7PKAA7VUUMvZ02OxwepQ5DnFVkWBN7zmiQ5HSbcx2iGYxawlfThWLIrXqN7w0z9_Ab45Zc_D1DQ',
});


async function run() {
    try {
        console.log("=== CATEGORIAS (live) ===");
        const cats = await dbMain.execute("SELECT * FROM categorias");
        console.log(JSON.stringify(cats.rows, null, 2));

        console.log("\n=== PRODUCTOS (live, top 10) ===");
        const prods = await dbMain.execute("SELECT id, codigo, nombre, categoria_id, activo FROM productos LIMIT 10");
        console.log(JSON.stringify(prods.rows, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
