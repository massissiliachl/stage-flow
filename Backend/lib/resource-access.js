function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function scopeTextMatch(fieldValue, scopeText) {
  const scope = String(scopeText || '').replace(/[%_]/g, '').trim().toLowerCase();
  if (!scope) return true;
  return String(fieldValue || '').toLowerCase().includes(scope);
}

function conventionInUniversiteScope(conv, session) {
  const type = session?.type || session?.univType;
  if (type === 'universite') return true;
  if (type === 'faculte') return scopeTextMatch(conv.faculte, session.faculte);
  if (type === 'departement') return scopeTextMatch(conv.departement, session.departement);
  return false;
}

function canAccessConvention(session, conv) {
  if (!session || !conv) return false;
  if (session.aud === 'etudiant') {
    const student = normalizeName(conv.student_name);
    const me = normalizeName(session.displayName);
    return Boolean(student && me && student === me);
  }
  if (session.aud === 'entreprise') {
    return Number(conv.entreprise_id) === Number(session.entrepriseId);
  }
  if (session.aud === 'universite') {
    return conventionInUniversiteScope(conv, session);
  }
  return false;
}

function canAccessDemandeAsEntreprise(session, demand) {
  if (!session || session.aud !== 'entreprise' || !demand) return false;
  return Number(demand.entreprise_id) === Number(session.entrepriseId);
}

function canAccessDemandeAsEtudiant(session, demand, studentDisplayName) {
  if (!session || session.aud !== 'etudiant' || !demand) return false;
  const name = normalizeName(studentDisplayName || session.displayName);
  return normalizeName(demand.student_name) === name;
}

async function loadEtudiantIdentity(pool, userId) {
  const result = await pool.query(
    `SELECT u.id AS user_id, u.display_name, s.matricule
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.id = $1 AND u.role = 'etudiant'
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  canAccessConvention,
  canAccessDemandeAsEntreprise,
  canAccessDemandeAsEtudiant,
  loadEtudiantIdentity,
  conventionInUniversiteScope,
};
