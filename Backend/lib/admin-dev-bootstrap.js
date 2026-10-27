const DEV_ADMIN_SUB = 'dev-platform-admin';

function getBootstrapAdminCreds() {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
  return { email, password };
}

/** Connexion admin sans BDD : dev local uniquement (NODE_ENV !== production). */
function isDevBootstrapLoginEnabled() {
  if (process.env.NODE_ENV === 'production') return false;
  const { email, password } = getBootstrapAdminCreds();
  return Boolean(email && password.length >= 8);
}

function matchesBootstrapLogin(email, password) {
  if (!isDevBootstrapLoginEnabled()) return false;
  const c = getBootstrapAdminCreds();
  return email === c.email && password === c.password;
}

function devBootstrapAdminUser() {
  const c = getBootstrapAdminCreds();
  return {
    id: DEV_ADMIN_SUB,
    email: c.email,
    display_name: 'Administrateur StageFlow',
    role: 'platform_admin',
    is_active: true,
  };
}

function isDevBootstrapToken(decoded) {
  return (
    isDevBootstrapLoginEnabled()
    && decoded
    && decoded.sub === DEV_ADMIN_SUB
    && decoded.role === 'platform_admin'
  );
}

module.exports = {
  DEV_ADMIN_SUB,
  isDevBootstrapLoginEnabled,
  matchesBootstrapLogin,
  devBootstrapAdminUser,
  isDevBootstrapToken,
};
