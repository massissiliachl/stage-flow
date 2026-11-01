const { requireAppSession } = require('./require-app-auth');

function roleToUnivType(role) {
  if (role === 'admin_universite') return 'universite';
  if (role === 'admin_faculte') return 'faculte';
  if (role === 'admin_departement' || role === 'responsable_stages') return 'departement';
  return null;
}

const requireUniversiteSession = requireAppSession('universite');

module.exports = { requireUniversiteSession, roleToUnivType };
