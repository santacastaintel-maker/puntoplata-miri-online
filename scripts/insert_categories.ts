import { createClient } from "@libsql/client/web";
import crypto from "crypto";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const categories = [
    { nombre: 'Anillos', desc: 'Anillos de diferentes metales y diseños' },
    { nombre: 'Pulseras', desc: 'Pulseras y brazaletes' },
    { nombre: 'Collares', desc: 'Cadenas, gargantillas y collares' },
    { nombre: 'Aretes', desc: 'Pendientes, broqueles y arracadas' },
    { nombre: 'Dijes', desc: 'Colgantes y charms' },
    { nombre: 'Sets', desc: 'Juegos completos de joyería' }
  ];

  console.log('Insertando categorías...');
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    try {
        await turso.execute({
            sql: `INSERT OR IGNORE INTO categorias (id, nombre, descripcion, orden_visual) VALUES (?, ?, ?, ?)`,
            args: [crypto.randomUUID(), c.nombre, c.desc, i + 1]
        });
        console.log(`Insertada: ${c.nombre}`);
    } catch (e) {
        console.error(`Error insertando ${c.nombre}:`, e);
    }
  }
  console.log('Categorías fijas insertadas correctamente.');
}

main().catch(console.error);
