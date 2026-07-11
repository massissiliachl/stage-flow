require('dotenv').config();

async function testPostgres() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return { ok: false, error: 'DATABASE_URL manquant dans .env' };
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    return { ok: false, error: 'Package "pg" non installé. Exécutez: npm install pg' };
  }

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() AS now, current_database() AS db');
    await client.end();
    return {
      ok: true,
      message: 'Connexion PostgreSQL réussie',
      database: result.rows[0].db,
      serverTime: result.rows[0].now,
    };
  } catch (err) {
    try {
      await client.end();
    } catch {
      // ignore
    }
    return { ok: false, error: err.message };
  }
}

async function testSupabaseApi() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url) {
    return { ok: false, error: 'SUPABASE_URL manquant dans .env' };
  }
  if (!key) {
    return {
      ok: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY manquant dans .env',
    };
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.from('_realtime_schema').select('*').limit(1);
    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      return { ok: false, error: `${error.code}: ${error.message}` };
    }
    return { ok: true, message: 'Client Supabase API connecté (clé valide)' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('=== Test connexion Supabase / PostgreSQL ===\n');

  console.log('1) PostgreSQL (DATABASE_URL)');
  const pgResult = await testPostgres();
  if (pgResult.ok) {
    console.log(`   ✅ ${pgResult.message}`);
    console.log(`   Base: ${pgResult.database}`);
    console.log(`   Heure serveur: ${pgResult.serverTime}`);
  } else {
    console.log(`   ❌ Échec: ${pgResult.error}`);
  }

  console.log('\n2) Supabase API (SUPABASE_URL + clé)');
  const apiResult = await testSupabaseApi();
  if (apiResult.ok) {
    console.log(`   ✅ ${apiResult.message}`);
  } else {
    console.log(`   ❌ Échec: ${apiResult.error}`);
  }

  console.log('\n=== Résumé ===');
  console.log(`PostgreSQL: ${pgResult.ok ? 'OK' : 'ÉCHEC'}`);
  console.log(`Supabase API: ${apiResult.ok ? 'OK' : 'ÉCHEC'}`);

  process.exit(pgResult.ok && apiResult.ok ? 0 : 1);
}

main();
