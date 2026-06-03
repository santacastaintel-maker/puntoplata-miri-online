import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://csvseqxqjihwlqeaglkz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzdnNlcWNxamlod2xxZWFnbHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU2MDYsImV4cCI6MjA4ODc4MTYwNn0.eA8uixQVFEIy8cjy3vryyNzqWI6PeRk6lNbKXA5QtSI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable(table) {
    try {
        const { data, count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error(`Error checking ${table}:`, error.message);
        } else {
            console.log(`- Table '${table}': ${count} rows`);
        }
    } catch (e) {
        console.error(`Exception checking ${table}:`, e.message);
    }
}

async function run() {
    console.log('=== CHECKING SUPABASE ===');
    const tables = ['productos', 'categorias', 'ventas', 'clientes', 'vendedores'];
    for (const table of tables) {
        await checkTable(table);
    }
}

run();
