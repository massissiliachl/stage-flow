// ══════════════════════════════════
// AUTH
// ══════════════════════════════════
function showLogin(role) {
  if(role==='universite'){
    showUnivAuth();
    return;
  }
  if(role==='etudiant'){
    openStudentLoginModal();
    return;
  }
  if(role==='entreprise'){
    openCompanyLoginModal();
    return;
  }
  state.role = role;
  // Si state.user a été défini lors d'une inscription, on le conserve
  // sinon on utilise le compte de démonstration
  if(!state.user || state.user._role !== role){
    state.user = users[role];
  }
  if(state.user) state.user._role = role;
  hideLanding();
  const app = document.getElementById('app');
  app.style.display = 'flex'; app.style.flexDirection = 'column';
  const labels = { etudiant:'Étudiante', entreprise:'Entreprise', universite:'Université' };
  document.getElementById('userNameDisplay').textContent = state.user.name;
  document.getElementById('userRoleDisplay').textContent = labels[role];
  document.getElementById('avatarDisplay').textContent = state.user.avatar;
  buildSidebar(); buildNotifList(); navigateTo(getDefaultPage());
  startSharedSync();
}

// ──────────────────────────────────
// CONNEXION ÉTUDIANT — matricule + mot de passe
// ──────────────────────────────────
function openStudentLoginModal(){
  document.getElementById('studentLoginModalContent').innerHTML = `
    <p class="auth-sub">Connectez-vous avec votre matricule et votre mot de passe.</p>
    <div class="form-group"><label class="form-label">N° matricule</label><input id="studentLoginMatricule" class="form-input" placeholder="Votre numéro de matricule"></div>
    <div class="form-group"><label class="form-label">Mot de passe</label><input id="studentLoginPassword" type="password" class="form-input" placeholder="••••••••"></div>
    <button class="btn btn-cyan w-full" onclick="submitStudentLogin()">Se connecter</button>
    <div class="auth-demo-box">
      <div class="text-xs text-muted mb8" style="font-weight:600">Compte de démonstration :</div>
      <div class="auth-demo-row" onclick="fillStudentLogin('202133011300','13102026')" style="cursor:pointer">
        <span class="auth-demo-type">Étudiante</span>
        <span class="auth-demo-email">Djatout Nour El Houda — cliquez pour accéder directement</span>
      </div>
    </div>`;
  document.getElementById('studentLoginModal').classList.add('open');
}

function fillStudentLogin(matricule, password){
  document.getElementById('studentLoginMatricule').value = matricule;
  document.getElementById('studentLoginPassword').value = password;
  setTimeout(()=>submitStudentLogin(), 50);
}

async function submitStudentLogin(){
  const matricule = (document.getElementById('studentLoginMatricule').value||'').trim();
  const password  = document.getElementById('studentLoginPassword').value||'';

  // Cherche parmi les comptes inscrits dynamiquement, puis le compte de démonstration
  let account = Object.values(registeredAccounts.etudiant).find(s=>s.matricule===matricule && s.password===password);
  if(!account && users.etudiant.matricule===matricule && users.etudiant.password===password){
    account = users.etudiant;
  }

  if(!account){
    showToast('❌ Matricule ou mot de passe incorrect');
    return;
  }

  state.role = 'etudiant';
  state.user = account;
  state.user._role = 'etudiant';
  await syncEtudiantFromDb();
  closeOverlay('studentLoginModal');
  hideLanding();
  const app = document.getElementById('app');
  app.style.display = 'flex'; app.style.flexDirection = 'column';
  document.getElementById('userNameDisplay').textContent = state.user.name;
  document.getElementById('userRoleDisplay').textContent = 'Étudiante';
  document.getElementById('avatarDisplay').textContent = state.user.avatar || state.user.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  buildSidebar(); buildNotifList(); navigateTo(getDefaultPage());
  startSharedSync();
}

// ──────────────────────────────────
// CONNEXION ENTREPRISE — identifiant + mot de passe
// ──────────────────────────────────
function openCompanyLoginModal(){
  document.getElementById('companyLoginModalContent').innerHTML = `
    <p class="auth-sub">Connectez-vous avec l'identifiant de votre entreprise et votre mot de passe.</p>
    <div class="form-group"><label class="form-label">Identifiant entreprise</label><input id="companyLoginId" class="form-input" placeholder="Identifiant de votre entreprise"></div>
    <div class="form-group"><label class="form-label">Mot de passe</label><input id="companyLoginPassword" type="password" class="form-input" placeholder="••••••••"></div>
    <button class="btn btn-cyan w-full" onclick="submitCompanyLogin()">Se connecter</button>
    <div class="auth-demo-box">
      <div class="text-xs text-muted mb8" style="font-weight:600">Compte de démonstration :</div>
      <div class="auth-demo-row" onclick="fillCompanyLogin('CEVITALAGRO','13102026')">
        <span class="auth-demo-type">Entreprise</span>
        <span class="auth-demo-email">Cevital</span>
      </div>
    </div>
    <p class="text-sm text-muted" style="margin-top:14px;text-align:center">
      Pas encore de compte ?
      <a href="#" onclick="showEntrepriseRegisterForm();return false;" style="color:var(--cyan2);font-weight:600">Créer un compte entreprise</a>
    </p>`;
  document.getElementById('companyLoginModal').classList.add('open');
}

