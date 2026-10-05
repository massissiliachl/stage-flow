const { isDatabaseUnavailable } = require('./db');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'oyhuelfsmtcicbnwjkha';
const RESTORE_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/restore`;

let restoreInFlight = false;
let lastRestoreAttempt = 0;
const RESTORE_COOLDOWN_MS = 15 * 60 * 1000;

async function isPostgresConnected() {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { getPool } = require('./db');
    await getPool().query('SELECT 1');
    return true;
  } catch (_) {
    return false;
  }
}

async function requestSupabaseRestore() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return { ok: false, skipped: true, reason: 'SUPABASE_ACCESS_TOKEN manquant' };
  }
  const now = Date.now();
  if (restoreInFlight || now - lastRestoreAttempt < RESTORE_COOLDOWN_MS) {
    return { ok: false, skipped: true, reason: 'cooldown' };
  }
  restoreInFlight = true;
  lastRestoreAttempt = now;
  try {
    const res = await fetch(RESTORE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('[Supabase restore] HTTP', res.status, text.slice(0, 200));
      return { ok: false, status: res.status, body: text };
    }
    console.log('[Supabase restore] Demande envoyée — redémarrage du projet en cours…');
    return { ok: true };
  } catch (err) {
    console.error('[Supabase restore]', err.message);
    return { ok: false, error: err.message };
  } finally {
    restoreInFlight = false;
  }
}

/**
 * Si PostgreSQL est injoignable (projet en pause), tente POST /restore via l'API Supabase.
 */
async function ensureSupabaseAwake() {
  if (!process.env.DATABASE_URL) return { connected: false, reason: 'DATABASE_URL manquant' };
  try {
    const { getPool } = require('./db');
    await getPool().query('SELECT 1');
    return { connected: true };
  } catch (err) {
    if (!isDatabaseUnavailable(err)) {
      return { connected: false, reason: err.message };
    }
    const restore = await requestSupabaseRestore();
    return { connected: false, restore };
  }
}

function startSupabaseWakeScheduler() {
  const intervalMs = Number(process.env.SUPABASE_WAKE_INTERVAL_MS) || 6 * 60 * 60 * 1000;
  setTimeout(() => { ensureSupabaseAwake().catch(() => {}); }, 5000);
  setInterval(() => { ensureSupabaseAwake().catch(() => {}); }, intervalMs);
}

module.exports = {
  ensureSupabaseAwake,
  startSupabaseWakeScheduler,
  requestSupabaseRestore,
};
