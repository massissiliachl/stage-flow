require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runSqlFile(client, filename) {
  const filePath = path.join(__dirname, '..', 'supabase', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n→ Exécution de ${filename}...`);
  await client.query(sql);
  console.log(`  OK : ${filename}`);
}

async function listTables(client) {
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map((r) => r.table_name);
}

async function main() {
  const withSeed = process.argv.includes('--seed');
  const withReset = process.argv.includes('--reset') || withSeed;

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL manquant dans .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connecté à Supabase PostgreSQL');

    if (withReset) {
      await runSqlFile(client, 'reset.sql');
    }
    await runSqlFile(client, 'schema.sql');
    const patchesDir = path.join(__dirname, '..', 'supabase', 'patches');
    if (fs.existsSync(patchesDir)) {
      const patches = fs.readdirSync(patchesDir).filter((f) => f.endsWith('.sql')).sort();
      for (const patch of patches) {
        await runSqlFile(client, path.join('patches', patch));
      }
    }
    if (withSeed) {
      await runSqlFile(client, 'seed.sql');
    }

    const tables = await listTables(client);
    console.log('\n=== Tables créées ===');
    tables.forEach((t) => console.log(`  • ${t}`));
    console.log(`\nTotal : ${tables.length} tables`);

    if (!withSeed) {
      console.log('\nPour insérer les données de démo : npm run db:seed');
    }
  } catch (err) {
    console.error('\nErreur migration :', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
