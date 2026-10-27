/**
 * Migrations légères au démarrage (idempotent).
 */
async function ensureStageDemandMessageColumn(pool) {
  if (!pool) return;
  try {
    await pool.query('ALTER TABLE stage_demands ADD COLUMN IF NOT EXISTS message TEXT');
  } catch (err) {
    console.warn('[StageFlow] Migration stage_demands.message:', err.message);
  }
}

async function runStartupSchemaPatches() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { getPool } = require('./db');
    const pool = getPool();
    await ensureStageDemandMessageColumn(pool);
    const { runAdminSystemSetup } = require('./admin-bootstrap');
    await runAdminSystemSetup();
  } catch (err) {
    console.warn('[StageFlow] Patches schéma au démarrage:', err.message);
  }
}

module.exports = { runStartupSchemaPatches, ensureStageDemandMessageColumn };
