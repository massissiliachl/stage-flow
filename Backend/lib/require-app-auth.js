const { verifyAppToken } = require('./session-jwt');

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function sessionFromToken(data) {
  if (!data || !data.aud || !data.sub) return null;
  return {
    aud: data.aud,
    userId: data.sub,
    role: data.role || null,
    email: data.email || null,
    matricule: data.matricule || null,
    displayName: data.displayName || null,
    entrepriseId: data.entrepriseId != null ? Number(data.entrepriseId) : null,
    type: data.univType || data.type || null,
    faculte: data.faculte || null,
    departement: data.departement || null,
  };
}

function attachSession(req, session) {
  req.appSession = session;
  if (session.aud === 'universite') {
    req.univSession = {
      userId: session.userId,
      email: session.email,
      type: session.type,
      faculte: session.faculte,
      departement: session.departement,
      role: session.role,
    };
  }
}

function requireAppSession(expectedAud) {
  return (req, res, next) => {
    const data = verifyAppToken(getBearerToken(req));
    const session = sessionFromToken(data);
    if (!session || session.aud !== expectedAud) {
      return res.status(401).json({
        error: 'Session requise — reconnectez-vous',
        code: 'APP_AUTH_REQUIRED',
      });
    }
    attachSession(req, session);
    next();
  };
}

function requireAppSessionAny(auds) {
  const allowed = new Set(auds);
  return (req, res, next) => {
    const data = verifyAppToken(getBearerToken(req));
    const session = sessionFromToken(data);
    if (!session || !allowed.has(session.aud)) {
      return res.status(401).json({
        error: 'Session requise — reconnectez-vous',
        code: 'APP_AUTH_REQUIRED',
      });
    }
    attachSession(req, session);
    next();
  };
}

const requireEtudiantSession = requireAppSession('etudiant');
const requireEntrepriseSession = requireAppSession('entreprise');

module.exports = {
  getBearerToken,
  sessionFromToken,
  attachSession,
  requireAppSession,
  requireAppSessionAny,
  requireEtudiantSession,
  requireEntrepriseSession,
};
