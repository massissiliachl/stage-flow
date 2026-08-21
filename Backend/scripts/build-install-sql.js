/**
 * Génère supabase/install-all.sql (schema + patches) pour collage dans l'éditeur SQL Supabase.
 */
const fs = require('fs');
const path = require('path');

const supabaseDir = path.join(__dirname, '..', 'supabase');
const outPath = path.join(supabaseDir, 'install-all.sql');

const parts = [
  '-- StageFlow — installation complète (schema + patches)\n',
  '-- Généré par: npm run db:build-sql\n',
  '-- Coller ce fichier dans Supabase → SQL Editor → Run\n\n',
];

parts.push(fs.readFileSync(path.join(supabaseDir, 'schema.sql'), 'utf8'));
parts.push('\n\n-- === PATCHES ===\n\n');

const patchesDir = path.join(supabaseDir, 'patches');
const patches = fs
  .readdirSync(patchesDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const patch of patches) {
  parts.push(`-- --- ${patch} ---\n`);
  parts.push(fs.readFileSync(path.join(patchesDir, patch), 'utf8'));
  parts.push('\n\n');
}

fs.writeFileSync(outPath, parts.join(''), 'utf8');
console.log(`OK → ${outPath} (${patches.length} patches)`);
