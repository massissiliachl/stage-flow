const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

function isDatabaseUnavailable(err) {
  if (!process.env.DATABASE_URL) return true;
  const code = err && err.code;
  const msg = String((err && err.message) || '');
  return code === 'ENOTFOUND'
    || code === 'ECONNREFUSED'
    || code === 'ETIMEDOUT'
    || code === 'ECONNRESET'
    || msg.includes('not found')
    || msg.includes('Tenant or user not found');
}

/** Message utilisateur quand Supabase est en pause ou projet introuvable */
function describeDatabaseError(err) {
  const msg = String((err && err.message) || '');
  if (
    msg.includes('not found')
    || msg.includes('Tenant or user not found')
    || (err && err.code === 'ENOTFOUND')
  ) {
    return 'Projet Supabase en pause ou introuvable — reprenez-le depuis le dashboard Supabase (Resume project), puis attendez 1 à 2 minutes.';
  }
  if (!process.env.DATABASE_URL) {
    return 'DATABASE_URL manquant — configurez la connexion PostgreSQL sur Render.';
  }
  return msg || 'Base de données inaccessible';
}

module.exports = { getPool, isDatabaseUnavailable, describeDatabaseError };
