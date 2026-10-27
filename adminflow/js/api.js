const TOKEN_KEY = 'sf_admin_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
}

function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}

async function adminFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${window.ADMIN_API_BASE}${path}`, { ...options, headers });
  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
  if (!res.ok) {
    const err = new Error(data.error || 'Erreur serveur');
    err.status = res.status;
    throw err;
  }
  return data;
}

window.adminApi = {
  getToken,
  setToken,
  login: (email, password) =>
    adminFetch('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => adminFetch('/api/admin/auth/me'),
  stats: () => adminFetch('/api/admin/stats'),
  entreprises: (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return adminFetch(`/api/admin/entreprises${q ? `?${q}` : ''}`);
  },
  patchEntreprise: (id, body) =>
    adminFetch(`/api/admin/entreprises/${id}/verification`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  etudiants: (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return adminFetch(`/api/admin/etudiants${q ? `?${q}` : ''}`);
  },
  patchEtudiant: (id, body) =>
    adminFetch(`/api/admin/etudiants/${id}/verification`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  audit: () => adminFetch('/api/admin/audit'),
};
