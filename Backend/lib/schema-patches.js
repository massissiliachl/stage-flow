/**
 * Migrations légères au démarrage (idempotent).
 */
const fs = require('fs');
const path = require('path');
async function ensureStageDemandMessageColumn(pool) {
  if (!pool) return;
  try {
    await pool.query('ALTER TABLE stage_demands ADD COLUMN IF NOT EXISTS message TEXT');
  } catch (err) {
    console.warn('[StageFlow] Migration stage_demands.message:', err.message);
  }
}

async function ensureStudentProfileDocumentsColumn(pool) {
  if (!pool) return;
  try {
    await pool.query(
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_documents JSONB NOT NULL DEFAULT '[]'::jsonb`
    );
  } catch (err) {
    console.warn('[StageFlow] Migration students.profile_documents:', err.message);
  }
}

async function ensureUniversityStaffUsers(pool) {
  if (!pool) return;
  const filePath = path.join(__dirname, '..', 'supabase', 'patches', '008-university-staff-users.sql');
  if (!fs.existsSync(filePath)) return;
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log('[StageFlow] Patch 008 comptes université — OK');
  } catch (err) {
    console.warn('[StageFlow] Patch 008 comptes université:', err.message);
  }
}

async function runStartupSchemaPatches() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { getPool } = require('./db');
    const pool = getPool();
    await ensureStageDemandMessageColumn(pool);
    await ensureStudentProfileDocumentsColumn(pool);
    await ensureUniversityStaffUsers(pool);
  } catch (err) {
    console.warn('[StageFlow] Patches schéma au démarrage:', err.message);
  }
}

module.exports = {
  runStartupSchemaPatches,
  ensureStageDemandMessageColumn,
  ensureStudentProfileDocumentsColumn,
};