function fillCompanyLogin(identifiant, password){
  document.getElementById('companyLoginId').value = identifiant;
  document.getElementById('companyLoginPassword').value = password;
  setTimeout(()=>submitCompanyLogin(), 50);
}

async function submitCompanyLogin(){
  const identifiant = (document.getElementById('companyLoginId').value||'').trim().toUpperCase();
  const password    = document.getElementById('companyLoginPassword').value||'';

  if(!identifiant || !password){
    showToast('⚠️ Identifiant et mot de passe requis');
    return;
  }

  try {
    const data = await apiJson('/api/auth/entreprise/login', {
      method: 'POST',
      body: JSON.stringify({ identifiant, password }),
    });
    await syncEntrepriseDataFromDb(data.user);
    enterEntrepriseApp(data.user);
    showToast('✅ Connexion réussie — bienvenue !');
  } catch (err) {
    showToast('❌ ' + (err.message || 'Connexion impossible. Démarrez le Backend (npm start) et vérifiez vos identifiants.'));
  }
}

function enterApp(role) {
  state.role = role;
  hideLanding();
  const app = document.getElementById('app');
  app.style.display = 'flex'; app.style.flexDirection = 'column';
  const labels = { etudiant:'Étudiante', entreprise:'Entreprise', universite:'Université' };
  document.getElementById('userNameDisplay').textContent = state.user.name;
  document.getElementById('userRoleDisplay').textContent = labels[role] + (state.user.role_title ? ` · ${state.user.role_title}` : '');
  document.getElementById('avatarDisplay').textContent = state.user.avatar;
  buildSidebar(); buildNotifList(); navigateTo(getDefaultPage());
  startSharedSync();
}

function logout() {
  document.getElementById('univAuthScreen').style.display = 'none';
  showLanding();
  document.getElementById('app').style.display = 'none';
  state.role = null; state.user = null; state.signatures = {};
  renderLandingStats();
  // Réinitialise l'essai (signatures, demandes, notes) pour pouvoir recommencer
  resetSharedData().then(()=>{
    showToast('🔄 Essai réinitialisé — vous pouvez recommencer');
    renderLandingStats();
  });
}

function getDefaultPage() {
  return { etudiant:'dashboard', entreprise:'ent-dashboard', universite:'univ-dashboard' }[state.role];
}

// ──────────────────────────────────
// AUTH UNIVERSITÉ — Connexion / Inscription
// ──────────────────────────────────
function showUnivAuth() {
  state.authMode = 'login';
  hideLanding();
  document.getElementById('univAuthScreen').style.display = 'flex';
  renderUnivAuth();
}

function closeUnivAuth() {
  document.getElementById('univAuthScreen').style.display = 'none';
  showLanding();
}

function switchAuthMode(mode) {
  state.authMode = mode;
  renderUnivAuth();
}

function renderUnivAuth() {
  const box = document.getElementById('univAuthBox');
  const isLogin = state.authMode === 'login';

  box.innerHTML = `
    <div class="auth-tabs">
      <button class="auth-tab ${isLogin?'active':''}" onclick="switchAuthMode('login')">${t('auth_login_tab')}</button>
      <button class="auth-tab ${!isLogin?'active':''}" onclick="switchAuthMode('register')">${t('auth_register_tab')}</button>
    </div>
    ${isLogin ? loginFormHTML() : registerFormHTML()}
  `;
}

