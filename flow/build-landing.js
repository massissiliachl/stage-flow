const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FRONTEND = path.join(ROOT, '../Frontend/index.html');
const src = fs.readFileSync(FRONTEND, 'utf8');

const cssDir = path.join(ROOT, 'css');
const jsDir = path.join(ROOT, 'js');
[cssDir, jsDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const faviconMatch = src.match(/<link rel="icon"[^>]+>/);

// ── CSS ──
const styleStart = src.indexOf('<style>') + 7;
const styleEnd = src.indexOf('</style>');
const allStyles = src.slice(styleStart, styleEnd);
fs.writeFileSync(path.join(cssDir, 'app.css'), allStyles, 'utf8');
console.log('flow/css/app.css généré (' + Math.round(allStyles.length / 1024) + ' Ko)');

const landingStyleBlocks = [
  '/* RESPONSIVE — hero cards row */',
  '/* RTL — Arabic */',
  '/* LANDING */',
  '/* REGISTER MODAL */',
  '/* MODAL */',
  '/* UTILS */',
];
const styleLines = allStyles.split('\n');
let landingStyles = '';
let capture = false;
for (const line of styleLines) {
  if (landingStyleBlocks.some((b) => line.includes(b))) capture = true;
  if (capture) landingStyles += line + '\n';
  if (capture && line.startsWith('/* APP */')) {
    capture = false;
    break;
  }
}

// ── JS modules (extrait depuis Frontend, sans le modifier) ──
const scriptOpen = src.indexOf('<script>', src.indexOf('<!-- TOAST -->'));
const scriptClose = src.indexOf('</script>', scriptOpen);
const scriptBody = src.slice(scriptOpen + 8, scriptClose);

const JS_MODULES = [
  { file: '01-storage.js', start: 'STOCKAGE PARTAGÉ', end: 'DATA' },
  { file: '02-data.js', start: 'DATA', end: 'COMPTES UNIVERSITÉ' },
  { file: '03-univ-accounts.js', start: 'COMPTES UNIVERSITÉ', end: 'AUTH' },
  { file: '04-auth.js', start: 'AUTH', end: 'SIDEBAR' },
  { file: '05-sidebar.js', start: 'SIDEBAR', end: 'PAGES' },
  { file: '06-pages.js', start: 'PAGES', end: 'CONVENTION MODAL' },
  { file: '07-convention.js', start: 'CONVENTION MODAL', end: 'SIGNATURE SYSTEM' },
  { file: '08-signature.js', start: 'SIGNATURE SYSTEM', end: 'HELPERS' },
  { file: '09-helpers.js', start: 'HELPERS', end: "MODAL D'INSCRIPTION" },
  { file: '10-register.js', start: "MODAL D'INSCRIPTION", end: 'INITIALISATION DE LA LANGUE' },
  { file: '11-init.js', start: 'INITIALISATION DE LA LANGUE', end: null },
];

function sliceScript(body, startMarker, endMarker) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sep = '[═─\\-]+'; // ═ sections principales, ─ sous-sections
  const startRe = new RegExp(`// ${sep}\\r?\\n// ${esc(startMarker)}`);
  const m = body.match(startRe);
  if (!m) throw new Error('Marqueur JS introuvable: ' + startMarker);
  const realStart = m.index;
  if (!endMarker) return body.slice(realStart).trim();
  const endRe = new RegExp(`// ${sep}\\r?\\n// ${esc(endMarker)}`);
  const endM = body.slice(realStart + 1).match(endRe);
  if (!endM) throw new Error('Fin JS introuvable après: ' + startMarker);
  const end = realStart + 1 + endM.index;
  return body.slice(realStart, end).trim();
}

function patchFlowLanding(code) {
  return code
    .replace(
      /document\.getElementById\('landing'\)\.style\.display = 'none'/g,
      'hideLanding()'
    )
    .replace(
      /document\.getElementById\('landing'\)\.style\.display = 'flex';\s*\n?\s*document\.getElementById\('landing'\)\.style\.flexDirection = 'column'/g,
      'showLanding()'
    );
}

function flowUserDisplayName(user) {
  if (!user) return '';
  const name = user.name || '';
  const company = user.company || '';
  if (company && !name.includes(company)) return `${name} — ${company}`;
  return name;
}

