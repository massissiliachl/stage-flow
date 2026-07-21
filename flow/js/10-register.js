// ──────────────────────────────────
// MODAL D'INSCRIPTION
// ──────────────────────────────────
let currentRegTab = 'entreprise';

function openRegisterModal(){
  currentRegTab = 'entreprise';
  document.getElementById('registerModal').classList.add('open');
  renderRegForm('entreprise');
}

function switchRegTab(type, el){
  currentRegTab = type;
  document.querySelectorAll('#regModalTabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderRegForm(type);
}

function renderRegForm(type){
  const box = document.getElementById('regModalContent');
  box.innerHTML = `
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
      </div>`;
}

function toggleBinomeFields(checked){
  const el = document.getElementById('reg_binome_fields');
  if (el) el.style.display = checked ? 'block' : 'none';
}

function renderStudentRegisterForm(){
  const box = document.getElementById('studentLoginModalContent');
  if (!box) return;
  box.innerHTML = `
    <p class="auth-sub">Créez votre compte étudiant pour postuler, signer et suivre votre convention PFE.</p>

    <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin-bottom:14px;font-size:12px;font-weight:600;color:var(--text2)">👤 Identité</div>
    <div class="form-group"><label class="form-label">Nom complet *</label><input id="reg_stu_name" class="form-input" placeholder="Ex: Djatout Nour El Houda"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">N° matricule *</label><input id="reg_stu_matricule" class="form-input" placeholder="Ex: 202133011300"></div>
      <div class="form-group"><label class="form-label">Email universitaire *</label><input id="reg_stu_email" class="form-input" type="email" placeholder="Ex: n.djatout@univ-bejaia.dz"></div>
    </div>

    <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0 14px;font-size:12px;font-weight:600;color:var(--text2)">🎓 Parcours académique</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Spécialité *</label><input id="reg_stu_specialty" class="form-input" placeholder="Ex: Master 2 — Communication"></div>
      <div class="form-group"><label class="form-label">Promotion</label><input id="reg_stu_promo" class="form-input" placeholder="Ex: 2025-2026"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Faculté</label><input id="reg_stu_faculte" class="form-input" placeholder="Ex: Faculté SHS"></div>
      <div class="form-group"><label class="form-label">Département</label><input id="reg_stu_departement" class="form-input" placeholder="Ex: Sciences de la Communication"></div>
    </div>
    <div class="form-group"><label class="form-label">Université</label><input id="reg_stu_university" class="form-input" value="Université Abderrahmane Mira — Béjaïa"></div>
    <div class="form-group"><label class="form-label">Thème PFE (optionnel)</label><input id="reg_stu_theme" class="form-input" placeholder="Ex: Usage de l'IA en communication"></div>

    <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0 14px;font-size:12px;font-weight:600;color:var(--text2)">👥 Modalité du PFE</div>
    <div class="form-group">
      <label class="form-label">Type de projet *</label>
      <select id="reg_stu_group_type" class="form-select" onchange="toggleStudentGroupFields(this.value)">
        <option value="solo">Seul(e) — PFE individuel</option>
        <option value="binome">Binôme — 2 étudiants</option>
        <option value="quadrinome">Quadrinôme — 4 étudiants</option>
      </select>
    </div>
    <div id="reg_stu_group_fields" style="display:none">
      <p class="text-xs text-muted mb12" id="reg_stu_group_hint">Renseignez votre(vos) coéquipier(s). Vous partagerez le même thème, la même entreprise et la même convention.</p>
      <div id="reg_stu_members"></div>
    </div>

    <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0 14px;font-size:12px;font-weight:600;color:var(--text2)">🔐 Compte de connexion</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Mot de passe *</label><input id="reg_stu_pw" type="password" class="form-input" placeholder="Min. 6 caractères"></div>
      <div class="form-group"><label class="form-label">Confirmer *</label><input id="reg_stu_pw2" type="password" class="form-input" placeholder="••••••••"></div>
    </div>

    <button class="btn btn-cyan w-full" onclick="submitRegisterEtudiant()">✨ Créer mon compte étudiant</button>
    <p class="text-sm text-muted" style="margin-top:14px;text-align:center">
      Déjà inscrit(e) ?
      <a href="#" onclick="openStudentLoginModal();return false;" style="color:var(--cyan2);font-weight:600">Se connecter</a>
    </p>`;
  toggleStudentGroupFields('solo');
}

function toggleStudentGroupFields(groupType){
  const wrap = document.getElementById('reg_stu_group_fields');
  const membersBox = document.getElementById('reg_stu_members');
  const hint = document.getElementById('reg_stu_group_hint');
  if (!wrap || !membersBox) return;

  const count = groupType === 'binome' ? 1 : groupType === 'quadrinome' ? 3 : 0;
  wrap.style.display = count ? 'block' : 'none';
  if (hint) {
    hint.textContent = groupType === 'binome'
      ? 'Renseignez votre coéquipier. Vous partagerez le même thème, la même entreprise et la même convention.'
      : 'Renseignez vos 3 coéquipiers. Vous partagerez le même thème, la même entreprise et la même convention.';
  }

  membersBox.innerHTML = Array.from({ length: count }, (_, i) => `
    <div style="border:1px solid var(--border);border-radius:var(--r2);padding:12px;margin-bottom:10px">
      <div class="text-xs text-muted mb8" style="font-weight:600">Coéquipier ${i + 1}</div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nom complet *</label><input id="reg_stu_member_name_${i}" class="form-input" placeholder="Nom et prénom"></div>
        <div class="form-group"><label class="form-label">Email universitaire</label><input id="reg_stu_member_email_${i}" class="form-input" type="email" placeholder="email@univ-bejaia.dz"></div>
      </div>
      <div class="form-group"><label class="form-label">Matricule</label><input id="reg_stu_member_matricule_${i}" class="form-input" placeholder="N° matricule"></div>
    </div>
  `).join('');
}

function collectStudentGroupMembers(groupType){
  const count = groupType === 'binome' ? 1 : groupType === 'quadrinome' ? 3 : 0;
  const members = [];
  for (let i = 0; i < count; i++) {
    members.push({
      name: (document.getElementById(`reg_stu_member_name_${i}`)?.value || '').trim(),
      email: (document.getElementById(`reg_stu_member_email_${i}`)?.value || '').trim(),
      matricule: (document.getElementById(`reg_stu_member_matricule_${i}`)?.value || '').trim(),
    });
  }
  return members;
}

function openStudentRegisterModal(){
  document.getElementById('studentLoginModal').classList.add('open');
  const title = document.querySelector('#studentLoginModal .modal-title');
  if (title) title.textContent = '🎓 Inscription Étudiant';
  renderStudentRegisterForm();
}

function submitRegister(type){
  if (type === 'etudiant') return submitRegisterEtudiant();
  return submitRegisterEntreprise();
}

async function submitRegisterEtudiant(){
  const name = (document.getElementById('reg_stu_name')?.value || '').trim();
  const matricule = (document.getElementById('reg_stu_matricule')?.value || '').trim();
  const email = (document.getElementById('reg_stu_email')?.value || '').trim().toLowerCase();
  const specialty = (document.getElementById('reg_stu_specialty')?.value || '').trim();
  const promo = (document.getElementById('reg_stu_promo')?.value || '').trim();
  const faculte = (document.getElementById('reg_stu_faculte')?.value || '').trim();
  const departement = (document.getElementById('reg_stu_departement')?.value || '').trim();
  const university = (document.getElementById('reg_stu_university')?.value || '').trim();
  const theme = (document.getElementById('reg_stu_theme')?.value || '').trim();
  const pw = document.getElementById('reg_stu_pw')?.value || '';
  const pw2 = document.getElementById('reg_stu_pw2')?.value || '';
  const groupType = document.getElementById('reg_stu_group_type')?.value || 'solo';
  const groupMembers = collectStudentGroupMembers(groupType);

  if (!name || !matricule || !email || !specialty || !pw) {
    showToast('⚠️ Nom, matricule, email, spécialité et mot de passe sont obligatoires');
    return;
  }
  if (pw !== pw2) { showToast('⚠️ Les mots de passe ne correspondent pas'); return; }
  if (pw.length < 6) { showToast('⚠️ Mot de passe : minimum 6 caractères'); return; }
  if (groupType !== 'solo' && groupMembers.some((m) => !m.name)) {
    showToast('⚠️ Renseignez le nom de chaque coéquipier');
    return;
  }

  const payload = {
    name, matricule, email, password: pw, specialty, promo, university,
    faculte, departement, theme, groupType, groupMembers,
  };

  try {
    const data = await apiJson('/api/auth/etudiant/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const account = { ...data.user, password: pw, _role: 'etudiant' };
    registeredAccounts.etudiant[matricule] = account;
    closeOverlay('studentLoginModal');
    showToast(`✅ Compte créé — bienvenue ${name}`);
    state.role = 'etudiant';
    state.user = account;
    await syncEtudiantFromDb();
    hideLanding();
    const app = document.getElementById('app');
    app.style.display = 'flex'; app.style.flexDirection = 'column';
    document.getElementById('userNameDisplay').textContent = account.name;
    document.getElementById('userRoleDisplay').textContent = 'Étudiante';
    document.getElementById('avatarDisplay').textContent = account.avatar || account.name.slice(0, 2).toUpperCase();
    buildSidebar(); buildNotifList(); navigateTo(getDefaultPage());
    startSharedSync();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Erreur lors de la création du compte'));
  }
}


async function submitRegisterEntreprise(){
  const email     = (document.getElementById('reg_email')?.value||'').trim().toLowerCase();
  const pw        = document.getElementById('reg_pw')?.value||'';
  const pw2       = document.getElementById('reg_pw2')?.value||'';
  const nom       = (document.getElementById('reg_nom')?.value||'').trim();
  const secteur   = (document.getElementById('reg_secteur')?.value||'').trim();
  const wilaya    = document.getElementById('reg_wilaya')?.value||'Béjaïa';
  const adresse   = (document.getElementById('reg_adresse')?.value||'').trim();
  const phone     = (document.getElementById('reg_phone')?.value||'').trim();
  const encadrant = (document.getElementById('reg_encadrant')?.value||'').trim();
  const nif       = (document.getElementById('reg_nif')?.value||'').replace(/\D/g,'');
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
    showToast(`✅ Compte créé en base — identifiant : ${data.identifiant}`);
    await syncEntrepriseDataFromDb(account);
    setTimeout(()=> enterEntrepriseApp(account), 800);
  } catch (err) {
    showToast('❌ ' + (err.message || 'Erreur lors de la création du compte'));
  }
}

function showRegisterSuccess(type, nom, email){
  const labels = { etudiant:'Étudiante', entreprise:'Entreprise', universite:'Université' };
  const roleLabel = labels[type] || type;
  // Affiche un toast puis connecte directement
  showToast(`✅ Compte créé — connexion en cours...`);
  setTimeout(()=>{
    showLogin(type);
  }, 1000);
}
function toggleNotifModal(){ document.getElementById('notifModal').classList.toggle('open'); }

function showToast(msg){
  const toastEl=document.getElementById('toast');
  document.getElementById('toastMsg').textContent=msg;
  toastEl.classList.add('show');
  setTimeout(()=>toastEl.classList.remove('show'),3800);
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(o=>{
  o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); });
});
document.getElementById('signModal').addEventListener('click',e=>{
  if(e.target===document.getElementById('signModal')) closeSignModal();
});