function loginFormHTML(){
  return `
    <div class="auth-form">
      <p class="auth-sub">${t('auth_login_sub')}</p>
      <div class="form-group"><label class="form-label">${t('auth_email')}</label><input id="loginEmail" class="form-input" placeholder="ex: sic@univ-bejaia.dz"></div>
      <div class="form-group"><label class="form-label">${t('auth_password')}</label><input id="loginPassword" type="password" class="form-input" placeholder="••••••••"></div>
      <button class="btn btn-cyan w-full" onclick="submitUnivLogin()">${t('auth_login_btn')}</button>
      <div class="auth-demo-box">
        <div class="text-xs text-muted mb8" style="font-weight:600">${t('auth_demo_accounts')}</div>
        ${universityAccounts.map(a=>`
          <div class="auth-demo-row" onclick="fillLogin('${a.email}','${a.password}')">
            <span class="auth-demo-type">${accountTypeLabel(a.type)}</span>
            <span class="auth-demo-email">${a.email}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function fillLogin(email, pass){
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pass;
  setTimeout(()=>submitUnivLogin(), 50);
}

function submitUnivLogin(){
  const email = (document.getElementById('loginEmail').value||'').trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value||'';
  const account = universityAccounts.find(a=>a.email.toLowerCase()===email && a.password===pass);
  if(!account){ showToast('❌ Email ou mot de passe incorrect'); return; }
  state.user = account;
  document.getElementById('univAuthScreen').style.display = 'none';
  enterApp('universite');
}

function registerFormHTML(){
  const type = state.regAccountType;
  const parentOptions = type==='faculte'
    ? universityAccounts.filter(a=>a.type==='universite')
    : type==='departement'
      ? universityAccounts.filter(a=>a.type==='faculte')
      : [];

  return `
    <div class="auth-form">
      <p class="auth-sub">${t('auth_register_sub')}</p>
      <div class="form-group">
        <label class="form-label">${t('auth_account_type')}</label>
        <select id="regType" class="form-select" onchange="onRegTypeChange(this.value)">
          <option value="universite" ${type==='universite'?'selected':''}>${t('auth_type_univ')}</option>
          <option value="faculte" ${type==='faculte'?'selected':''}>${t('auth_type_fac')}</option>
          <option value="departement" ${type==='departement'?'selected':''}>${t('auth_type_dept')}</option>
        </select>
      </div>
      ${type!=='universite' ? `
      <div class="form-group">
        <label class="form-label">${type==='faculte'?t('auth_parent_univ'):t('auth_parent_fac')}</label>
        <select id="regParent" class="form-select">
          ${parentOptions.length ? parentOptions.map(a=>`<option value="${a.id}">${type==='faculte'?a.university:(a.faculte+' — '+a.university)}</option>`).join('') : `<option value="">${t('auth_no_parent')}</option>`}
        </select>
      </div>` : ''}
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('auth_resp_name')}</label><input id="regName" class="form-input" placeholder="Ex: Dr. Karim Belaïdi"></div>
        <div class="form-group"><label class="form-label">${t('auth_resp_title')}</label><input id="regTitle" class="form-input" placeholder="Ex: Responsable des stages"></div>
      </div>
      <div class="form-group"><label class="form-label">${type==='universite'?t('auth_org_univ'):type==='faculte'?t('auth_org_fac'):t('auth_org_dept')}</label><input id="regOrgName" class="form-input" placeholder="${type==='universite'?t('auth_org_univ_ph'):type==='faculte'?t('auth_org_fac_ph'):t('auth_org_dept_ph')}"></div>
      <div class="form-group"><label class="form-label">${t('auth_email')}</label><input id="regEmail" class="form-input" placeholder="ex: dept@univ-bejaia.dz"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('auth_password')}</label><input id="regPassword" type="password" class="form-input" placeholder="••••••••"></div>
        <div class="form-group"><label class="form-label">${t('auth_password_confirm')}</label><input id="regPassword2" type="password" class="form-input" placeholder="••••••••"></div>
      </div>
      <div class="sign-info-box">
        <span style="font-size:16px;flex-shrink:0">🔐</span>
        <span>${t('auth_security_note')}</span>
      </div>
      <button class="btn btn-cyan w-full" onclick="submitUnivRegister()">${t('auth_create_btn')}</button>
    </div>`;
}

function onRegTypeChange(val){
  state.regAccountType = val;
  renderUnivAuth();
}

function submitUnivRegister(){
  const type = state.regAccountType;
  const name = (document.getElementById('regName').value||'').trim();
  const roleTitle = (document.getElementById('regTitle').value||'').trim();
  const orgName = (document.getElementById('regOrgName').value||'').trim();
  const email = (document.getElementById('regEmail').value||'').trim().toLowerCase();
  const pass = document.getElementById('regPassword').value||'';
  const pass2 = document.getElementById('regPassword2').value||'';

  if(!name || !orgName || !email || !pass){ showToast('⚠️ Merci de remplir tous les champs obligatoires'); return; }
  if(pass !== pass2){ showToast('⚠️ Les mots de passe ne correspondent pas'); return; }
  if(universityAccounts.some(a=>a.email.toLowerCase()===email)){ showToast('⚠️ Cet email est déjà utilisé'); return; }

  let parentId = null, university = orgName, faculte = null, departement = null;

  if(type==='faculte'){
    const parent = universityAccounts.find(a=>a.id===document.getElementById('regParent').value);
    if(!parent){ showToast('⚠️ Sélectionnez une université de rattachement'); return; }
    parentId = parent.id; university = parent.university; faculte = orgName;
  } else if(type==='departement'){
    const parent = universityAccounts.find(a=>a.id===document.getElementById('regParent').value);
    if(!parent){ showToast('⚠️ Sélectionnez une faculté de rattachement'); return; }
    parentId = parent.id; university = parent.university; faculte = parent.faculte; departement = orgName;
  }

  const initials = orgName.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'UN';

  const newAccount = {
    id: type+'-'+Date.now().toString(36),
    type, parentId, name, role_title: roleTitle || accountTypeLabels[type],
    university, faculte, departement, email, password: pass, avatar: initials
  };

  universityAccounts.push(newAccount);
  showToast(`✅ Compte ${accountTypeLabels[type]} créé — vous pouvez vous connecter`);
  state.authMode = 'login';
  renderUnivAuth();
}

// ──────────────────────────────────
// AJOUT D'UN COMPTE ENFANT (Faculté ou Département) depuis le tableau de bord
// ──────────────────────────────────
function openAddChildAccount(){
  const parent = state.user;
  const childType = parent.type==='universite' ? 'faculte' : 'departement';
  const orgLabel = childType==='faculte' ? 'Nom de la faculté' : 'Nom du département';
  const orgPlaceholder = childType==='faculte' ? 'Ex: Faculté des Sciences Économiques' : 'Ex: Département Informatique';

  document.getElementById('childAccountModalTitle').textContent = childType==='faculte' ? 'Ajouter une faculté' : 'Ajouter un département';
  document.getElementById('childAccountModalContent').innerHTML = `
    <p class="text-sm text-muted mb16">Ce nouveau compte aura son propre espace : ses étudiants, demandes et conventions resteront séparés des autres ${childType==='faculte'?'facultés':'départements'}.</p>
    <input type="hidden" id="childAccountType" value="${childType}">
    <div class="form-group"><label class="form-label">${orgLabel}</label><input id="childOrgName" class="form-input" placeholder="${orgPlaceholder}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nom du responsable</label><input id="childRespName" class="form-input" placeholder="Ex: Dr. Karim Belaïdi"></div>
      <div class="form-group"><label class="form-label">Fonction</label><input id="childRespTitle" class="form-input" placeholder="Ex: Responsable des stages"></div>
    </div>
    <div class="form-group"><label class="form-label">Email institutionnel</label><input id="childEmail" class="form-input" placeholder="ex: dept@univ-bejaia.dz"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Mot de passe</label><input id="childPassword" type="password" class="form-input" placeholder="••••••••"></div>
      <div class="form-group"><label class="form-label">Confirmer le mot de passe</label><input id="childPassword2" type="password" class="form-input" placeholder="••••••••"></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
      <button class="btn btn-ghost" onclick="closeOverlay('childAccountModal')">Annuler</button>
      <button class="btn btn-cyan" onclick="submitChildAccount()">Créer le compte</button>
    </div>`;
  document.getElementById('childAccountModal').classList.add('open');
}

function submitChildAccount(){
  const parent = state.user;
  const childType = document.getElementById('childAccountType').value;
  const orgName = (document.getElementById('childOrgName').value||'').trim();
  const name = (document.getElementById('childRespName').value||'').trim();
  const roleTitle = (document.getElementById('childRespTitle').value||'').trim();
  const email = (document.getElementById('childEmail').value||'').trim().toLowerCase();
  const pass = document.getElementById('childPassword').value||'';
  const pass2 = document.getElementById('childPassword2').value||'';

  if(!orgName || !name || !email || !pass){ showToast('⚠️ Merci de remplir tous les champs obligatoires'); return; }
  if(pass !== pass2){ showToast('⚠️ Les mots de passe ne correspondent pas'); return; }
  if(universityAccounts.some(a=>a.email.toLowerCase()===email)){ showToast('⚠️ Cet email est déjà utilisé'); return; }

  const initials = orgName.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'UN';

  const newAccount = {
    id: childType+'-'+Date.now().toString(36),
    type: childType, parentId: parent.id, name, role_title: roleTitle || accountTypeLabels[childType],
    university: parent.university,
    faculte: childType==='faculte' ? orgName : parent.faculte,
    departement: childType==='departement' ? orgName : null,
    email, password: pass, avatar: initials
  };

  universityAccounts.push(newAccount);
  closeOverlay('childAccountModal');
  showToast(`✅ ${accountTypeLabels[childType]} "${orgName}" créé(e) avec succès`);
  navigateTo('univ-comptes');
}