function patchFlowAuth(code) {
  code = code.replace(
    /function enterEntrepriseApp\(account\) \{\s*\n\s*closeOverlay\('companyLoginModal'\);\s*\n\s*state\.role = 'entreprise';\s*\n\s*state\.user = account;\s*\n\s*state\.user\._role = 'entreprise';/,
    `function enterEntrepriseApp(account) {
  state.role = 'entreprise';
  state.user = account;
  state.user._role = 'entreprise';
  closeOverlay('companyLoginModal');`
  );
  code = code.replace(
    /document\.getElementById\('userNameDisplay'\)\.textContent = state\.user\.name;\s*\n\s*document\.getElementById\('userRoleDisplay'\)\.textContent = 'Entreprise';/,
    `document.getElementById('userNameDisplay').textContent = flowUserDisplayName(state.user);
  document.getElementById('userRoleDisplay').textContent = 'Entreprise';`
  );
  code = code.replace(
    /(\n\s*if\(!account\)\{\s*\n\s*showToast\('❌ Matricule ou mot de passe incorrect'\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*)closeOverlay\('studentLoginModal'\);\s*\n\s*state\.role = 'etudiant';\s*\n\s*state\.user = account;/,
    `$1state.role = 'etudiant';
  state.user = account;
  state.user._role = 'etudiant';
  closeOverlay('studentLoginModal');`
  );
  code = code.replace(
    /state\.user\._role = 'etudiant';\s*\n\s*hideLanding\(\);\s*\n\s*const app = document\.getElementById\('app'\);\s*\n\s*app\.style\.display = 'flex'; app\.style\.flexDirection = 'column';\s*\n\s*document\.getElementById\('userNameDisplay'\)\.textContent = state\.user\.name;\s*\n\s*document\.getElementById\('userRoleDisplay'\)\.textContent = 'Étudiante';/,
    `hideLanding();
  const app = document.getElementById('app');
  app.style.display = 'flex'; app.style.flexDirection = 'column';
  document.getElementById('userNameDisplay').textContent = state.user.name;
  document.getElementById('userRoleDisplay').textContent = 'Étudiante';`
  );
  return code;
}

function patchEntrepriseDbAuth(code, file) {
  if (file === '02-data.js') {
    code = code.replace(
      /return data;\s*\n\}\s*\n\s*function enterEntrepriseApp/,
      `return data;
}

async function syncEntrepriseDataFromDb(account) {
  if (!account || !account.entrepriseId) return;
  const company = account.company || account.name || '';
  try {
    const data = await apiJson('/api/entreprise/' + account.entrepriseId + '/dashboard');
    for (let i = demandes.length - 1; i >= 0; i--) {
      if (demandes[i].company === company) demandes.splice(i, 1);
    }
    for (let i = conventions.length - 1; i >= 0; i--) {
      if (conventions[i].company === company) conventions.splice(i, 1);
    }
    (data.demandes || []).forEach(function(d) { demandes.push(d); });
    (data.conventions || []).forEach(function(c) { conventions.push(c); });
    await loadEntrepriseProfileFromDb(account);
  } catch (e) {
    console.warn('[StageFlow] Données entreprise (base de données):', e.message);
  }
}

async function loadEntrepriseProfileFromDb(account) {
  if (!account || !account.entrepriseId) return;
  try {
    const data = await apiJson('/api/entreprise/' + account.entrepriseId + '/profile');
    const e = data.entreprise || {};
    const u = data.user || {};
    if (!state.user) state.user = {};
    Object.assign(state.user, {
      entrepriseId: account.entrepriseId,
      company: e.nom || state.user.company,
      sector: e.secteur || state.user.sector,
      wilaya: e.wilaya || state.user.wilaya,
      adresse: e.adresse || state.user.adresse,
      phone: e.phone || state.user.phone,
      email: e.email || u.email || state.user.email,
      nif: e.nif || '',
      nrc: e.nrc || '',
      nis: e.nis || '',
      identifiant: e.identifiant || u.identifiant || state.user.identifiant,
      encadrant_stage: e.encadrant || u.encadrant_ent || state.user.encadrant_stage,
      name: u.name || state.user.name,
      avatar: u.avatar || state.user.avatar,
    });
  } catch (e) {
    console.warn('[StageFlow] Profil entreprise (base):', e.message);
  }
}

async function saveEntrepriseProfile() {
  if (!state.user || !state.user.entrepriseId) {
    showToast('⚠️ Connectez-vous avec un compte entreprise');
    return;
  }
  const payload = {
    nom: (document.getElementById('entProfilNom')?.value || '').trim(),
    secteur: (document.getElementById('entProfilSecteur')?.value || '').trim(),
    wilaya: (document.getElementById('entProfilWilaya')?.value || '').trim(),
    adresse: (document.getElementById('entProfilAdresse')?.value || '').trim(),
    phone: (document.getElementById('entProfilPhone')?.value || '').trim(),
    email: (document.getElementById('entProfilEmail')?.value || '').trim(),
    nif: (document.getElementById('entProfilNif')?.value || '').replace(/\\D/g, ''),
    nrc: (document.getElementById('entProfilNrc')?.value || '').trim(),
    nis: (document.getElementById('entProfilNis')?.value || '').trim(),
    encadrant: (document.getElementById('entProfilEncadrant')?.value || '').trim(),
  };
  try {
    await apiJson('/api/entreprise/' + state.user.entrepriseId + '/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await loadEntrepriseProfileFromDb(state.user);
    document.getElementById('userNameDisplay').textContent = flowUserDisplayName(state.user);
    showToast('✅ Profil enregistré en base');
    if (state.currentPage === 'ent-profil') navigateTo('ent-profil');
  } catch (err) {
    showToast('❌ ' + (err.message || 'Erreur enregistrement'));
  }
}

function enterEntrepriseApp`
    );
  }
  if (file === '04-auth.js') {
    code = code.replace(
      /<div class="auth-demo-row" onclick="fillCompanyLogin\('CEVITALAGRO','13102026'\)">[\s\S]*?<\/div>\s*<\/div>`;/,
      `<div class="auth-demo-row" onclick="fillCompanyLogin('CEVITALAGRO','13102026')">
        <span class="auth-demo-type">Entreprise</span>
        <span class="auth-demo-email">Cevital</span>
      </div>
    </div>
    <p class="text-sm text-muted" style="margin-top:14px;text-align:center">
      Pas encore de compte ?
      <a href="#" onclick="showEntrepriseRegisterForm();return false;" style="color:var(--cyan2);font-weight:600">Créer un compte entreprise</a>
    </p>\`;`
    );
    code = code.replace(
      /const account = \{ \.\.\.data\.user, password \};\s*\n\s*if \(account\.email\) registeredAccounts\.entreprise\[account\.email\] = account;\s*\n\s*enterEntrepriseApp\(account\);\s*\n\s*showToast\('✅ Connexion réussie — bienvenue !'\);\s*\n\s*return;\s*\n\s*\} catch \(err\) \{[\s\S]*?showToast\('❌ ' \+ \(err\.message \|\| 'Identifiant ou mot de passe incorrect'\)\);\s*\n\s*\}/,
      `await syncEntrepriseDataFromDb(data.user);
    enterEntrepriseApp(data.user);
    showToast('✅ Connexion réussie — bienvenue !');
  } catch (err) {
    showToast('❌ ' + (err.message || 'Connexion impossible. Démarrez le Backend (npm start) et vérifiez vos identifiants.'));
  }`
    );
  }
  if (file === '10-register.js') {
    code = code.replace(
      /const account = \{ \.\.\.data\.user, password: pw \};\s*\n\s*registeredAccounts\.entreprise\[email\] = account;\s*\n\s*\n\s*const nextId/,
      `const account = data.user;

    const nextId`
    );
    code = code.replace(
      /closeOverlay\('registerModal'\);\s*\n\s*showToast\(`✅ Compte créé — identifiant : \$\{data\.identifiant\}`\);\s*\n\s*setTimeout\(\(\)=> enterEntrepriseApp\(account\), 800\);/,
      `closeOverlay('registerModal');
    showToast(\`✅ Compte créé en base — identifiant : \${data.identifiant}\`);
    await syncEntrepriseDataFromDb(account);
    setTimeout(()=> enterEntrepriseApp(account), 800);`
    );
  }
  return code;
}

function patchEtudiantDb(code, file) {
  if (file === '03-univ-accounts.js') {
    code = code.replace(
      /(etudiant: \{\s*)name:'Djatout Nour El Houda',/,
      `$1id:'d1111111-1111-1111-1111-111111111111',
    name:'Djatout Nour El Houda',
    faculte:'Faculté SHS',`
    );
  }
  if (file === '02-data.js') {
    code = code.replace(
      /showToast\('❌ ' \+ \(err\.message \|\| 'Erreur enregistrement'\)\);\s*\n  \}\s*\n\}\s*\n\s*function enterEntrepriseApp/,
      `showToast('❌ ' + (err.message || 'Erreur enregistrement'));
  }
}

async function loadCompaniesFromDb() {
  try {
    const data = await apiJson('/api/entreprises');
    const list = data.entreprises || [];
    if (list.length) companies.splice(0, companies.length, ...list);
    return list.length;
  } catch (e) {
    console.warn('[StageFlow] Entreprises (base):', e.message);
    return 0;
  }
}

async function syncStudentDemandesFromDb() {
  const u = state.user;
  if (!u || !u.name) return;
  try {
    const data = await apiJson('/api/demandes?studentName=' + encodeURIComponent(u.name));
    const fromDb = data.demandes || [];
    for (let i = demandes.length - 1; i >= 0; i--) {
      if ((demandes[i].studentName || '') === u.name) demandes.splice(i, 1);
    }
    fromDb.forEach(function(d) { demandes.push(d); });
  } catch (e) {
    console.warn('[StageFlow] Demandes étudiant (base):', e.message);
  }
}

async function syncStudentConventionsFromDb() {
  const u = state.user;
  if (!u || !u.name) return;
  try {
    const data = await apiJson('/api/conventions?studentName=' + encodeURIComponent(u.name));
    const fromDb = data.conventions || [];
    for (let i = conventions.length - 1; i >= 0; i--) {
      if (conventions[i].fromDb && (conventions[i].etudiant || '') === u.name) conventions.splice(i, 1);
    }
    fromDb.forEach(function(c) {
      const idx = conventions.findIndex(function(x) { return x.id === c.id; });
      if (idx >= 0) conventions[idx] = c;
      else conventions.push(c);
    });
  } catch (e) {
    console.warn('[StageFlow] Conventions étudiant (base):', e.message);
  }
}

async function syncEtudiantFromDb() {
  await loadCompaniesFromDb();
  await syncStudentDemandesFromDb();
  await syncStudentConventionsFromDb();
}

function studentStageIsLocked() {
  const u = (state.role === 'etudiant' && state.user) ? state.user : null;
  if (!u || !u.name) return false;
  return conventions.some(function(c) {
    return (c.etudiant || '') === u.name && c.signed_entreprise && c.signed_univ;
  });
}

function mergeDemandeFromApi(demandeId, apiDemande) {
  const d = demandes.find(function(x) { return x.id === demandeId; });
  if (d) Object.assign(d, apiDemande);
  else demandes.push(apiDemande);
}

function mergeConventionFromApi(apiConvention) {
  if (!apiConvention) return;
  const idx = conventions.findIndex(function(c) { return c.id === apiConvention.id; });
  if (idx >= 0) conventions[idx] = apiConvention;
  else conventions.push(apiConvention);
}

function getStudentConvention(u) {
  if (!u || !u.name) return null;
  const mine = conventions.filter(function(c) {
    return (c.etudiant || '') === u.name
      || ((c.etudiant || '').includes(u.name.split(' ')[0])
        && (c.etudiant || '').includes(u.name.split(' ').slice(-1)[0]));
  });
  const fullySigned = mine.find(function(c) {
    return c.fromDb && c.signed_entreprise && c.signed_univ;
  });
  if (fullySigned) return fullySigned;
  const fromDb = mine.filter(function(c) { return c.fromDb; });
  if (fromDb.length) return fromDb.sort(function(a, b) { return b.id - a.id; })[0];
  if (studentHasRealDemandes(u)) return null;
  if (state.role !== 'etudiant' && u === users.etudiant) {
    const demo = conventions.find(function(c) { return c.id === 1 && !c.fromDb; });
    if (demo) return demo;
  }
  return null;
}

function studentHasRealDemandes(u) {
  if (!u || !u.name) return false;
  return demandes.some(function(d) { return (d.studentName || '') === u.name; });
}

function getStudentDemandes(u) {
  if (!u || !u.name) return [];
  return demandes.filter(function(d) { return (d.studentName || '') === u.name; });
}

function resolveStudentConv(u) {
  if (typeof getStudentConvention === 'function') {
    const c = getStudentConvention(u);
    if (c) return c;
  }
  return null;
}

function formatDashDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) { return iso; }
}

async function loadConventionFromDb(conventionId) {
  if (!conventionId) return null;
  try {
    const data = await apiJson('/api/conventions/' + conventionId);
    if (data.convention) {
      mergeConventionFromApi(data.convention);
      return data.convention;
    }
  } catch (e) {
    console.warn('[StageFlow] Convention (base):', e.message);
  }
  return conventions.find(function(c) { return c.id === conventionId; }) || null;
}

function enterEntrepriseApp`
    );
  }
  if (file === '04-auth.js') {
    code = code.replace(
      /function submitStudentLogin\(\)\{/,
      'async function submitStudentLogin(){'
    );
    code = code.replace(
      /state\.user\._role = 'etudiant';\s*\n\s*closeOverlay\('studentLoginModal'\);/,
      `state.user._role = 'etudiant';
  await syncEtudiantFromDb();
  closeOverlay('studentLoginModal');`
    );
  }
  if (file === '05-sidebar.js') {
    code = code.replace(
      /function navigateTo\(pageId\) \{\s*\n\s*state\.currentPage = pageId;\s*\n\s*document\.querySelectorAll\('\.nav-item'\)\.forEach\(n=>n\.classList\.remove\('active'\)\);\s*\n\s*const el = document\.getElementById\('nav-'\s*\+\s*pageId\);\s*\n\s*if\(el\) el\.classList\.add\('active'\);\s*\n\s*try\{\s*\n\s*document\.getElementById\('mainContent'\)\.innerHTML = getPageHTML\(pageId\);\s*\n\s*\}catch\(err\)\{/,
      `function navigateTo(pageId) {
  state.currentPage = pageId;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const el = document.getElementById('nav-'+pageId);
  if(el) el.classList.add('active');
  const renderPage = function() {
  try{
    document.getElementById('mainContent').innerHTML = getPageHTML(pageId);
  }catch(err){`
    );
    code = code.replace(
      /document\.getElementById\('mainContent'\)\.innerHTML = `<div class="empty-state"><div class="ico">⚠️<\/div><p>Une erreur est survenue lors de l'affichage de cette page\.<\/p><p class="text-xs text-muted">\$\{\(err&&err\.message\)\|\|''\}<\/p><\/div>`;\s*\n  \}\s*\n\}/,
      `document.getElementById('mainContent').innerHTML = \`<div class="empty-state"><div class="ico">⚠️</div><p>Une erreur est survenue lors de l'affichage de cette page.</p><p class="text-xs text-muted">\${(err&&err.message)||''}</p></div>\`;
  }
  };
  if (pageId === 'search' && typeof loadCompaniesFromDb === 'function') {
    loadCompaniesFromDb().finally(renderPage);
    return;
  }
  if (state.role === 'etudiant' && (pageId === 'dashboard' || pageId === 'demandes' || pageId === 'convention') && typeof syncEtudiantFromDb === 'function') {
    syncEtudiantFromDb().finally(renderPage);
    return;
  }
  renderPage();
}`
    );
  }
  if (file === '09-helpers.js') {
    code = code.replace(
      /function submitDemande\(companyName\)\{\s*\n\s*const u = etu\(\);\s*\n\s*const theme = document\.getElementById\('demandeTheme'\)\?\.value\.trim\(\) \|\| u\.theme;\s*\n\s*const message = document\.getElementById\('demandeMessage'\)\?\.value\.trim\(\);\s*\n\s*const nextId = Math\.max\(\.\.\.demandes\.map\(d=>d\.id\), 0\) \+ 1;\s*\n\s*const newDemande = \{\s*\n\s*id: nextId,\s*\n\s*company: companyName,\s*\n\s*status: 'pending',\s*\n\s*date: new Date\(\)\.toISOString\(\)\.slice\(0,10\),\s*\n\s*theme,\s*\n\s*message,\s*\n\s*encadrant: '—',\s*\n\s*studentName: u\.name,\s*\n\s*studentLabel: u\.binome \? `\$\{u\.name\} & \$\{u\.binome\.name\}` : u\.name\s*\n\s*\};\s*\n\s*demandes\.push\(newDemande\);\s*\n\s*persistDemandeState\(nextId\);\s*\n\s*closeOverlay\('demandeModal'\);\s*\n\s*showToast\(`📩 Candidature envoyée à \$\{companyName\} — lettre générée automatiquement, réponse sous 48h`\);\s*\n\s*refreshCurrentView\(\);\s*\n\}/,
      `async function submitDemande(companyName){
  const u = etu();
  const theme = document.getElementById('demandeTheme')?.value.trim() || u.theme;
  const message = document.getElementById('demandeMessage')?.value.trim();
  const entId = state.currentCompanyId;

  if (!entId) {
    showToast('⚠️ Entreprise invalide — rechargez la liste');
    return;
  }
  if (!theme) {
    showToast('⚠️ Indiquez un thème de stage');
    return;
  }
  if (studentStageIsLocked()) {
    showToast('🔒 Convention signée (entreprise + université) — un seul stage autorisé');
    return;
  }

  const duree = document.getElementById('demandeDuree')?.value.trim() || '2 mois';

  try {
    const data = await apiJson('/api/demandes', {
      method: 'POST',
      body: JSON.stringify({
        entrepriseId: entId,
        entrepriseNom: companyName,
        studentName: u.name,
        studentLabel: u.binome ? \`\${u.name} & \${u.binome.name}\` : u.name,
        studentId: u.id || null,
        theme,
        message,
        duree,
        faculte: u.faculte || 'Faculté SHS',
        departement: u.dept || u.specialty || '',
      }),
    });
    demandes.push(data.demande);
    persistDemandeState(data.demande.id);
    closeOverlay('demandeModal');
    showToast(\`📩 Candidature envoyée à \${companyName} — enregistrée en base, réponse sous 48h\`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Envoi impossible — vérifiez que le Backend tourne'));
  }
}`
    );
    code = code.replace(
      /\/\/ Accepte une demande précise par son id \(utilisé sur le tableau de bord entreprise réel\)\s*\nfunction accepterDemandeById\(demandeId\)\{\s*\n\s*const d = demandes\.find\(x=>x\.id===demandeId\);\s*\n\s*if\(!d\)\{ showToast\('⚠️ Demande introuvable'\); return; \}\s*\n\s*d\.status = 'accepted';\s*\n\s*persistDemandeState\(d\.id\);\s*\n\s*notifyUniversityOfAccord\(d\);\s*\n\s*showToast\(`✅ Accord trouvé avec \$\{d\.studentLabel\|\|d\.studentName\} — université notifiée`\);\s*\n\s*refreshCurrentView\(\);\s*\n\}/,
      `// Accepte une demande précise par son id — enregistre en base + convention auto
async function accepterDemandeById(demandeId){
  const d = demandes.find(x=>x.id===demandeId);
  if(!d){ showToast('⚠️ Demande introuvable'); return; }

  const entId = state.user && state.user.entrepriseId;
  if (!entId) {
    showToast('⚠️ Connectez-vous avec un compte entreprise');
    return;
  }

  try {
    const data = await apiJson('/api/demandes/' + demandeId + '/accept', {
      method: 'PATCH',
      body: JSON.stringify({
        entrepriseId: entId,
        encadrant: state.user.encadrant_stage || state.user.encadrant_ent || '',
      }),
    });
    mergeDemandeFromApi(demandeId, data.demande);
    mergeConventionFromApi(data.convention);
    persistDemandeState(demandeId);
    notifyUniversityOfAccord(data.demande);
    const ref = data.convention && data.convention.reference ? data.convention.reference : '';
    showToast(ref
      ? \`✅ Demande acceptée — convention \${ref} créée en base\`
      : \`✅ Accord avec \${data.demande.studentLabel||data.demande.studentName}\`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Acceptation impossible'));
  }
}`
    );
    code = code.replace(
      /\/\/ Refuse une demande précise par son id\s*\nfunction refuserDemandeById\(demandeId\)\{\s*\n\s*const d = demandes\.find\(x=>x\.id===demandeId\);\s*\n\s*if\(!d\)\{ showToast\('⚠️ Demande introuvable'\); return; \}\s*\n\s*d\.status = 'rejected';\s*\n\s*persistDemandeState\(d\.id\);\s*\n\s*showToast\(`❌ Demande de \$\{d\.studentLabel\|\|d\.studentName\} refusée`\);\s*\n\s*refreshCurrentView\(\);\s*\n\}/,
      `// Refuse une demande précise par son id — enregistre en base
async function refuserDemandeById(demandeId){
  const d = demandes.find(x=>x.id===demandeId);
  if(!d){ showToast('⚠️ Demande introuvable'); return; }

  const entId = state.user && state.user.entrepriseId;
  if (!entId) {
    showToast('⚠️ Connectez-vous avec un compte entreprise');
    return;
  }

  try {
    const data = await apiJson('/api/demandes/' + demandeId + '/reject', {
      method: 'PATCH',
      body: JSON.stringify({ entrepriseId: entId }),
    });
    mergeDemandeFromApi(demandeId, data.demande);
    persistDemandeState(demandeId);
    showToast(\`❌ Demande de \${data.demande.studentLabel||data.demande.studentName} refusée — enregistrée en base\`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Refus impossible'));
  }
}`
    );
    code = code.replace(
      /function openDemande\(id,name\)\{\s*\n\s*state\.currentCompanyId = id;/,
      `function openDemande(id,name){
  if (studentStageIsLocked()) {
    showToast('🔒 Convention signée — vous ne pouvez plus postuler à un autre stage');
    return;
  }
  state.currentCompanyId = id;`
    );
    code = code.replace(
      /<input id="demandeDuree" class="form-input" value="2 mois">/,
      '<input id="demandeDuree" class="form-input" value="${u.periode || \'2 mois\'}">'
    );
  }
  if (file === '01-storage.js') {
    code = code.replace(
      /conventions\.forEach\(c=>\{\s*\n\s*const s = sharedData\.conventionStates\[c\.id\];/,
      `conventions.forEach(c=>{
    if (c.fromDb) {
      c.signatures = c.signatures || {};
      return;
    }
    const s = sharedData.conventionStates[c.id];`
    );
    code = code.replace(
      /await persistSharedData\(\);\s*\n\}\s*\n\s*\/\/ Sauvegarde l'état d'une demande \(statut accepté\/refusé\)/,
      `await persistSharedData();
  if (conv.fromDb && typeof apiJson === 'function' && state.role) {
    const sig = conv.signatures && conv.signatures[state.role];
    if (sig) {
      try {
        const data = await apiJson('/api/conventions/' + conventionId + '/sign', {
          method: 'PATCH',
          body: JSON.stringify({ role: state.role, signature: sig }),
        });
        if (data.convention && typeof mergeConventionFromApi === 'function') {
          mergeConventionFromApi(data.convention);
        }
      } catch (e) {
        console.warn('[StageFlow] Signature convention (base):', e.message);
      }
    }
  }
}

// Sauvegarde l'état d'une demande (statut accepté/refusé)`
    );
  }
  return code;
}

function patchPdfExport(code) {
  const override = path.join(__dirname, 'templates', '09-pdf-export.js');
  if (!fs.existsSync(override)) return code;
  const pdfBlock = fs.readFileSync(override, 'utf8').replace(/^\uFEFF/, '');
  const replaced = code.replace(
    /\/\/ ─+\s*\n\/\/ GÉNÉRATION PDF[\s\S]*?\n\}\s*\n\s*\/\/ Génère et télécharge le PDF d'une convention archivée/,
    pdfBlock.trim() + "\n\n// Génère et télécharge le PDF d'une convention archivée"
  );
  return replaced !== code ? replaced : code;
}

function patchConventionDb(code) {
  code = code.replace(
    /const isMainDemo = convId===1;/,
    'const isMainDemo = convId===1 && !(conv && conv.fromDb);'
  );
  code = code.replace(
    /function openConventionById\(convId\)\{\s*\n\s*openConvention\(convId\);\s*\n\}/,
    `async function openConventionById(convId){
  if (typeof loadConventionFromDb === 'function') {
    await loadConventionFromDb(convId);
  }
  openConvention(convId);
}`
  );
  return code;
}

function patchStudentDashboard(code) {
  const dashBlock = `<div class="grid-4 mb16">
  \${(()=>{
  const myDem = typeof getStudentDemandes==='function' ? getStudentDemandes(u) : demandes.filter(d=>(d.studentName||'')===u.name);
  const conv = typeof resolveStudentConv==='function' ? resolveStudentConv(u) : null;
  const accepted = myDem.find(d=>d.status==='accepted');
  const pendingN = myDem.filter(d=>d.status==='pending').length;
  const sigCount = conv ? [conv.signed_entreprise,conv.signed_univ].filter(Boolean).length : 0;
  const pct = Math.round(sigCount/2*100);
  const convRef = conv ? (conv.reference || (conv.id ? 'SF-2026-0'+(conv.id+46) : '—')) : '—';
  const convCompany = conv ? (conv.company || '—') : (accepted ? accepted.company : '—');
  const convStatus = conv ? conv.status : (accepted ? 'pending' : 'none');
  const dossierTrend = conv && conv.status==='archived' ? 'Convention archivée' : conv && conv.status==='signed' ? 'Convention signée' : conv ? (sigCount>0 ? 'Convention partiellement signée' : 'Convention non signée') : (accepted ? 'Convention en préparation' : 'Aucune convention');
  return \`
  <div class="stat-card"><div class="num">\${myDem.length}</div><div class="lbl">Demandes envoyées</div><div class="trend">\${pendingN ? pendingN+' en attente' : myDem.length ? 'Toutes traitées' : 'Aucune candidature'}</div></div>
  <div class="stat-card"><div class="num" style="color:\${accepted?'var(--success)':'var(--text3)'}">\${accepted?1:0}</div><div class="lbl">Demande acceptée</div><div class="trend trend-up">\${accepted ? '✅ '+accepted.company : '—'}</div></div>
  <div class="stat-card"><div class="num" style="color:var(--accent)">\${conv?pct:0}%</div><div class="lbl">Dossier complété</div><div class="trend">\${dossierTrend}</div></div>
  <div class="stat-card"><div class="num" style="font-size:16px;line-height:1.3">\${conv && conv.periode ? conv.periode : (accepted && accepted.duree ? accepted.duree : '—')}</div><div class="lbl">Durée du stage</div><div class="trend" style="color:var(--cyan2)">\${accepted ? accepted.company : '—'}</div></div>\`;
  })()}
</div>
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">📋 Avancement du dossier</div>
    \${(()=>{
  const myDem = typeof getStudentDemandes==='function' ? getStudentDemandes(u) : demandes.filter(d=>(d.studentName||'')===u.name);
  const conv = typeof resolveStudentConv==='function' ? resolveStudentConv(u) : null;
  const accepted = myDem.find(d=>d.status==='accepted');
  const sigCount = conv ? [conv.signed_entreprise,conv.signed_univ].filter(Boolean).length : 0;
  const fmt = typeof formatDashDate==='function' ? formatDashDate : (d=>d||'—');
  if(!myDem.length && !conv){
    return '<div class="empty-state" style="padding:24px"><div class="ico">📋</div><p class="text-sm">Aucune candidature pour le moment</p><button class="btn btn-cyan btn-sm mt12" onclick="navigateTo(\\'search\\')">🔍 Rechercher une entreprise</button></div>';
  }
  let html = '<div class="timeline">';
  html += '<div class="tl-item"><div class="tl-dot done"></div><div class="tl-date">Compte actif</div><div class="tl-title">Profil étudiant connecté</div></div>';
  myDem.forEach(function(d){
    html += '<div class="tl-item"><div class="tl-dot '+(d.status!=='pending'?'done':'active')+'"></div><div class="tl-date">'+fmt(d.date)+'</div><div class="tl-title">Candidature — '+d.company+'</div><div class="tl-desc">'+d.theme+' · '+({pending:'En attente',accepted:'Acceptée',rejected:'Refusée'}[d.status]||d.status)+'</div></div>';
  });
  if(accepted){
    html += '<div class="tl-item"><div class="tl-dot '+(conv?'done':'active')+'"></div><div class="tl-date">'+(conv?'Convention créée':'En cours')+'</div><div class="tl-title">Convention de stage</div><div class="tl-desc">'+(conv ? (convRefLabel(conv)+' — '+conv.company) : 'Génération depuis la base…')+'</div></div>';
    html += '<div class="tl-item"><div class="tl-dot '+(sigCount===2?'done':'active')+'"></div><div class="tl-date">'+(sigCount===2?'Terminé':'En cours')+'</div><div class="tl-title">Signatures entreprise & doyenne</div><div class="tl-desc">'+sigCount+'/2 signatures</div></div>';
  }
  html += '<div class="tl-item"><div class="tl-dot '+(conv&&conv.status==='archived'?'done':'pending')+'"></div><div class="tl-date">'+(conv&&conv.status==='archived'?'Terminé':'À venir')+'</div><div class="tl-title">Archivage université</div></div>';
  html += '</div>';
  return html;
  function convRefLabel(c){ return c.reference || (c.id ? 'SF-2026-0'+(c.id+46) : '—'); }
  })()}
  </div>
  <div>
    <div class="card mb16">
      <div class="card-title">📄 Ma convention de stage</div>
      \${(()=>{
  const conv = typeof resolveStudentConv==='function' ? resolveStudentConv(u) : null;
  const accepted = (typeof getStudentDemandes==='function'?getStudentDemandes(u):[]).find(d=>d.status==='accepted');
  if(!conv && !accepted){
    return '<div class="empty-state" style="padding:20px"><div class="ico">📄</div><p class="text-sm text-muted">Postulez à une entreprise pour générer votre convention</p><button class="btn btn-cyan btn-sm mt12" onclick="navigateTo(\\'search\\')">🔍 Rechercher</button></div>';
  }
  if(!conv && accepted){
    return '<div class="empty-state" style="padding:20px"><div class="ico">⏳</div><p class="text-sm">Convention en préparation pour <strong>'+accepted.company+'</strong></p><p class="text-xs text-muted mt8">Synchronisation avec la base…</p><button class="btn btn-cyan btn-sm mt12" onclick="syncEtudiantFromDb().then(function(){ navigateTo(\\'dashboard\\'); })">🔄 Actualiser</button></div>';
  }
  const sigCount = [conv.signed_entreprise,conv.signed_univ].filter(Boolean).length;
  const convRef = conv.reference || (conv.id ? 'SF-2026-0'+(conv.id+46) : '—');
  const openBtn = conv.id ? 'openConventionById('+conv.id+')' : 'navigateTo(\\'convention\\')';
  return \`
      <div class="flex items-center gap8 mb12">\${statusPill(conv.status)}</div>
      <div class="text-sm text-muted mb12">Convention n° \${convRef} — \${conv.company||'—'}</div>
      <div style="margin-bottom:14px">
        <div class="flex justify-between mb8"><span class="text-xs text-muted">Signatures (\${sigCount}/2)</span><span class="text-xs text-muted">\${Math.round(sigCount/2*100)}%</span></div>
        <div class="progress-wrap"><div class="progress-bar" style="width:\${Math.round(sigCount/2*100)}%"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
        <div class="flex items-center gap8"><span style="color:\${conv.signed_entreprise?'var(--success)':'var(--text3)'};font-size:14px">\${conv.signed_entreprise?'✅':'⏳'}</span><span class="text-sm text-muted">Entreprise — \${conv.signed_entreprise?'signée':'non signée'}</span></div>
        <div class="flex items-center gap8"><span style="color:\${conv.signed_univ?'var(--success)':'var(--text3)'};font-size:14px">\${conv.signed_univ?'✅':'⏳'}</span><span class="text-sm text-muted">Doyenne — \${conv.signed_univ?'signée':'non signée'}</span></div>
      </div>
      <button class="btn btn-cyan w-full" onclick="\${openBtn}">📄 Voir la convention</button>\`;
  })()}
    </div>`;

  const start = code.indexOf('<div class="grid-4 mb16">');
  const notifMatch = code.match(/<div class="card">\s*\n\s*<div class="card-title">🔔 Notifications récentes<\/div>/);
  if (start >= 0 && notifMatch && notifMatch.index > start) {
    code = code.slice(0, start) + dashBlock + '\n    ' + code.slice(notifMatch.index);
  }
  return code;
}

function patchStudentConventionPage(code) {
  code = code.replace(
    /const conv=\(typeof getStudentConvention===\\'function\\'?getStudentConvention\(u\):null\)\|\|conventions\.find\(c=>c\.id===1\)/g,
    "const conv=(typeof getStudentConvention==='function'?getStudentConvention(u):null)||((typeof studentHasRealDemandes==='function'&&studentHasRealDemandes(u))?{signed_entreprise:false,signed_univ:false,status:'pending',company:((demandes.find(d=>(d.studentName||'')===u.name&&d.status==='accepted'))||{}).company||'—'}:conventions.find(c=>c.id===1))"
  );
  code = code.replace(
    /const conv=conventions\.find\(c=>c\.id===1\)/g,
    "const conv=(typeof getStudentConvention==='function'?getStudentConvention(u):null)||((typeof studentHasRealDemandes==='function'&&studentHasRealDemandes(u))?{signed_entreprise:false,signed_univ:false,status:'pending',company:((demandes.find(d=>(d.studentName||'')===u.name&&d.status==='accepted'))||{}).company||'—'}:conventions.find(c=>c.id===1))"
  );
  code = code.replace(
    /Convention n° SF-2026-047 — Cevital/,
    'Convention n° ${conv.reference||(conv.id?\'SF-2026-0\'+(conv.id+46):\'—\')} — ${conv.company||\'—\'}'
  );
  code = code.replace(
    /const matchingConv = conventions\.find\(c=>c\.fromDb && c\.company===d\.company && \(c\.etudiant\|\|''\)===u\.name\)\s*\n\s*\|\| conventions\.find\(c=>c\.company===d\.company && \(c\.etudiant\|\|''\)\.includes\(u\.name\.split\(' '\)\[0\]\)\);/,
    `const matchingConv = conventions.find(c=>c.fromDb && (c.etudiant||'')===u.name && (c.company===d.company || (d.entrepriseId && c.entrepriseId===d.entrepriseId)))
              || conventions.find(c=>c.company===d.company && (c.etudiant||'').includes(u.name.split(' ')[0]));`
  );
  code = code.replace(
    /const matchingConv = conventions\.find\(c=>c\.company===d\.company && \(c\.etudiant\|\|''\)\.includes\(u\.name\.split\(' '\)\[0\]\)\);/,
    `const matchingConv = conventions.find(c=>c.fromDb && (c.etudiant||'')===u.name && (c.company===d.company || (d.entrepriseId && c.entrepriseId===d.entrepriseId)))
              || conventions.find(c=>c.company===d.company && (c.etudiant||'').includes(u.name.split(' ')[0]));`
  );
  code = code.replace(
    /\/\/ Cherche la convention réelle de l'étudiant connecté \(générée suite à un accord\)\s*\n\s*const isMainDemo = \(u===users\.etudiant\);\s*\n\s*const myConv = isMainDemo\s*\n\s*\? conventions\.find\(c=>c\.id===1\)\s*\n\s*: conventions\.find\(c=>\(c\.etudiant\|\|''\)\.includes\(u\.name\.split\(' '\)\[0\]\) && \(c\.etudiant\|\|''\)\.includes\(u\.name\.split\(' '\)\.slice\(-1\)\[0\]\)\);/,
    `// Convention étudiant — priorité à la convention signée en base
  const myConv = typeof getStudentConvention === 'function'
    ? getStudentConvention(u)
    : conventions.find(c=>(c.etudiant||'').includes(u.name.split(' ')[0]));`
  );
  code = code.replace(
    /const sigCount = isMainDemo\s*\n\s*\? \[state\.signatures\.entreprise,state\.signatures\.universite\]\.filter\(Boolean\)\.length\s*\n\s*: \[myConv\.signed_etudiant,myConv\.signed_entreprise,myConv\.signed_univ\]\.filter\(Boolean\)\.length;\s*\n\s*const sigEnt = isMainDemo \? state\.signatures\.entreprise : myConv\.signed_entreprise;\s*\n\s*const sigUniv = isMainDemo \? state\.signatures\.universite : myConv\.signed_univ;/,
    `const useLocalDemo = myConv && myConv.id===1 && !myConv.fromDb && u===users.etudiant;
  const sigCount = useLocalDemo
    ? [state.signatures.entreprise,state.signatures.universite].filter(Boolean).length
    : [myConv.signed_entreprise,myConv.signed_univ].filter(Boolean).length;
  const sigEnt = useLocalDemo ? state.signatures.entreprise : myConv.signed_entreprise;
  const sigUniv = useLocalDemo ? state.signatures.universite : myConv.signed_univ;
  const convRef = myConv.reference || ('SF-2026-0'+(myConv.id+46));
  const isSignedInDb = !!(myConv.fromDb && myConv.signed_entreprise && myConv.signed_univ);`
  );
  code = code.replace(
    /return `\s*\n<div class="grid-2 gap16">\s*\n\s*<div class="card">\s*\n\s*<div class="card-title">Informations de la convention<\/div>/,
    `return \`
\${isSignedInDb ? '<div class="card mb16" style="border-left:4px solid var(--success);padding:14px 18px"><p class="text-sm" style="margin:0">✅ Convention signée et enregistrée en base — document officiel ci-dessous.</p></div>' : ''}
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">Informations de la convention</div>`
  );
  code = code.replace(
    /\$\{infoRow\('Référence','SF-2026-0'\+\(myConv\.id\+46\)\)\}/,
    "${infoRow('Référence', convRef)}"
  );
  code = code.replace(
    /<button class="btn btn-ghost" onclick="downloadConvention\(\)">⬇ Télécharger<\/button>/,
    '<button class="btn btn-ghost" onclick="downloadConvention(${myConv.id})">⬇ Télécharger</button>'
  );
  code = code.replace(
    /if\(!myConv\)\{\s*\n\s*return `\s*\n<div class="card">\s*\n\s*<div class="empty-state">\s*\n\s*<div class="ico">📄<\/div>\s*\n\s*<p>Aucune convention pour le moment<\/p>/,
    `if(!myConv){
    const acceptedDem = demandes.find(d=>(d.studentName||'')===u.name && d.status==='accepted');
    if(acceptedDem){
      return \`
<div class="card">
  <div class="empty-state">
    <div class="ico">⏳</div>
    <p>Convention en cours de génération</p>
    <p class="text-xs text-muted mt8">Votre candidature chez <strong>\${acceptedDem.company}</strong> a été acceptée — synchronisation avec la base en cours.</p>
    <button class="btn btn-cyan mt16" onclick="syncEtudiantFromDb().then(function(){ navigateTo('convention'); })">🔄 Actualiser</button>
  </div>
</div>\`;
    }
    return \`
<div class="card">
  <div class="empty-state">
    <div class="ico">📄</div>
    <p>Aucune convention pour le moment</p>`
  );
  return code;
}

function patchTwoPartySignatures(code, file) {
  if (file === '06-pages.js') {
    code = code.replace(
      /<div class="tl-dot \$\{sigCount===3\?'done':'active'\}"><\/div><div class="tl-date">\$\{sigCount===3\?'Terminé':'En cours'\}<\/div><div class="tl-title">Convention générée — signatures requises<\/div><div class="tl-desc">\$\{sigCount\}\/3 signatures obtenues<\/div>/,
      `<div class="tl-dot \${sigCount===2?'done':'active'}"></div><div class="tl-date">\${sigCount===2?'Terminé':'En cours'}</div><div class="tl-title">Convention — signatures entreprise & doyenne</div><div class="tl-desc">\${sigCount}/2 signatures (entreprise + doyenne)</div>`
    );
    code = code.replace(
      /<span class="text-xs text-muted">Signatures \(\$\{sigCount\}\/2\)<\/span><span class="text-xs text-muted">\$\{Math\.round\(sigCount\/3\*100\)\}%<\/span>/,
      '<span class="text-xs text-muted">Signatures (${sigCount}/2)</span><span class="text-xs text-muted">${Math.round(sigCount/2*100)}%</span>'
    );
    code = code.replace(
      /<div class="flex items-center gap8"><span style="color:\$\{conv\.signed_etudiant\?'var\(--success\)':'var\(--text3\)'\};font-size:14px">\$\{conv\.signed_etudiant\?'✅':'⏳'\}<\/span><span class="text-sm text-muted">Étudiant — \$\{conv\.signed_etudiant\?'signé':'non signé'\}<\/span><\/div>\s*\n\s*/,
      ''
    );
    code = code.replace(
      /<span class="text-sm text-muted">Université — \$\{conv\.signed_univ\?'signée':'non signée'\}<\/span>/,
      '<span class="text-sm text-muted">Doyenne — ${conv.signed_univ?\'signée\':\'non signée\'}</span>'
    );
    code = code.replace(
      /onclick="openConvention\(\)">📄 Voir & Signer la convention<\/button>/,
      'onclick="openConvention()">📄 Voir la convention</button>'
    );
    code = code.replace(
      /\$\{infoRow\('Représentant université \(signature\)','Pr\. Soualmia Abderrahmane — Doyen Faculté SHS'\)\}/,
      "${infoRow('Signataire université (Doyenne)','Pr. Soualmia Abderrahmane — Chef de doyennat, Faculté SHS')}"
    );
    code = code.replace(
      /signRow\('Université — Doyen','Pr\. Soualmia Abderrahmane', sigUniv, sigUniv\?'Signé':'En attente'\)/,
      "signRow('Université — Doyenne (Chef de doyennat)','Pr. Soualmia Abderrahmane', sigUniv, sigUniv?'Signé':'En attente')"
    );
    code = code.replace(
      /signRow\('Université — Doyenne \(Chef de doyennat\)','Pr\. Soualmia Abderrahmane, sigUniv, sigUniv\?'Signé':'En attente'\)/,
      "signRow('Université — Doyenne (Chef de doyennat)','Pr. Soualmia Abderrahmane', sigUniv, sigUniv?'Signé':'En attente')"
    );
    code = code.replace(
      /<span title="Étudiant" style="color:\$\{c\.signed_etudiant\?'var\(--success\)':'var\(--text3\)'\}">E <\/span>\s*\n\s*/,
      ''
    );
    code = code.replace(
      /<span title="Université" style="color:\$\{c\.signed_univ\?'var\(--success\)':'var\(--text3\)'\}">U<\/span>/,
      '<span title="Doyenne" style="color:${c.signed_univ?\'var(--success)\':\'var(--text3)\'}">D</span>'
    );
  }
  if (file === '07-convention.js') {
    code = code.replace(
      /<div class="role-lbl">L'Université — Doyen<\/div>/,
      `<div class="role-lbl">L'Université — Doyenne (Chef de doyennat)</div>`
    );
    code = code.replace(
      /<div class="sign-name">Pr\. Soualmia Abderrahmane — Doyen \$\{conv\.faculte\|\|'Faculté SHS'\}<\/div>/,
      `<div class="sign-name">Pr. Soualmia Abderrahmane — Chef de doyennat · \${conv.faculte||'Faculté SHS'}</div>`
    );
  }
  if (file === '08-signature.js') {
    code = code.replace(
      /function openSignModal\(\) \{\s*\n\s*closeOverlay\('conventionModal'\);/,
      `function openSignModal() {
  if (state.role === 'etudiant') {
    showToast('ℹ️ La convention est signée uniquement par l\\'entreprise et la doyenne (université)');
    return;
  }
  closeOverlay('conventionModal');`
    );
    code = code.replace(
      /const roleNames = \{ etudiant:`\$\{conv\.etudiant\|\|etu\(\)\.name\} — Étudiant\(e\)`, entreprise:`\$\{conv\.company\} — Représentant RH`, universite:'Pr\. Soualmia Abderrahmane — Doyen Faculté SHS' \};/,
      `const roleNames = { entreprise:\`\${conv.company} — Représentant entreprise\`, universite:'Pr. Soualmia Abderrahmane — Doyenne (Chef de doyennat)' };`
    );
    code = code.replace(
      /if\(state\.role==='etudiant'\) conv\.signed_etudiant = true;\s*\n\s*/,
      ''
    );
    code = code.replace(
      /const roleLabel = \{ etudiant:'Étudiante', entreprise:'Entreprise', universite:'Université' \}\[state\.role\];/,
      `const roleLabel = { entreprise:'Entreprise', universite:'Doyenne (Université)' }[state.role];`
    );
    code = code.replace(
      /if\(prog\) prog\.style\.width = \(count\/3\*100\)\+'%';\s*\n\s*if\(cnt\) cnt\.textContent = count+'\/3';/,
      `if(prog) prog.style.width = (count/2*100)+'%';
  if(cnt) cnt.textContent = count+'/2';`
    );
  }
  if (file === '09-helpers.js') {
    code = code.replace(
      /<div class="pdf-field"><label>Étudiant\(e\) :<\/label><div class="val">\$\{conv\.signed_etudiant\?'✅ Signé':'⏳ Non signé'\}<\/div><\/div>\s*\n\s*/,
      ''
    );
    code = code.replace(
      /<div class="pdf-field"><label>Université :<\/label><div class="val">\$\{conv\.signed_univ\?'✅ Signée':'⏳ Non signée'\}<\/div><\/div>/,
      `<div class="pdf-field"><label>Université — Doyenne (Chef de doyennat) :</label><div class="val">\${conv.signed_univ?'✅ Signée':'⏳ Non signée'}</div></div>`
    );
    code = code.replace(
      /\$\{sigCount\}\/3 signature\(s\) certifiée\(s\)/,
      '${sigCount}/2 signature(s) certifiée(s)'
    );
  }
  return code;
}

function patchConventionParties(code) {
  code = code.replace(
    /const etudiantNom = isMainDemo \? `\$\{u\.name\}` : conv\.etudiant;\s*\n\s*const etudiantBinome = isMainDemo \? u\.binome : null;[\s\S]*?const encadrantEnt = isMainDemo \? 'M\. Hamouchi — Directeur Marketing, Cevital' : \(conv\.encadrant_entreprise \|\| '—'\);/,
    `const etudiantNom = isMainDemo ? \`\${u.name}\` : conv.etudiant;
  const etudiantBinome = isMainDemo ? u.binome : (conv.studentBinome || (conv.parties && conv.parties.student && conv.parties.student.binome) || null);
  const specialite = isMainDemo ? (u.specialty||'Master 2 — Communication et Relations Publiques') : (conv.studentSpecialty || '—');
  const matricule = isMainDemo ? '202133011300' : (conv.studentMatricule || '—');
  const emailEtu = isMainDemo ? (u.email||'—') : (conv.studentEmail || '—');
  const universiteNom = isMainDemo ? 'Université Abderrahmane Mira — Béjaïa' : (conv.studentUniversity || 'Université Abderrahmane Mira — Béjaïa');
  const encadrantEnt = isMainDemo ? 'M. Hamouchi — Directeur Marketing, Cevital' : (conv.encadrant_entreprise || '—');
  const docRef = conv.reference || ('SF-2026-0' + (conv.id + 46));
  const faculteLabel = conv.faculte || 'Faculté SHS';
  const deptLabel = conv.departement || 'Département SIC';
  const entRep = conv.entrepriseRepresentant || encadrantEnt;
  const entLegalBlock = \`
        <div class="pdf-field"><label>Entreprise d'accueil :</label><div class="val">\${conv.company}</div></div>
        \${conv.entrepriseSecteur ? \`<div class="pdf-field"><label>Secteur d'activité :</label><div class="val">\${conv.entrepriseSecteur}</div></div>\` : ''}
        \${conv.entrepriseWilaya ? \`<div class="pdf-field"><label>Wilaya :</label><div class="val">\${conv.entrepriseWilaya}</div></div>\` : ''}
        <div class="pdf-field"><label>Encadrant stage :</label><div class="val">\${encadrantEnt}</div></div>\`;`
  );

  code = code.replace(
    /<div style="margin-top:8px;font-size:11px;color:#555">\$\{universiteNom\} · Faculté SHS · \$\{conv\.departement\|\|'Département SIC'\}<\/div>/,
    '<div style="margin-top:8px;font-size:11px;color:#555">${universiteNom} · ${faculteLabel} · ${deptLabel}</div>'
  );

  code = code.replace(
    /<div class="doc-ref">Réf\. : <strong>SF-2026-0\$\{conv\.id\+46\}<\/strong>/,
    '<div class="doc-ref">Réf. : <strong>${docRef}</strong>'
  );

  code = code.replace(
    /<div class="pdf-field"><label>Faculté \/ Département :<\/label><div class="val">\$\{conv\.faculte\|\|'Faculté SHS'\} — \$\{conv\.departement\|\|'Département SIC'\}<\/div><\/div>\s*\n\s*<div class="pdf-field"><label>Représenté par :<\/label><div class="val">Pr\. Soualmia Abderrahmane — Doyen de la Faculté SHS<\/div><\/div>\s*\n\s*<div class="pdf-field"><label>Entreprise d'accueil :<\/label><div class="val">\$\{conv\.company\}<\/div><\/div>\s*\n\s*<div class="pdf-field"><label>Représenté par :<\/label><div class="val">\$\{encadrantEnt\}<\/div><\/div>/,
    `<div class="pdf-field"><label>Faculté / Département :</label><div class="val">\${faculteLabel} — \${deptLabel}</div></div>
        <div class="pdf-field"><label>Représenté par :</label><div class="val">Pr. Soualmia Abderrahmane — Doyen \${faculteLabel}</div></div>
        \${entLegalBlock}`
  );

  return code;
}

function patchRegisterModalHtml(html) {
  if (!html) return html;
  return html
    .replace(
      '<div class="modal-title">✨ Créer un compte StageFlow</div>',
      '<div class="modal-title">🏢 Inscription entreprise — Données légales</div>'
    )
    .replace(
      'style="width:600px;max-height:90vh;overflow-y:auto"',
      'style="width:720px;max-height:92vh;overflow-y:auto"'
    )
    .replace(
      /\s*<!-- Tabs de type de compte -->\s*<div class="tabs" id="regModalTabs">[\s\S]*?<\/div>\s*/,
      '\n    '
    );
}

function patchRegisterEntrepriseOnly(code) {
  code = code.replace(/let currentRegTab = 'etudiant';/, "let currentRegTab = 'entreprise';");

  code = code.replace(
    /function openRegisterModal\(\)\{[\s\S]*?\n\}\s*\n\s*function switchRegTab/,
    `function openRegisterModal(){
  currentRegTab = 'entreprise';
  document.getElementById('registerModal').classList.add('open');
  renderRegForm('entreprise');
}

function switchRegTab`
  );

  code = code.replace(
    /function renderRegForm\(type\)\{[\s\S]*?\n\}\s*\n\s*function toggleBinomeFields/,
    `function renderRegForm(type){
  const box = document.getElementById('regModalContent');
  box.innerHTML = \`
      <div style="padding:4px 0 16px">
        <p class="text-sm text-muted mb16">Création de compte entreprise en base PostgreSQL — renseignez les informations légales et fiscales (NIF, RC, etc.).</p>

        <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin-bottom:14px;font-size:12px;font-weight:600;color:var(--text2)">📋 Identité légale</div>
        <div class="form-group"><label class="form-label">Raison sociale *</label><input id="reg_nom" class="form-input" placeholder="Ex: Cevital SPA"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">NIF (N° Identification Fiscale) *</label><input id="reg_nif" class="form-input" inputmode="numeric" maxlength="20" placeholder="Ex: 000160000123456"></div>
          <div class="form-group"><label class="form-label">N° Registre de Commerce (RC) *</label><input id="reg_nrc" class="form-input" placeholder="Ex: 06/00-1234567B12"></div>
        </div>
        <div class="form-group"><label class="form-label">NIS (Identification Statistique — optionnel)</label><input id="reg_nis" class="form-input" placeholder="Ex: 12345678901234"></div>

        <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0 14px;font-size:12px;font-weight:600;color:var(--text2)">📍 Coordonnées</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Wilaya *</label>
            <select id="reg_wilaya" class="form-select">
              <option>Béjaïa</option><option>Alger</option><option>Blida</option><option>Sétif</option>
              <option>Oran</option><option>Constantine</option><option>Tizi Ouzou</option><option>Annaba</option>
              <option>Mostaganem</option><option>Tlemcen</option><option>Batna</option><option>Skikda</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Téléphone *</label><input id="reg_phone" class="form-input" placeholder="Ex: 034 81 00 00"></div>
        </div>
        <div class="form-group"><label class="form-label">Adresse du siège *</label><input id="reg_adresse" class="form-input" placeholder="Ex: Zone industrielle, 06000 Béjaïa"></div>

        <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0 14px;font-size:12px;font-weight:600;color:var(--text2)">🏭 Activité & contact RH</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Secteur d'activité</label><input id="reg_secteur" class="form-input" placeholder="Ex: Agroalimentaire"></div>
          <div class="form-group"><label class="form-label">Email RH (contact stages) *</label><input id="reg_email" class="form-input" type="email" placeholder="Ex: stages@cevital.com"></div>
        </div>
        <div class="form-group"><label class="form-label">Responsable / encadrant stages</label><input id="reg_encadrant" class="form-input" placeholder="Ex: M. Hamouchi — Directeur Marketing"></div>

        <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0 14px;font-size:12px;font-weight:600;color:var(--text2)">🔐 Compte de connexion</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Mot de passe *</label><input id="reg_pw" type="password" class="form-input" placeholder="Min. 6 caractères"></div>
          <div class="form-group"><label class="form-label">Confirmer *</label><input id="reg_pw2" type="password" class="form-input" placeholder="••••••••"></div>
        </div>
        <p class="text-xs text-muted" style="margin-top:8px">Identifiant généré automatiquement à partir de la raison sociale (ex: CEVITALSPA).</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
          <button class="btn btn-ghost" onclick="closeOverlay('registerModal')">Annuler</button>
          <button class="btn btn-cyan" onclick="submitRegister('entreprise')">✨ Créer le compte entreprise</button>
        </div>
      </div>\`;
}

function toggleBinomeFields`
  );

  code = code.replace(
    /function submitRegister\(type\)\{[\s\S]*?\n\}\s*\n\s*async function submitRegisterEntreprise/,
    `function submitRegister(type){
  return submitRegisterEntreprise();
}

async function submitRegisterEntreprise`
  );

  code = code.replace(
    /async function submitRegisterEntreprise\(\)\{[\s\S]*?\n\}\s*\n\s*function showRegisterSuccess/,
    `async function submitRegisterEntreprise(){
  const email     = (document.getElementById('reg_email')?.value||'').trim().toLowerCase();
  const pw        = document.getElementById('reg_pw')?.value||'';
  const pw2       = document.getElementById('reg_pw2')?.value||'';
  const nom       = (document.getElementById('reg_nom')?.value||'').trim();
  const secteur   = (document.getElementById('reg_secteur')?.value||'').trim();
  const wilaya    = document.getElementById('reg_wilaya')?.value||'Béjaïa';
  const adresse   = (document.getElementById('reg_adresse')?.value||'').trim();
  const phone     = (document.getElementById('reg_phone')?.value||'').trim();
  const encadrant = (document.getElementById('reg_encadrant')?.value||'').trim();
  const nif       = (document.getElementById('reg_nif')?.value||'').replace(/\\D/g,'');
  const nrc       = (document.getElementById('reg_nrc')?.value||'').trim();
  const nis       = (document.getElementById('reg_nis')?.value||'').trim();

  if(!nom || !nif || !nrc || !adresse || !phone || !email || !pw){
    showToast('⚠️ Raison sociale, NIF, RC, adresse, téléphone, email et mot de passe sont obligatoires');
    return;
  }
  if(nif.length < 15){ showToast('⚠️ Le NIF doit contenir au moins 15 chiffres'); return; }
  if(pw !== pw2){ showToast('⚠️ Les mots de passe ne correspondent pas'); return; }
  if(pw.length < 6){ showToast('⚠️ Mot de passe : minimum 6 caractères'); return; }

  try {
    const data = await apiJson('/api/auth/entreprise/register', {
      method: 'POST',
      body: JSON.stringify({ nom, secteur, wilaya, adresse, phone, email, encadrant, password: pw, nif, nrc, nis }),
    });

    const account = data.user;
    const nextId = Math.max(...companies.map(c=>c.id), 0) + 1;
    if(!companies.some(c=>c.name===nom)){
      companies.push({ id:nextId, name:nom, domain:'Commerce & Distribution', sector:secteur||'À définir', wilaya, offers:1, rating:0, tags:[specialiteToTag(secteur)] });
    }

    closeOverlay('registerModal');
    showToast(\`✅ Compte créé en base — identifiant : \${data.identifiant}\`);
    await syncEntrepriseDataFromDb(account);
    setTimeout(()=> enterEntrepriseApp(account), 800);
  } catch (err) {
    showToast('❌ ' + (err.message || 'Erreur lors de la création du compte'));
  }
}

function showRegisterSuccess`
  );

  return code;
}

function patchEntrepriseProfilPage(code) {
  return code.replace(
    /'ent-profil':`[\s\S]*?`,\s*\n\s*\/\/ ── UNIVERSITÉ ──────────────/,
    `'ent-profil':\`
\${(() => {
  const u = state.user || {};
  const nom = u.company || 'Mon entreprise';
  const secteur = u.sector || '';
  const wilaya = u.wilaya || '';
  const logoHtml = (companyLogos[nom] && companyLogos[nom].svg)
    ? companyLogos[nom].svg
    : '<div style="width:64px;height:64px;border-radius:12px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px">' + nom.slice(0,2).toUpperCase() + '</div>';
  const esc = (v) => String(v || '').replace(/"/g, '&quot;');
  return \`
<div class="page-header">
  <h2>🏢 Profil — \${nom}</h2>
  <p class="text-sm text-muted">Identifiant connexion : <strong>\${u.identifiant || '—'}</strong></p>
</div>
<div class="card" style="max-width:640px">
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
    <div style="width:64px;height:64px;overflow:hidden;border-radius:12px">\${logoHtml}</div>
    <div>
      <div class="font-syne" style="font-size:18px">\${nom}</div>
      <div class="text-muted text-sm">\${secteur || 'Secteur'} — \${wilaya || 'Wilaya'}</div>
    </div>
  </div>
  <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin-bottom:16px;font-size:12px;font-weight:600;color:var(--text2)">📋 Identité légale</div>
  <div class="form-group"><label class="form-label">Raison sociale</label><input id="entProfilNom" class="form-input" value="\${esc(nom)}"></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">NIF</label><input id="entProfilNif" class="form-input" value="\${esc(u.nif)}"></div>
    <div class="form-group"><label class="form-label">N° RC</label><input id="entProfilNrc" class="form-input" value="\${esc(u.nrc)}"></div>
  </div>
  <div class="form-group"><label class="form-label">NIS</label><input id="entProfilNis" class="form-input" value="\${esc(u.nis)}"></div>
  <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0;font-size:12px;font-weight:600;color:var(--text2)">📍 Coordonnées & activité</div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Secteur</label><input id="entProfilSecteur" class="form-input" value="\${esc(secteur)}"></div>
    <div class="form-group"><label class="form-label">Wilaya</label><input id="entProfilWilaya" class="form-input" value="\${esc(wilaya)}"></div>
  </div>
  <div class="form-group"><label class="form-label">Adresse</label><input id="entProfilAdresse" class="form-input" value="\${esc(u.adresse)}"></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Téléphone</label><input id="entProfilPhone" class="form-input" value="\${esc(u.phone)}"></div>
    <div class="form-group"><label class="form-label">Email RH</label><input id="entProfilEmail" class="form-input" type="email" value="\${esc(u.email)}"></div>
  </div>
  <div class="form-group"><label class="form-label">Encadrant stages</label><input id="entProfilEncadrant" class="form-input" value="\${esc(u.encadrant_stage)}"></div>
  <button class="btn btn-cyan" onclick="saveEntrepriseProfile()">Enregistrer en base</button>
</div>\`;
})()}\`,

// ── UNIVERSITÉ ──────────────`
  );
}

const flowHelpers = `// Helpers flow — pages rôle sans #landing
function hideLanding() {
  var el = document.getElementById('landing');
  if (el) el.style.display = 'none';
}
function showLanding() {
  var el = document.getElementById('landing');
  if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; }
}
function flowUserDisplayName(user) {
  if (!user) return '';
  var name = user.name || '';
  var company = user.company || '';
  if (company && name.indexOf(company) === -1) return name + ' — ' + company;
  return name;
}
`;

fs.writeFileSync(path.join(jsDir, '00-flow.js'), flowHelpers, 'utf8');

const jsFiles = ['00-flow.js'];
for (const mod of JS_MODULES) {
  let chunk = sliceScript(scriptBody, mod.start, mod.end);
  chunk = patchFlowLanding(chunk);
  if (mod.file === '02-data.js' || mod.file === '04-auth.js') chunk = patchFlowAuth(chunk);
  if (mod.file === '02-data.js' || mod.file === '04-auth.js' || mod.file === '10-register.js') {
    chunk = patchEntrepriseDbAuth(chunk, mod.file);
  }
  if (['01-storage.js', '02-data.js', '03-univ-accounts.js', '04-auth.js', '05-sidebar.js', '09-helpers.js'].includes(mod.file)) {
    chunk = patchEtudiantDb(chunk, mod.file);
  }
  if (mod.file === '09-helpers.js') {
    chunk = patchPdfExport(chunk);
  }
  if (mod.file === '07-convention.js') {
    chunk = patchConventionParties(chunk);
    chunk = patchConventionDb(chunk);
    const convOverride = path.join(__dirname, 'templates', '07-convention.js');
    if (fs.existsSync(convOverride)) {
      chunk = fs.readFileSync(convOverride, 'utf8').replace(/^\uFEFF/, '');
    }
  }
  if (mod.file === '10-register.js') chunk = patchRegisterEntrepriseOnly(chunk);
  if (mod.file === '06-pages.js') {
    chunk = patchEntrepriseProfilPage(chunk);
    chunk = patchStudentConventionPage(chunk);
    chunk = patchTwoPartySignatures(chunk, mod.file);
    chunk = patchStudentDashboard(chunk);
  }
  if (['07-convention.js', '08-signature.js', '09-helpers.js'].includes(mod.file)) {
    chunk = patchTwoPartySignatures(chunk, mod.file);
  }
  fs.writeFileSync(path.join(jsDir, mod.file), chunk + '\n', 'utf8');
  jsFiles.push(mod.file);
  console.log('flow/js/' + mod.file + ' (' + Math.round(chunk.length / 1024) + ' Ko)');
}
console.log('flow/js/00-flow.js');

// ── Coquille HTML app (sans landing) ──
function extractAppShell(html) {
  const guardStart = html.indexOf('<!-- ÉCRAN DE PROTECTION');
  const landingStart = html.indexOf('<!-- LANDING -->');
  const landingEndMarker = '<!-- ESPACE UNIVERSITÉ';
  const landingEnd = html.lastIndexOf('</div>', html.indexOf(landingEndMarker));
  const mainScript = html.indexOf('<script>', html.indexOf('<!-- TOAST -->'));
  return html.slice(guardStart, landingStart) + html.slice(landingEnd + 6, mainScript);
}

const appShell = patchRegisterModalHtml(extractAppShell(src));

function extractModalById(html, id) {
  const idPos = html.indexOf(`id="${id}"`);
  if (idPos === -1) return '';
  const overlayStart = html.lastIndexOf('<div class="modal-overlay"', idPos);
  if (overlayStart === -1) return '';
  let depth = 0;
  let i = overlayStart;
  while (i < html.length) {
    if (html.startsWith('<div', i)) {
      depth++;
      i += 4;
      continue;
    }
    if (html.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) return html.slice(overlayStart, i);
      continue;
    }
    i++;
  }
  return '';
}

const landingStart = src.indexOf('<div id="landing">');
const landingEndMarker = '<!-- ESPACE UNIVERSITÉ';
const landingEnd = src.lastIndexOf('</div>', src.indexOf(landingEndMarker));
const landingHtml = src.slice(landingStart, landingEnd + 6);
const aboutHtml = extractModalById(src, 'aboutModal');
const registerHtml = patchRegisterModalHtml(extractModalById(src, 'registerModal'));

const i18nStart = src.indexOf('const i18n = {');
const i18nEnd = src.indexOf('};', i18nStart) + 2;
const i18nBlock = src.slice(i18nStart, i18nEnd);

// ── index.html (landing) ──
const indexOut = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StageFlow — Gestion des stages PFE</title>
${faviconMatch ? faviconMatch[0] : ''}
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --navy:#0B1E3D;--navy2:#122547;--cyan:#00C2FF;--cyan2:#00A8E0;
  --accent:#F0A500;--success:#00C48C;--danger:#FF4D6A;
  --bg:#F4F7FB;--bg2:#EBF0F8;--white:#FFFFFF;
  --text:#0B1E3D;--text2:#4A5F7A;--text3:#8A9BB0;
  --border:#D6E1EF;--r:12px;--r2:8px;
}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.6;min-height:100vh}
${landingStyles}
.btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:9px 18px;border-radius:var(--r2);cursor:pointer;border:none;transition:.15s;display:inline-flex;align-items:center;gap:6px}
.btn-ghost{background:none;border:1px solid var(--border);color:var(--text2)}
.btn-ghost:hover{background:var(--bg)}
.btn-cyan{background:var(--cyan);color:var(--navy);font-weight:600}
.btn-cyan:hover{background:#22D4FF}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab{padding:9px 16px;font-size:13px;font-weight:500;color:var(--text3);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;transition:.15s;font-family:'DM Sans',sans-serif}
.tab:hover{color:var(--text)}
.tab.active{color:var(--cyan2);border-bottom-color:var(--cyan2)}
.form-group{margin-bottom:16px}
.form-label{display:block;font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px}
.form-input,.form-select,.form-textarea{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:var(--r2);font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text);background:var(--white);transition:.15s;outline:none}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.text-sm{font-size:13px}.text-muted{color:var(--text3)}.mb16{margin-bottom:16px}
</style>
</head>
<body>

${landingHtml}

${aboutHtml}

${registerHtml}

<script>
const ROLE_PAGES = {
  etudiant: 'etudiant.html',
  entreprise: 'entreprise.html',
  universite: 'univ.html',
};
const state = { lang: 'fr' };

${i18nBlock}

function t(key){
  return (i18n[state.lang] && i18n[state.lang][key]) || i18n.fr[key] || key;
}

function setLang(lang){
  state.lang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem('stageflow_lang', lang); } catch (e) {}
  renderLandingTexts();
  const btn = document.getElementById('langToggleBtn');
  if (btn) btn.textContent = t('lang_btn');
}

function toggleLang(){
  setLang(state.lang === 'fr' ? 'ar' : 'fr');
}

function renderLandingTexts(){
  const map = {
    'i18n-nav-login': 'nav_login', 'i18n-nav-about': 'nav_about',
    'i18n-hero-badge': 'hero_badge', 'i18n-hero-title1': 'hero_title1', 'i18n-hero-title2': 'hero_title2', 'i18n-hero-title3': 'hero_title3',
    'i18n-hero-desc': 'hero_desc',
    'i18n-role-label': 'role_select_label',
    'i18n-role-student': 'role_student', 'i18n-role-student-desc': 'role_student_desc',
    'i18n-role-company': 'role_company', 'i18n-role-company-desc': 'role_company_desc',
    'i18n-role-univ': 'role_univ', 'i18n-role-univ-desc': 'role_univ_desc',
    'i18n-stat-students': 'stat_students', 'i18n-stat-companies': 'stat_companies', 'i18n-stat-univs': 'stat_univs', 'i18n-stat-delay': 'stat_delay', 'i18n-stat-paper': 'stat_paper',
    'i18n-about-title': 'about_title', 'i18n-about-text1': 'about_text1', 'i18n-about-text2': 'about_text2', 'i18n-about-close': 'close'
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
}

function showLogin(role){
  window.location.href = ROLE_PAGES[role] || 'index.html';
}

function openRegisterModal(){
  window.location.href = 'entreprise.html?register=1';
}

function openAbout(){
  document.getElementById('aboutModal').classList.add('open');
}

function closeOverlay(id){
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

(function init(){
  let saved = 'fr';
  try { saved = localStorage.getItem('stageflow_lang') || 'fr'; } catch (e) {}
  state.lang = saved;
  document.documentElement.lang = saved;
  document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
  renderLandingTexts();
  const btn = document.getElementById('langToggleBtn');
  if (btn) btn.textContent = t('lang_btn');
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), indexOut, 'utf8');
console.log('flow/index.html généré (' + Math.round(indexOut.length / 1024) + ' Ko)');

// ── Entrées par rôle ──
const backToIndex = `
  window.closeUnivAuth = function(){ window.location.href = 'index.html'; };
  var _closeOverlay = closeOverlay;
  closeOverlay = function(id){
    if (id === 'studentLoginModal' || id === 'companyLoginModal') {
      _closeOverlay(id);
      if (!state.role) window.location.href = 'index.html';
      return;
    }
    _closeOverlay(id);
  };
`;

function writeEntry(name, initCall) {
  const content = `// Entrée flow — ${name}
(function flowRoleEntry(){
  var guard = document.getElementById('accessGuard');
  if (guard) guard.style.display = 'none';
  hideLanding();
  ${backToIndex}
  window.logout = function(){ window.location.href = 'index.html'; };
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\\\]/).pop() || 'index.html');
    window.location.replace('http://localhost:3456/' + page + location.search);
    return;
  }
  ${initCall}
})();
`;
  fs.writeFileSync(path.join(jsDir, 'entry-' + name + '.js'), content, 'utf8');
}

writeEntry('etudiant', `loadCompaniesFromDb().finally(function(){
    openStudentLoginModal();
  });`);
writeEntry('entreprise', `window.showEntrepriseRegisterForm = function(){
    _closeOverlay('companyLoginModal');
    openRegisterModal();
  };
  if (new URLSearchParams(window.location.search).get('register')) {
    openRegisterModal();
  } else {
    openCompanyLoginModal();
  }`);
writeEntry('univ', 'showUnivAuth();');

const jsTags = jsFiles.map((f) => `<script src="js/${f}"></script>`).join('\n');

function buildRolePage(filename, title, entryName) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${faviconMatch ? faviconMatch[0] : ''}
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/app.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js"></script>
</head>
<body>

${appShell}
${jsTags}
<script src="js/entry-${entryName}.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, filename), html, 'utf8');
  console.log('flow/' + filename + ' généré (' + Math.round(html.length / 1024) + ' Ko)');
}

buildRolePage('etudiant.html', 'StageFlow — Étudiant', 'etudiant');
buildRolePage('entreprise.html', 'StageFlow — Entreprise', 'entreprise');
buildRolePage('univ.html', 'StageFlow — Université', 'univ');

console.log('\n✅ Flow complet généré — dashboards, conventions, signatures, etc.');
