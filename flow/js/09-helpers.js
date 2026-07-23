// ══════════════════════════════════
// HELPERS
// ══════════════════════════════════
function statusPill(s) {
  const map={pending:'s-pending',accepted:'s-accepted',rejected:'s-rejected',cancelled:'s-archived',active:'s-active',signed:'s-signed',archived:'s-archived'};
  const labelKeys={pending:'status_pending',accepted:'status_accepted',rejected:'status_rejected',cancelled:'status_cancelled',active:'status_active',signed:'status_signed',archived:'status_archived'};
  return `<span class="status-pill ${map[s]||'s-pending'}">${labelKeys[s]?t(labelKeys[s]):s}</span>`;
}

function infoRow(lbl,val){
  return `<div class="flex gap12"><span class="text-xs text-muted" style="width:190px;flex-shrink:0;padding-top:2px">${lbl}</span><span class="text-sm" style="font-weight:500;color:var(--text)">${val}</span></div>`;
}

function signRow(role,name,signed,date){
  return `<div class="flex items-center justify-between" style="padding:12px 0;border-bottom:1px solid var(--border)">
    <div><div class="text-sm" style="font-weight:500">${role}</div><div class="text-xs text-muted">${name}</div></div>
    <div style="text-align:right"><div style="color:${signed?'var(--success)':'var(--text3)'};font-size:13px">${signed?'✅ Signé':'⏳ En attente'}</div><div class="text-xs text-muted">${date}</div></div>
  </div>`;
}

// ──────────────────────────────────
// BINÔME / QUADRINÔME DE STAGE
// ──────────────────────────────────
function normalizeStudentGroup(user) {
  if (!user) return { groupType: 'solo', members: [] };
  if (user.groupType && Array.isArray(user.groupMembers)) {
    return { groupType: user.groupType, members: user.groupMembers };
  }
  const binome = user.binome;
  if (binome && binome.groupType && Array.isArray(binome.members)) {
    return { groupType: binome.groupType, members: binome.members };
  }
  if (binome && binome.name) {
    return { groupType: 'binome', members: [binome] };
  }
  return { groupType: 'solo', members: [] };
}

function groupTypeLabel(type) {
  return { solo: 'Seul(e)', binome: 'Binôme', quadrinome: 'Quadrinôme' }[type] || type;
}

function formatStudentGroupLabel(user) {
  if (!user || !user.name) return '';
  const group = normalizeStudentGroup(user);
  if (group.groupType === 'solo' || !group.members.length) return user.name;
  const names = [user.name, ...group.members.map((m) => m.name)];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

function formatStudentGroupShort(user) {
  const group = normalizeStudentGroup(user);
  if (group.groupType === 'solo' || !group.members.length) return '';
  if (group.groupType === 'binome') return `en binôme avec ${group.members[0].name}`;
  return `en quadrinôme avec ${group.members.map((m) => m.name).join(', ')}`;
}

// Enregistre les modifications du profil étudiant dans state.user
function saveProfile(){
  const u = etu();
  const name  = document.getElementById('profileName')?.value.trim();
  const spec  = document.getElementById('profileSpecialty')?.value.trim();
  const promo = document.getElementById('profilePromo')?.value.trim();
  const univ  = document.getElementById('profileUniversity')?.value.trim();
  const email = document.getElementById('profileEmail')?.value.trim();
  const encadrant = document.getElementById('profileEncadrant')?.value.trim();
  const theme = document.getElementById('profileTheme')?.value.trim();

  if(name)  { u.name      = name; state.user.name = name; }
  if(spec)  { u.specialty = spec; state.user.specialty = spec; }
  if(promo) { u.promo     = promo; state.user.promo = promo; }
  if(univ)  { u.university= univ; state.user.university = univ; }
  if(email) { u.email     = email; state.user.email = email; }
  if(encadrant) { u.encadrant = encadrant; state.user.encadrant = encadrant; }
  if(theme) { u.theme     = theme; state.user.theme = theme; }

  // Met à jour l'avatar et le nom dans la topbar
  document.getElementById('userNameDisplay').textContent = state.user.name;
  document.getElementById('avatarDisplay').textContent =
    state.user.avatar || state.user.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

  showToast('✅ Profil mis à jour');
  navigateTo('profil');
}

function addBinome(){
  const u = etu();
  if (!u) { showToast('⚠️ Connectez-vous avec votre compte étudiant'); return; }
  const name = (document.getElementById('binomeName').value||'').trim();
  const email = (document.getElementById('binomeEmail').value||'').trim();
  if(!name){ showToast('⚠️ Merci de renseigner le nom du binôme'); return; }
  const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'BN';
  u.binome = { name, email: email || '—', specialty: u.specialty, avatar: initials };
  u.groupType = 'binome';
  u.groupMembers = [u.binome];
  if (state.user) Object.assign(state.user, u);
  showToast(`✅ ${name} ajouté(e) comme binôme de stage`);
  refreshCurrentView();
}

function removeBinome(){
  const u = etu();
  if (!u) return;
  u.binome = null;
  u.groupType = 'solo';
  u.groupMembers = [];
  if (state.user) Object.assign(state.user, u);
  showToast('🗑️ Binôme retiré');
  refreshCurrentView();
}

function docRow(name,type,status,size){
  const ico={active:'📄',pending:'⏳',missing:'❌'};
  const safeName = name.replace(/'/g,"\\'");
  return `<div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
    <div class="flex items-center gap8"><span>${ico[status]}</span><div><div class="text-sm">${name}</div><div class="text-xs text-muted">${type} · ${size}</div></div></div>
    ${status==='active'?`<button class="btn btn-ghost btn-sm" onclick="downloadGenericDocument('${safeName}')">⬇</button>`:status==='pending'?`<span class="status-pill s-pending" style="font-size:10px">En attente</span>`:`<span class="text-xs text-muted">Non disponible</span>`}
  </div>`;
}

function progressRow(label,val){
  const c=val===100?'var(--success)':val===0?'var(--border)':'var(--cyan)';
  return `<div style="margin-bottom:12px">
    <div class="flex justify-between mb8"><span class="text-sm">${label}</span><span class="text-xs text-muted">${val}%</span></div>
    <div class="progress-wrap"><div class="progress-bar" style="width:${val}%;background:${c}"></div></div>
  </div>`;
}

// ──────────────────────────────────
// NOTATION DES ENTREPRISES PAR ÉTOILES
// ──────────────────────────────────
function starRatingHTML(companyId, currentValue, interactive){
  const stars = [1,2,3,4,5].map(i=>{
    const filled = i <= currentValue;
    return interactive
      ? `<span class="star-input ${filled?'filled':''}" onclick="rateCompany(${companyId},${i})" title="${i} étoile${i>1?'s':''}">★</span>`
      : `<span class="star-display ${filled?'filled':''}">★</span>`;
  }).join('');
  const label = currentValue
    ? `<span class="text-xs text-muted" style="margin-left:8px">Votre note : ${currentValue}/5</span>`
    : `<span class="text-xs text-muted" style="margin-left:8px">${interactive?'Cliquez pour noter':'Pas encore noté'}</span>`;
  return `<div class="star-rating">${stars}${label}</div>`;
}

function rateCompany(companyId, value){
  const studentName = etu().name;
  persistCompanyRating(companyId, studentName, value).then(()=>{
    showToast(`⭐ Merci ! Vous avez noté cette entreprise ${value}/5`);
    const widget = document.getElementById('companyRatingWidget');
    if(widget) widget.innerHTML = starRatingHTML(companyId, value, true);
    refreshCurrentView();
  });
}

function companyCardHTML(c){
  const logo = companyLogos[c.name];
  const logoHTML = logo ? `<div class="company-logo-img">${logo.svg}</div>` : `<div class="company-logo-img fallback" style="background:var(--navy);color:var(--cyan)">${c.name.slice(0,2).toUpperCase()}</div>`;
  const safeName = c.name.replace(/'/g, "\\'");
  const ratingInfo = c.studentRatingsCount
    ? `★ ${c.rating} <span class="text-muted">(${c.studentRatingsCount} avis étudiant${c.studentRatingsCount>1?'s':''})</span>`
    : `★ ${c.rating}`;
  return `<div class="company-card" onclick="openDemande(${c.id},'${safeName}')">
    ${logoHTML}
    <h4>${c.name}</h4>
    <div class="sector">📍 ${c.wilaya} · ${c.sector}</div>
    <div class="text-xs" style="color:var(--cyan2);font-weight:500;margin-bottom:6px">${c.domain||''}</div>
    <div class="flex items-center gap8 mb8">
      <span class="text-xs" style="color:var(--accent)">${ratingInfo}</span>
      <span class="text-xs text-muted">${c.offers} offre(s)</span>
    </div>
    <div class="tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
  </div>`;
}

function filterCompanies(){
  const q = (document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  const domain = document.getElementById('domainFilter')?.value || 'Tous les domaines';
  const wilaya = document.getElementById('wilayaFilter')?.value || 'Toutes les wilayas';
  const source = typeof getRegisteredCompanies === 'function' ? getRegisteredCompanies() : companies.filter(function(c) { return c.fromDb; });

  const filtered = source.filter(c=>{
    const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
      || (c.domain||'').toLowerCase().includes(q) || c.tags.some(t=>t.toLowerCase().includes(q));
    const matchesDomain = domain==='Tous les domaines' || c.domain===domain;
    const matchesWilaya = wilaya==='Toutes les wilayas' || c.wilaya===wilaya;
    return matchesQuery && matchesDomain && matchesWilaya;
  });

  const grid = document.getElementById('companyGrid');
  if(!grid) return;
  if (!source.length) {
    grid.innerHTML = typeof companiesSearchEmptyHTML === 'function' ? companiesSearchEmptyHTML() : '<div class="empty-state" style="grid-column:1/-1"><p>Aucune entreprise inscrite</p></div>';
    return;
  }
  grid.innerHTML = filtered.length
    ? filtered.map(c=>companyCardHTML(c)).join('')
    : `<div class="empty-state" style="grid-column:1/-1"><div class="ico">🔍</div><p>Aucun résultat pour ces critères</p></div>`;
}

function barChart(data){
  const max=Math.max(...data.map(d=>d.v));
  return `<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">${data.map(d=>`<div>
    <div class="flex justify-between mb4" style="margin-bottom:4px"><span class="text-xs">${d.l}</span><span class="text-xs text-muted">${d.v}%</span></div>
    <div class="progress-wrap"><div class="progress-bar" style="width:${d.v}%;background:${d.v===max?'var(--navy)':'var(--cyan)'}"></div></div>
  </div>`).join('')}</div>`;
}

function buildNotifList(){
  let list = notifications[state.role]||[];
  let dynamicNotifs = [];
  if (state.role === 'etudiant' && state.user && typeof buildStudentDashboardNotifs === 'function') {
    dynamicNotifs = buildStudentDashboardNotifs(state.user);
    list = [];
  } else if (state.role === 'entreprise' && state.user && typeof buildEntrepriseDashboardNotifs === 'function') {
    dynamicNotifs = buildEntrepriseDashboardNotifs();
    list = dynamicNotifs.length ? [] : (notifications.entreprise || []);
  } else if(state.role==='universite' && state.user && state.user.type!=='universite'){
    dynamicNotifs = (sharedData.universityNotifications||[])
      .filter(n=> n.faculte===state.user.faculte &&
        (state.user.type==='faculte' || n.departement===state.user.departement))
      .map(n=>({
        icon: n.conventionGenerated ? '📄' : '🔔',
        color: n.conventionGenerated ? '#D1FAE5' : '#FFF3CD',
        text: n.conventionGenerated
          ? `Convention créée automatiquement — ${n.studentLabel} × ${n.company}${n.conventionReference ? ' ('+n.conventionReference+')' : ''}`
          : `Nouvel accord : ${n.studentLabel} × ${n.company}`,
        time: 'Temps réel',
        read: n.conventionGenerated
      }));
  }
  const allNotifs = [...dynamicNotifs, ...list];
  // Met à jour le badge (point rouge) si notifications non lues
  const notifDot = document.querySelector('.notif-dot');
  if(notifDot) notifDot.style.display = allNotifs.some(n=>!n.read) ? 'block' : 'none';
  document.getElementById('notifList').innerHTML = allNotifs.length
    ? allNotifs.map(n=>`
        <div class="notif-item ${n.read?'':'notif-unread'}">
          <div class="notif-ico" style="background:${n.color}">${n.icon}</div>
          <div><p>${n.text}</p><div class="time">${n.time}</div></div>
        </div>`).join('')
    : `<div class="empty-state" style="padding:24px"><div class="ico">🔔</div><p>Aucune notification</p></div>`;
}

function openDemande(id,name){
  if (studentStageIsLocked()) {
    showToast('🔒 Convention signée — vous ne pouvez plus postuler à un autre stage');
    return;
  }
  const company = companies.find(function(c) { return Number(c.id) === Number(id); });
  if (!company || !company.fromDb) {
    showToast('⚠️ Entreprise indisponible — rechargez la liste depuis le menu Recherche');
    return;
  }
  state.currentCompanyId = company.id;
  state.currentCompanyName = company.name || name;
  const u = etu();
  document.getElementById('demandeModalTitle').textContent = `Postuler chez ${state.currentCompanyName}`;
  document.getElementById('demandeModalContent').innerHTML = `
    <div class="form-group"><label class="form-label">Thème proposé</label><input id="demandeTheme" class="form-input" value="${u.theme || ''}"></div>
    <div class="form-group"><label class="form-label">Durée souhaitée</label><input id="demandeDuree" class="form-input" value="${u.periode || '2 mois'}"></div>
    <div class="form-group"><label class="form-label">Message de motivation</label><textarea id="demandeMessage" class="form-textarea" placeholder="Vos motivations...">${buildLettreEnvoiCourte(u, name)}</textarea></div>
    <div class="sign-info-box">
      <span style="font-size:16px;flex-shrink:0">📝</span>
      <span>Une lettre d'envoi complète sera générée automatiquement à partir de votre profil (${formatStudentGroupLabel(u)}) et envoyée avec votre candidature.</span>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btn-ghost" onclick="closeOverlay('demandeModal')">Annuler</button>
      <button class="btn btn-cyan" onclick="submitDemande('${state.currentCompanyName.replace(/'/g, "\\'")}')">📩 Envoyer la candidature</button>
    </div>`;
  document.getElementById('demandeModal').classList.add('open');
}

// Génère une lettre d'envoi courte (aperçu dans le formulaire de candidature)
function buildLettreEnvoiCourte(u, companyName){
  return `Madame, Monsieur,\n\nJe suis ${u.name}${formatStudentGroupShort(u) ? ' (' + formatStudentGroupShort(u) + ')' : ''}, étudiant(e) en ${u.specialty||'spécialité non précisée'} à ${u.university||'mon université'}. Je sollicite un stage de fin d'études chez ${companyName} dans le cadre de mon PFE portant sur : « ${u.theme||'thème à préciser'} ».\n\nDans l'attente de votre retour favorable, je vous prie d'agréer mes salutations distinguées.`;
}

async function submitDemande(companyName){
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
        studentLabel: formatStudentGroupLabel(u),
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
    showToast(`📩 Candidature envoyée à ${companyName} — transmise immédiatement à l'entreprise`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Envoi impossible — vérifiez que le Backend tourne'));
  }
}

function annulerDemande(id){
  annulerDemandeById(id);
}

async function annulerDemandeById(id){
  const d = demandes.find(x=>x.id===id);
  if(!d){ showToast('⚠️ Demande introuvable'); return; }
  if(d.status !== 'pending'){
    showToast('ℹ️ Seules les demandes en attente peuvent être annulées');
    return;
  }
  const u = etu();
  if(!u || !u.name){
    showToast('⚠️ Connectez-vous en tant qu\'étudiant');
    return;
  }

  try {
    const data = await apiJson('/api/demandes/' + id + '/cancel', {
      method: 'PATCH',
      body: JSON.stringify({ studentName: u.name }),
    });
    mergeDemandeFromApi(id, data.demande);
    persistDemandeState(id);
    showToast(`🗑️ Demande à ${d.company} annulée — enregistrée en base`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Annulation impossible'));
  }
}

// Annule automatiquement toutes les demandes en attente une fois qu'un accord est trouvé
async function annulerAutresDemandes(){
  const u = etu();
  if(!u || !u.name){ showToast('⚠️ Connectez-vous en tant qu\'étudiant'); return; }
  const pendingOnes = (typeof getStudentDemandes === 'function' ? getStudentDemandes(u) : demandes.filter(d=>(d.studentName||'')===u.name))
    .filter(d=>d.status==='pending');
  if(!pendingOnes.length){ showToast('ℹ️ Aucune autre demande en attente'); return; }

  try {
    for (const d of pendingOnes) {
      const data = await apiJson('/api/demandes/' + d.id + '/cancel', {
        method: 'PATCH',
        body: JSON.stringify({ studentName: u.name }),
      });
      mergeDemandeFromApi(d.id, data.demande);
      persistDemandeState(d.id);
    }
    showToast(`🗑️ ${pendingOnes.length} demande(s) en attente annulée(s) — vous avez déjà un accord`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Annulation impossible'));
  }
}

function accepterDemande(n){
  // Lien réel : la demande étudiante en attente (Djezzy) côté entreprise/université
  const d = demandes.find(x=>x.status==='pending');
  if(d){
    d.status = 'accepted';
    persistDemandeState(d.id);
    // Notifie l'université (faculté/département de l'étudiant) du nouvel accord
    notifyUniversityOfAccord(d);
    showToast(`✅ Demande acceptée — visible côté étudiant et université`);
  } else {
    showToast(`✅ Demande de ${n} acceptée — convention en cours de génération`);
  }
  refreshCurrentView();
}

function escapeHtmlAttr(value) {
  return String(value || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Ouvre la modale pour désigner l'encadrant entreprise avant acceptation
function openAcceptDemandeModal(demandeId) {
  const d = demandes.find(x => x.id === demandeId);
  if (!d) { showToast('⚠️ Demande introuvable'); return; }
  if (d.status !== 'pending') { showToast('ℹ️ Cette demande a déjà été traitée'); return; }

  state.pendingAcceptDemandeId = demandeId;
  const defaultEnc = state.user?.encadrant_stage || state.user?.encadrant_ent || '';
  const modal = document.getElementById('childAccountModal');
  const title = document.getElementById('childAccountModalTitle');
  const content = document.getElementById('childAccountModalContent');
  if (!modal || !content) {
    accepterDemandeById(demandeId, defaultEnc);
    return;
  }

  if (title) title.textContent = '✅ Accepter la candidature';
  content.innerHTML = `
    <p class="text-sm text-muted mb16">Indiquez l'encadrant entreprise. Dès validation, la demande est acceptée et la convention est créée automatiquement.</p>
    <div style="background:var(--bg2);border-radius:var(--r2);padding:12px 14px;margin-bottom:14px">
      <div class="text-sm"><strong>${d.studentLabel || d.studentName || '—'}</strong></div>
      <div class="text-xs text-muted mt4">${d.theme || '—'}</div>
      ${d.duree ? `<div class="text-xs text-muted">Durée : ${d.duree}</div>` : ''}
    </div>
    <div class="form-group">
      <label class="form-label">Encadrant entreprise *</label>
      <input id="acceptDemandeEncadrant" class="form-input" value="${escapeHtmlAttr(defaultEnc)}" placeholder="Ex: M. Hamouchi — Directeur Marketing">
    </div>
    <p class="text-xs text-muted">Cet encadrant sera mentionné sur la convention de stage.</p>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn btn-ghost" onclick="closeOverlay('childAccountModal')">Annuler</button>
      <button class="btn btn-success" onclick="submitAcceptDemande()">✓ Accepter</button>
    </div>`;
  modal.classList.add('open');
  setTimeout(() => document.getElementById('acceptDemandeEncadrant')?.focus(), 100);
}

async function submitAcceptDemande() {
  const demandeId = state.pendingAcceptDemandeId;
  const encadrant = (document.getElementById('acceptDemandeEncadrant')?.value || '').trim();
  if (!demandeId) return;
  if (!encadrant) {
    showToast('⚠️ L\'encadrant entreprise est obligatoire pour accepter la demande');
    return;
  }
  closeOverlay('childAccountModal');
  state.pendingAcceptDemandeId = null;
  await accepterDemandeById(demandeId, encadrant);
}

// Accepte une demande précise par son id — enregistre en base + convention auto
async function accepterDemandeById(demandeId, encadrant){
  const d = demandes.find(x=>x.id===demandeId);
  if(!d){ showToast('⚠️ Demande introuvable'); return; }

  const entId = state.user && state.user.entrepriseId;
  if (!entId) {
    showToast('⚠️ Connectez-vous avec un compte entreprise');
    return;
  }

  const enc = (encadrant || '').trim();
  if (!enc) {
    openAcceptDemandeModal(demandeId);
    return;
  }

  try {
    const data = await apiJson('/api/demandes/' + demandeId + '/accept', {
      method: 'PATCH',
      body: JSON.stringify({
        entrepriseId: entId,
        encadrant: enc,
      }),
    });
    mergeDemandeFromApi(demandeId, data.demande);
    mergeConventionFromApi(data.convention);
    persistDemandeState(demandeId);
    await notifyUniversityOfAccord(data.demande, data.convention);
    const ref = data.convention && data.convention.reference ? data.convention.reference : '';
    showToast(ref
      ? `✅ Candidature acceptée — convention ${ref} créée automatiquement`
      : `✅ Candidature acceptée — ${data.demande.studentLabel||data.demande.studentName}`);
    refreshCurrentView();
    if (data.convention && data.convention.id) {
      setTimeout(() => openConventionById(data.convention.id), 400);
    }
  } catch (err) {
    showToast('❌ ' + (err.message || 'Acceptation impossible'));
  }
}

// Refuse une demande précise par son id — enregistre en base
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
    showToast(`❌ Demande de ${data.demande.studentLabel||data.demande.studentName} refusée — enregistrée en base`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Refus impossible'));
  }
}

// Notifie l'université lorsqu'un accord étudiant/entreprise est trouvé (convention déjà créée si apiConvention)
async function notifyUniversityOfAccord(demande, apiConvention){
  const studentName  = demande.studentName;
  const studentLabel = demande.studentLabel || studentName;
  const studentProfile = Object.values(registeredAccounts.etudiant).find(s=>s.name===studentName) || null;
  const conv = apiConvention || null;
  if (conv && typeof mergeConventionFromApi === 'function') {
    mergeConventionFromApi(conv);
  }
  const notif = {
    id: 'accord-'+demande.id+'-'+Date.now(),
    demandeId: demande.id,
    studentName,
    studentLabel,
    studentEmail: studentProfile?.email || '',
    studentSpecialty: studentProfile?.specialty || '',
    studentUniversity: studentProfile?.university || 'Université Abderrahmane Mira — Béjaïa',
    studentMatricule: studentProfile?.matricule || '',
    company: demande.company,
    theme: demande.theme,
    encadrantEntreprise: demande.encadrant || ent().encadrant_stage || '',
    faculte: demande.faculte || studentProfile?.faculte || 'Faculté SHS',
    departement: demande.departement || studentProfile?.dept || studentProfile?.departement || 'Département SIC',
    conventionGenerated: !!(conv && conv.id),
    generatedConventionId: conv && conv.id ? conv.id : null,
    conventionReference: conv && conv.reference ? conv.reference : null,
    read: !!(conv && conv.id),
  };
  sharedData.universityNotifications = sharedData.universityNotifications || [];
  sharedData.universityNotifications.push(notif);
  await persistSharedData();
}

// Génère la convention de stage suite à un accord — articles conformes au
// Décret exécutif n° 13-306 du 16 septembre 2013
async function genererConvention(notifId){
  const notif = (sharedData.universityNotifications||[]).find(n=>n.id===notifId);
  if(!notif){ showToast('⚠️ Notification introuvable'); return; }
  if(notif.conventionGenerated){ showToast('ℹ️ Convention déjà générée pour cet accord'); return; }

  const nextId = Math.max(...conventions.map(c=>c.id), ...(sharedData.generatedConventions||[]).map(c=>c.id), 0) + 1;
  const newConv = {
    id: nextId,
    etudiant: notif.studentLabel,
    studentEmail: notif.studentEmail || '',
    studentSpecialty: notif.studentSpecialty || '',
    studentUniversity: notif.studentUniversity || 'Université Abderrahmane Mira — Béjaïa',
    studentMatricule: notif.studentMatricule || '',
    company: notif.company,
    theme: notif.theme,
    encadrant_entreprise: notif.encadrantEntreprise || '',
    periode: 'À définir (Convention SF-2026-0' + (nextId+46) + ')',
    status: 'pending',
    signed_etudiant:false, signed_entreprise:false, signed_univ:false,
    faculte: notif.faculte, departement: notif.departement,
    legalBasis: "Décret exécutif n° 13-306 du 16 septembre 2013 fixant les conditions et modalités d'organisation des stages pratiques en milieu professionnel au profit des étudiants de l'enseignement supérieur"
  };

  conventions.push(newConv);
  sharedData.generatedConventions = sharedData.generatedConventions || [];
  sharedData.generatedConventions.push(JSON.parse(JSON.stringify(newConv)));
  notif.conventionGenerated = true;
  notif.read = true;
  notif.generatedConventionId = nextId;
  await persistSharedData();

  showToast(`📄 Convention SF-2026-0${nextId+46} générée — conforme au Décret exécutif n° 13-306 du 16/09/2013 — en attente de signatures`);
  refreshCurrentView();
}

function refuserDemande(n){
  const d = demandes.find(x=>x.status==='pending');
  if(d){
    d.status = 'rejected';
    persistDemandeState(d.id);
    showToast(`❌ Demande refusée — visible côté étudiant`);
  } else {
    showToast(`❌ Demande de ${n} refusée`);
  }
  refreshCurrentView();
}

function validerConvention(n){
  const conv = conventions.find(c=>c.etudiant===n);
  if(conv){
    conv.signed_univ = true;
    if(conv.signed_entreprise && conv.signed_univ) conv.status = 'signed';
    persistConventionState(conv.id);
  }
  showToast(`✅ Convention de ${n} validée par l'université — visible côté étudiant et entreprise`);
  refreshCurrentView();
}

function archiverConvention(n){
  const conv = conventions.find(c=>c.etudiant===n);
  if(conv){
    conv.status = 'archived';
    persistConventionState(conv.id);
  }
  showToast(`🗄️ Convention de ${n} archivée dans la GED — visible par toutes les parties`);
  refreshCurrentView();
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GÃ‰NÃ‰RATION PDF â€” helper partagÃ©
// Styles identiques Ã  l'aperÃ§u convention (html2pdf ne rÃ©sout pas les var CSS)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function conventionPdfStyles() {
  return `
.pdf-preview{background:#fff;padding:32px 40px;font-family:Georgia,serif;line-height:1.8;font-size:13px;color:#0B1E3D;box-sizing:border-box}
.pdf-header{text-align:center;margin-bottom:28px;border-bottom:2px double #000;padding-bottom:16px}
.pdf-header .uni-name{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
.pdf-header .doc-title{font-size:17px;font-weight:bold;margin:12px 0 4px}
.pdf-header .doc-ref{font-size:11px;color:#666;margin-top:6px}
.pdf-section{margin-bottom:18px}
.pdf-section h4{font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;background:#EBF0F8;padding:4px 8px;border-left:3px solid #0B1E3D}
.pdf-field{display:flex;gap:8px;margin-bottom:5px}
.pdf-field label{width:190px;flex-shrink:0;color:#555;font-size:12px}
.pdf-field .val{border-bottom:1px solid #999;flex:1;min-height:18px;color:#0B1E3D;font-weight:500;font-size:12px}
.pdf-sign-row{display:flex;justify-content:space-between;gap:40px;margin-top:28px}
.pdf-sign-row .sign-box-pdf{flex:0 0 42%}
.sign-box-pdf{border:1px solid #ccc;border-radius:6px;padding:12px;text-align:center}
.sign-box-pdf .role-lbl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:6px}
.sign-box-pdf .sign-name{font-size:11px;color:#333;margin-bottom:8px}
.sign-box-pdf .sign-result{min-height:56px;border:1px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;background:#fafafa;padding:4px;flex-direction:column;gap:4px}
.sign-box-pdf .sign-result.done{background:#f0fff8;border-color:#00C48C;color:#00C48C}
.sign-box-pdf .sign-date{font-size:10px;color:#888;margin-top:4px}
.cert-badge{display:inline-flex;align-items:center;gap:6px;background:#D1FAE5;border-radius:20px;padding:4px 12px;font-size:11px;color:#065F46;font-weight:500;margin-top:8px}`;
}

function isCanvasMostlyBlank(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const w = Math.min(100, canvas.width);
    const h = Math.min(100, canvas.height);
    if (w < 1 || h < 1) return true;
    const data = ctx.getImageData(0, 0, w, h).data;
    let white = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 248 && data[i + 1] > 248 && data[i + 2] > 248) white++;
    }
    return white / pixels > 0.97;
  } catch (e) {
    return false;
  }
}

function exportConventionPdfViaIframe(innerHtml, filename, title) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:794px;border:0;margin:0;padding:0;z-index:2147483647;background:#fff;';
  document.body.appendChild(iframe);

  const iwin = iframe.contentWindow;
  const idoc = iwin.document;
  idoc.open();
  idoc.write('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>' + (title || 'Convention') + '</title><style>' + conventionPdfStyles() + '</style></head><body style="margin:0;padding:0;background:#fff;"><div class="pdf-preview">' + innerHtml + '</div></body></html>');
  idoc.close();

  let done = false;
  const cleanup = function() {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  const fallback = function() {
    if (done) return;
    done = true;
    cleanup();
    printFallback(innerHtml, title, true);
  };

  const attempt = function() {
    if (done) return;
    const target = idoc.querySelector('.pdf-preview');
    if (!target || target.scrollHeight < 20) {
      fallback();
      return;
    }
    if (typeof html2pdf === 'undefined') {
      fallback();
      return;
    }
    const canvasOpts = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: target.scrollWidth || 794,
      height: target.scrollHeight,
      windowWidth: target.scrollWidth || 794,
      windowHeight: target.scrollHeight
    };
    const pdfOpts = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: canvasOpts,
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    const savePdf = function() {
      html2pdf().set(pdfOpts).from(target).save().then(function() {
        if (done) return;
        done = true;
        showToast('âœ… ' + filename + ' tÃ©lÃ©chargÃ©');
        cleanup();
      }).catch(function(err) {
        console.error('html2pdf error:', err);
        fallback();
      });
    };

    const h2c = (typeof html2canvas !== 'undefined') ? html2canvas : (iwin && iwin.html2canvas);
    if (h2c) {
      h2c(target, canvasOpts).then(function(canvas) {
        if (isCanvasMostlyBlank(canvas)) {
          console.warn('PDF canvas blank â€” fallback impression');
          fallback();
          return;
        }
        savePdf();
      }).catch(function() { savePdf(); });
    } else {
      savePdf();
    }
  };

  iframe.onload = function() { setTimeout(attempt, 200); };
  setTimeout(attempt, 500);
}

function generatePdfFromElement(innerHtml, filename, title, options){
  options = options || {};
  const isConvention = options.conventionPdf || (innerHtml && innerHtml.includes('pdf-header'));
  const runPrintFallback = function() { printFallback(innerHtml, title, isConvention); };

  if (!innerHtml || !String(innerHtml).trim()) {
    showToast('âš ï¸ Contenu PDF vide â€” ouvrez l\'aperÃ§u de la convention');
    return;
  }

  if (isConvention) {
    exportConventionPdfViaIframe(innerHtml, filename, title);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'sfPdfExportRoot';
  wrapper.className = 'pdf-preview';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = 'position:fixed;left:0;top:0;width:794px;max-width:794px;background:#fff;z-index:2147483646;padding:0;margin:0;overflow:visible;';
  wrapper.innerHTML = innerHtml;
  document.body.appendChild(wrapper);

  const cleanup = function() {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  };

  const exportPdf = function() {
    if (wrapper.offsetHeight < 20) {
      cleanup();
      runPrintFallback();
      return;
    }
    if (typeof html2pdf === 'undefined') {
      cleanup();
      runPrintFallback();
      return;
    }
    const opts = {
      margin: [8, 8, 8, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: 794,
        windowWidth: 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opts).from(wrapper).save().then(function() {
      showToast('âœ… ' + filename + ' tÃ©lÃ©chargÃ©');
      cleanup();
    }).catch(function(err) {
      console.error('html2pdf error:', err);
      cleanup();
      runPrintFallback();
    });
  };

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      setTimeout(exportPdf, 120);
    });
  });
}

function printFallback(innerHtml, title, isConvention){
  const styles = isConvention ? conventionPdfStyles() : `
      body{font-family:Georgia,serif;line-height:1.8;font-size:13px;color:#1b2a48;padding:32px 40px;margin:0}
      .pdf-header{text-align:center;margin-bottom:28px;border-bottom:2px double #000;padding-bottom:16px}
      .pdf-header .uni-name{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
      .pdf-header .doc-title{font-size:17px;font-weight:bold;margin:12px 0 4px}
      .pdf-header .doc-ref{font-size:11px;color:#666;margin-top:6px}
      .pdf-section{margin-bottom:18px}
      .pdf-section h4{font-size:12px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;background:#EBF0F8;padding:4px 8px;border-left:3px solid #0B1E3D}
      .pdf-field{display:flex;gap:8px;margin-bottom:5px}
      .pdf-field label{width:190px;flex-shrink:0;color:#555;font-size:12px}
      .pdf-field .val{border-bottom:1px solid #999;flex:1;min-height:18px;color:#0B1E3D;font-weight:500;font-size:12px}
      .pdf-sign-row{display:flex;justify-content:space-between;gap:40px;margin-top:28px}.pdf-sign-row .sign-box-pdf{flex:0 0 42%}
      .sign-box-pdf{border:1px solid #ccc;border-radius:6px;padding:12px;text-align:center}
      .sign-box-pdf .role-lbl{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#666;margin-bottom:6px}
      .sign-box-pdf .sign-name{font-size:11px;color:#333;margin-bottom:8px}
      .sign-box-pdf .sign-result{min-height:56px;border:1px dashed #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;background:#fafafa;padding:4px}
      .sign-box-pdf .sign-result.done{background:#f0fff8;border-color:#00C48C;color:#00C48C}
      .sign-box-pdf .sign-date{font-size:10px;color:#888;margin-top:4px}
      .cert-badge{display:inline-flex;align-items:center;gap:6px;background:#D1FAE5;border-radius:20px;padding:4px 12px;font-size:11px;color:#065F46;font-weight:500;margin-top:8px}
      @media print{ body{padding:16px 24px} }`;
  const bodyHtml = isConvention
    ? '<div class="pdf-preview">' + innerHtml + '</div>'
    : innerHtml;
  const win = window.open('', '_blank');
  if(!win){
    showToast('âš ï¸ Veuillez autoriser les fenÃªtres pop-up pour gÃ©nÃ©rer le PDF');
    return;
  }
  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>${title||'StageFlow'}</title>
    <style>${styles}</style></head><body>${bodyHtml}
    <scr` + `ipt>window.onload=function(){ setTimeout(function(){ window.print(); }, 300); };</scr` + `ipt>
    </body></html>`);
  win.document.close();
  showToast("ðŸ–¨ï¸ Choisissez \"Enregistrer en PDF\" dans la fenÃªtre d'impression");
}

async function downloadConvention(convId){
  convId = convId || state.openConventionId;
  if (!convId && state.role === 'etudiant' && typeof getStudentConvention === 'function' && state.user) {
    const sc = getStudentConvention(state.user);
    if (sc) convId = sc.id;
  }
  if (!convId) {
    showToast('âš ï¸ Aucune convention Ã  tÃ©lÃ©charger');
    return;
  }
  if (typeof loadConventionFromDb === 'function') {
    await loadConventionFromDb(convId);
  }
  const conv = conventions.find(c => c.id === convId);
  if (!conv) {
    showToast('âš ï¸ Convention introuvable');
    return;
  }
  const ref = conv.reference || ('SF-2026-0' + (conv.id + 46));
  const filename = `Convention-${ref}.pdf`;
  showToast('â³ GÃ©nÃ©ration du PDF en cours...');

  let innerHtml;
  if (typeof buildConventionPdfHtml === 'function') {
    const tmp = document.createElement('div');
    tmp.innerHTML = buildConventionPdfHtml(convId, true);
    innerHtml = tmp.querySelector('.pdf-preview') ? tmp.querySelector('.pdf-preview').innerHTML : tmp.innerHTML;
  } else {
    const preview = document.getElementById('conventionContent')?.querySelector('.pdf-preview');
    if (!preview) {
      showToast('âš ï¸ Ouvrez d\'abord l\'aperÃ§u de la convention');
      return;
    }
    innerHtml = preview.innerHTML;
  }
  if (!innerHtml || innerHtml.trim().length < 50) {
    showToast('âš ï¸ Impossible de gÃ©nÃ©rer la convention â€” rÃ©essayez aprÃ¨s l\'aperÃ§u');
    return;
  }
  generatePdfFromElement(innerHtml, filename, filename, { conventionPdf: true });
}

// Génère et télécharge le PDF d'une convention archivée (depuis la liste des archives)
function downloadArchivedConvention(convId){
  const conv = conventions.find(c=>c.id===convId);
  if(!conv){ showToast('⚠️ Convention introuvable'); return; }
  const sigCount = [conv.signed_entreprise,conv.signed_univ].filter(Boolean).length;
  const innerHtml = `
    <div class="pdf-header">
      <div class="uni-name">République Algérienne Démocratique et Populaire<br>Ministère de l'Enseignement Supérieur et de la Recherche Scientifique</div>
      <div style="margin-top:8px;font-size:11px;color:#555">${conv.faculte||'Université Abderrahmane Mira — Béjaïa'} · ${conv.departement||''}</div>
      <div class="doc-title">CONVENTION DE STAGE DE FIN D'ÉTUDES (PFE)</div>
      <div style="font-size:10px;color:#777;margin-top:4px">Conforme au Décret exécutif n° 13-306 du 16 septembre 2013</div>
      <div class="doc-ref">Réf. : <strong>SF-2026-0${conv.id+46}</strong> · Année universitaire 2025-2026 · Archivée</div>
    </div>
    <div class="pdf-section">
      <h4>Article 1 — Les parties</h4>
      <div class="pdf-field"><label>Étudiant(e) :</label><div class="val">${conv.etudiant}</div></div>
      <div class="pdf-field"><label>Entreprise d'accueil :</label><div class="val">${conv.company}</div></div>
      <div class="pdf-field"><label>Faculté / Département :</label><div class="val">${conv.faculte||'—'} / ${conv.departement||'—'}</div></div>
    </div>
    <div class="pdf-section">
      <h4>Article 2 — Objet et durée du stage</h4>
      <div class="pdf-field"><label>Thème du PFE :</label><div class="val">${conv.theme}</div></div>
      <div class="pdf-field"><label>Période :</label><div class="val">${conv.periode}</div></div>
    </div>
    <div class="pdf-section">
      <h4>Article 3 — État des signatures</h4>
      <div class="pdf-field"><label>Entreprise :</label><div class="val">${conv.signed_entreprise?'✅ Signée':'⏳ Non signée'}</div></div>
      <div class="pdf-field"><label>Université — Doyenne (Chef de doyennat) :</label><div class="val">${conv.signed_univ?'✅ Signée':'⏳ Non signée'}</div></div>
    </div>
    <div style="text-align:center;margin-top:16px"><span class="cert-badge">🔒 ${sigCount}/2 signature(s) certifiée(s) · SHA-256 · Statut : ${conv.status}</span></div>`;

  const filename = `Convention-SF-2026-0${conv.id+46}-${conv.etudiant.replace(/\s+/g,'-')}.pdf`;
  showToast('⏳ Génération du PDF en cours...');
  generatePdfFromElement(innerHtml, filename, filename);
}

// Télécharge un PDF simple pour un document du dossier (CV, attestation, etc.)
function downloadGenericDocument(name){
  const u = etuOrEmpty();
  const innerHtml = `
    <div class="pdf-header">
      <div class="uni-name">StageFlow — Dossier étudiant</div>
      <div class="doc-title">${name}</div>
      <div class="doc-ref">Document généré le ${new Date().toLocaleDateString('fr-DZ')}</div>
    </div>
    <div class="pdf-section">
      <h4>Informations</h4>
      <div class="pdf-field"><label>Étudiant(e) :</label><div class="val">${u.name}</div></div>
      <div class="pdf-field"><label>Spécialité :</label><div class="val">${u.specialty}</div></div>
      <div class="pdf-field"><label>Université :</label><div class="val">${u.university}</div></div>
      <div class="pdf-field"><label>Document :</label><div class="val">${name}</div></div>
    </div>
    <div class="pdf-section">
      <p style="font-size:12px;color:#444;line-height:1.7">Ce document fait partie du dossier de stage PFE de ${u.name}, géré via la plateforme StageFlow.</p>
    </div>`;

  const filename = `${name.replace(/[^a-zA-Z0-9À-ÿ\s-]/g,'').replace(/\s+/g,'-')}.pdf`;
  showToast('⏳ Génération du PDF en cours...');
  generatePdfFromElement(innerHtml, filename, filename);
}

function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }

// ──────────────────────────────────
// RAPPORT DE STAGE (fin de période)
// ──────────────────────────────────
function parseStageDurationMonths(text) {
  const t = String(text || '').toLowerCase();
  const match = t.match(/(\d+)\s*mois/);
  if (match) return parseInt(match[1], 10);
  return 2;
}

function formatStageDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) { return iso; }
}

function isStagePeriodEnded(conv) {
  if (!conv) return false;
  if (!conv.signed_entreprise || !conv.signed_univ) return false;
  if (conv.dateFin || conv.date_fin) {
    const fin = conv.dateFin || conv.date_fin;
    const end = new Date(String(fin).slice(0, 10) + 'T23:59:59');
    return new Date() >= end;
  }
  const months = parseStageDurationMonths(conv.periode || conv.duree || '2 mois');
  const startRaw = conv.dateDebut || conv.date_debut;
  if (startRaw) {
    const start = new Date(String(startRaw).slice(0, 10) + 'T12:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    return new Date() >= end;
  }
  return false;
}

function getStudentStageReport(conv) {
  if (!conv || !conv.id) return null;
  return state.stageReports && state.stageReports[conv.id] ? state.stageReports[conv.id] : null;
}

function openSubmitRapportModal(convId) {
  const conv = conventions.find(c => c.id === convId);
  const u = etu();
  if (!conv || !u) { showToast('⚠️ Convention introuvable'); return; }
  if (!isStagePeriodEnded(conv)) {
    const fin = conv.dateFin || conv.date_fin;
    showToast(fin ? `⏳ Dépôt possible à partir du ${formatStageDate(fin)}` : '⏳ Le stage n\'est pas encore terminé');
    return;
  }
  if (getStudentStageReport(conv)) {
    showToast('ℹ️ Rapport déjà déposé pour ce stage');
    return;
  }

  state.pendingRapportConvId = convId;
  const modal = document.getElementById('demandeModal');
  const title = document.getElementById('demandeModalTitle');
  const content = document.getElementById('demandeModalContent');
  if (title) title.textContent = '📝 Déposer mon rapport de stage';
  content.innerHTML = `
    <p class="text-sm text-muted mb12">Stage chez <strong>${conv.company}</strong> — convention ${conv.reference || ('SF-2026-0' + (conv.id + 46))}</p>
    <div class="form-group"><label class="form-label">Titre du rapport *</label><input id="rapportTitle" class="form-input" value="${(u.theme || 'Rapport de stage PFE').replace(/"/g, '&quot;')}"></div>
    <div class="form-group"><label class="form-label">Résumé (optionnel)</label><input id="rapportSummary" class="form-input" placeholder="Synthèse en une phrase"></div>
    <div class="form-group"><label class="form-label">Contenu du rapport *</label><textarea id="rapportContent" class="form-textarea" rows="10" placeholder="Introduction, missions réalisées, compétences acquises, conclusion…"></textarea></div>
    <div class="form-group"><label class="form-label">Nom du fichier PDF (optionnel)</label><input id="rapportFileName" class="form-input" placeholder="Ex: rapport_pfe_benali.pdf"></div>
    <p class="text-xs text-muted">Le rapport sera transmis à l'entreprise <strong>${conv.company}</strong> et archivé dans votre dossier.</p>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button class="btn btn-ghost" onclick="closeOverlay('demandeModal')">Annuler</button>
      <button class="btn btn-cyan" onclick="submitStageReport()">📤 Déposer le rapport</button>
    </div>`;
  modal.classList.add('open');
}

async function submitStageReport() {
  const convId = state.pendingRapportConvId;
  const u = etu();
  if (!convId || !u) return;

  const title = (document.getElementById('rapportTitle')?.value || '').trim();
  const summary = (document.getElementById('rapportSummary')?.value || '').trim();
  const content = (document.getElementById('rapportContent')?.value || '').trim();
  const fileName = (document.getElementById('rapportFileName')?.value || '').trim();

  if (!title || !content) {
    showToast('⚠️ Titre et contenu du rapport obligatoires');
    return;
  }
  if (content.length < 100) {
    showToast('⚠️ Le rapport doit contenir au minimum 100 caractères');
    return;
  }

  try {
    const data = await apiJson('/api/rapports/' + convId, {
      method: 'POST',
      body: JSON.stringify({
        studentName: u.name,
        studentId: u.id || null,
        title,
        summary,
        content,
        fileName,
      }),
    });
    state.stageReports[convId] = data.report;
    if (data.report && typeof mergeConventionFromApi === 'function') {
      const conv = conventions.find(c => c.id === convId);
      if (conv) conv.status = 'archived';
    }
    closeOverlay('demandeModal');
    state.pendingRapportConvId = null;
    showToast('✅ Rapport déposé — visible par ' + (data.report.entrepriseNom || 'l\'entreprise'));
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Dépôt impossible'));
  }
}

function openRapportViewModal(report) {
  if (!report) return;
  state.pendingRapportView = report;
  const modal = document.getElementById('demandeModal');
  const title = document.getElementById('demandeModalTitle');
  const content = document.getElementById('demandeModalContent');
  if (title) title.textContent = '📝 Rapport de stage — ' + report.studentName;
  const safeContent = String(report.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  content.innerHTML = `
    <div class="text-xs text-muted mb12">${report.entrepriseNom || '—'} · Déposé le ${formatStageDate(report.submittedAt)}</div>
    <div class="form-group"><label class="form-label">Titre</label><div class="form-input" style="background:var(--bg2)">${report.title}</div></div>
    ${report.summary ? `<div class="form-group"><label class="form-label">Résumé</label><div class="form-input" style="background:var(--bg2)">${report.summary}</div></div>` : ''}
    <div class="form-group"><label class="form-label">Contenu</label><div class="form-textarea" style="background:var(--bg2);min-height:200px;white-space:pre-wrap">${safeContent}</div></div>
    ${report.fileName ? `<p class="text-xs text-muted">Fichier associé : ${report.fileName}</p>` : ''}
    <div style="display:flex;justify-content:flex-end;margin-top:12px">
      <button class="btn btn-ghost" onclick="closeOverlay('demandeModal')">Fermer</button>
    </div>`;
  modal.classList.add('open');
}

function openRapportViewById(reportId) {
  const report = (state.entrepriseRapports || []).find(r => r.id === reportId)
    || Object.values(state.stageReports || {}).find(r => r.id === reportId);
  openRapportViewModal(report);
}

function openRapportViewByConv(convId) {
  openRapportViewModal(getStudentStageReport({ id: convId }));
}

// ──────────────────────────────────
// ATTESTATION DE STAGE (modèle pré-rempli)
// ──────────────────────────────────
function buildAttestationTemplateLocal(conv, u) {
  const cached = state.stageAttestationTemplates && state.stageAttestationTemplates[conv.id];
  if (cached) return cached;
  return {
    studentName: u.name || conv.etudiant,
    matricule: u.matricule || conv.studentMatricule || '',
    specialty: u.specialty || conv.studentSpecialty || conv.departement || '',
    university: u.university || conv.studentUniversity || 'Université Abderrahmane Mira — Béjaïa',
    faculte: conv.faculte || u.faculte || '',
    departement: conv.departement || u.departement || '',
    promotion: u.promo || conv.studentPromotion || '',
    encadrantUniversitaire: u.encadrant || conv.studentEncadrant || '',
    theme: conv.theme || u.theme || '',
    periode: conv.periode || '',
    dateDebut: conv.dateDebut || conv.date_debut || null,
    dateFin: conv.dateFin || conv.date_fin || null,
    conventionRef: conv.reference || ('SF-2026-0' + (conv.id + 46)),
    entrepriseNom: conv.company || conv.entreprise_nom || '',
    entrepriseAdresse: conv.entrepriseAdresse || '',
    encadrantEntreprise: conv.encadrant_entreprise || '—',
  };
}

function getStudentStageAttestation(conv) {
  if (!conv || !conv.id) return null;
  return state.stageAttestations && state.stageAttestations[conv.id] ? state.stageAttestations[conv.id] : null;
}

function attestationPrefilledFieldsHtml(t) {
  const esc = (v) => String(v || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <div class="grid-2 gap12 mb12">
      <div class="form-group"><label class="form-label">Étudiant(e)</label><div class="form-input" style="background:var(--bg2)">${esc(t.studentName)}</div></div>
      <div class="form-group"><label class="form-label">Matricule</label><div class="form-input" style="background:var(--bg2)">${esc(t.matricule)}</div></div>
      <div class="form-group"><label class="form-label">Spécialité</label><div class="form-input" style="background:var(--bg2)">${esc(t.specialty)}</div></div>
      <div class="form-group"><label class="form-label">Promotion</label><div class="form-input" style="background:var(--bg2)">${esc(t.promotion)}</div></div>
      <div class="form-group"><label class="form-label">Université</label><div class="form-input" style="background:var(--bg2)">${esc(t.university)}</div></div>
      <div class="form-group"><label class="form-label">Faculté / Département</label><div class="form-input" style="background:var(--bg2)">${esc(t.faculte)} · ${esc(t.departement)}</div></div>
      <div class="form-group"><label class="form-label">Entreprise d'accueil</label><div class="form-input" style="background:var(--bg2)">${esc(t.entrepriseNom)}</div></div>
      <div class="form-group"><label class="form-label">Encadrant entreprise</label><div class="form-input" style="background:var(--bg2)">${esc(t.encadrantEntreprise)}</div></div>
      <div class="form-group"><label class="form-label">Encadrant universitaire</label><div class="form-input" style="background:var(--bg2)">${esc(t.encadrantUniversitaire)}</div></div>
      <div class="form-group"><label class="form-label">Thème du stage</label><div class="form-input" style="background:var(--bg2)">${esc(t.theme)}</div></div>
      <div class="form-group"><label class="form-label">Période</label><div class="form-input" style="background:var(--bg2)">${esc(t.periode)}${t.dateDebut ? ' · Du ' + formatStageDate(t.dateDebut) : ''}${t.dateFin ? ' au ' + formatStageDate(t.dateFin) : ''}</div></div>
      <div class="form-group"><label class="form-label">Réf. convention</label><div class="form-input" style="background:var(--bg2)">${esc(t.conventionRef)}</div></div>
    </div>`;
}

function buildAttestationPdfHtml(att, template) {
  const t = template || att.prefilled || {};
  const esc = (v) => String(v || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const missions = att ? att.missions : '';
  const competences = att ? att.competences : '';
  const commentaire = att ? att.commentaire : '';
  return `
    <div class="pdf-header">
      <div class="uni-name">${esc(t.university)}</div>
      <div class="doc-title">Attestation de stage</div>
      <div class="doc-ref">${esc(t.conventionRef)} · ${new Date().toLocaleDateString('fr-DZ')}</div>
    </div>
    <div class="pdf-section">
      <h4>Identité du stagiaire</h4>
      <div class="pdf-field"><label>Nom et prénom :</label><div class="val">${esc(t.studentName)}</div></div>
      <div class="pdf-field"><label>Matricule :</label><div class="val">${esc(t.matricule)}</div></div>
      <div class="pdf-field"><label>Spécialité :</label><div class="val">${esc(t.specialty)}</div></div>
      <div class="pdf-field"><label>Faculté / Département :</label><div class="val">${esc(t.faculte)} · ${esc(t.departement)}</div></div>
      <div class="pdf-field"><label>Encadrant universitaire :</label><div class="val">${esc(t.encadrantUniversitaire)}</div></div>
    </div>
    <div class="pdf-section">
      <h4>Stage en entreprise</h4>
      <div class="pdf-field"><label>Organisme d'accueil :</label><div class="val">${esc(t.entrepriseNom)}</div></div>
      <div class="pdf-field"><label>Encadrant entreprise :</label><div class="val">${esc(t.encadrantEntreprise)}</div></div>
      <div class="pdf-field"><label>Thème :</label><div class="val">${esc(t.theme)}</div></div>
      <div class="pdf-field"><label>Période :</label><div class="val">${esc(t.periode)}${t.dateDebut ? ' — du ' + formatStageDate(t.dateDebut) : ''}${t.dateFin ? ' au ' + formatStageDate(t.dateFin) : ''}</div></div>
    </div>
    <div class="pdf-section">
      <h4>Missions réalisées</h4>
      <p style="font-size:12px;color:#444;line-height:1.7;white-space:pre-wrap">${esc(missions || '—')}</p>
    </div>
    <div class="pdf-section">
      <h4>Compétences acquises</h4>
      <p style="font-size:12px;color:#444;line-height:1.7;white-space:pre-wrap">${esc(competences || '—')}</p>
    </div>
    ${commentaire ? `<div class="pdf-section"><h4>Commentaire du stagiaire</h4><p style="font-size:12px;color:#444;line-height:1.7;white-space:pre-wrap">${esc(commentaire)}</p></div>` : ''}
    <div class="pdf-section" style="margin-top:24px">
      <div class="pdf-field"><label>Fait à Béjaïa, le :</label><div class="val">${new Date().toLocaleDateString('fr-FR')}</div></div>
      <div class="pdf-field"><label>Signature du stagiaire :</label><div class="val">_________________________</div></div>
      <div class="pdf-field"><label>Cachet et signature entreprise :</label><div class="val">_________________________</div></div>
    </div>`;
}

function openAttestationPreviewModal(convId) {
  const conv = conventions.find(c => c.id === convId);
  const u = etu();
  if (!conv || !u) { showToast('⚠️ Convention introuvable'); return; }
  if (!conv.signed_entreprise || !conv.signed_univ) {
    showToast('⏳ Attestation disponible après signature de la convention');
    return;
  }
  const t = buildAttestationTemplateLocal(conv, u);
  const modal = document.getElementById('demandeModal');
  const title = document.getElementById('demandeModalTitle');
  const content = document.getElementById('demandeModalContent');
  if (title) title.textContent = '📋 Attestation de stage — modèle pré-rempli';
  content.innerHTML = `
    <p class="text-sm text-muted mb12">Les champs ci-dessous sont pré-remplis depuis votre convention. Complétez et envoyez à la fin du stage.</p>
    ${attestationPrefilledFieldsHtml(t)}
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="closeOverlay('demandeModal')">Fermer</button>
      <button class="btn btn-ghost" onclick="downloadAttestationTemplatePdf(${convId})">⬇ Télécharger le modèle</button>
      ${isStagePeriodEnded(conv) && !getStudentStageAttestation(conv) ? `<button class="btn btn-cyan" onclick="openSubmitAttestationModal(${convId})">✏️ Compléter et envoyer</button>` : ''}
    </div>`;
  modal.classList.add('open');
}

function openSubmitAttestationModal(convId) {
  const conv = conventions.find(c => c.id === convId);
  const u = etu();
  if (!conv || !u) { showToast('⚠️ Convention introuvable'); return; }
  if (!isStagePeriodEnded(conv)) {
    const fin = conv.dateFin || conv.date_fin;
    showToast(fin ? `⏳ Envoi possible à partir du ${formatStageDate(fin)}` : '⏳ Le stage n\'est pas encore terminé');
    return;
  }
  if (getStudentStageAttestation(conv)) {
    showToast('ℹ️ Attestation déjà envoyée pour ce stage');
    return;
  }
  state.pendingAttestationConvId = convId;
  const t = buildAttestationTemplateLocal(conv, u);
  const modal = document.getElementById('demandeModal');
  const title = document.getElementById('demandeModalTitle');
  const content = document.getElementById('demandeModalContent');
  if (title) title.textContent = '📋 Compléter mon attestation de stage';
  content.innerHTML = `
    <p class="text-sm text-muted mb12">Stage chez <strong>${conv.company}</strong> — les informations administratives sont déjà pré-remplies.</p>
    ${attestationPrefilledFieldsHtml(t)}
    <div class="form-group"><label class="form-label">Missions réalisées *</label><textarea id="attestationMissions" class="form-textarea" rows="5" placeholder="Décrivez les principales missions confiées et réalisées durant le stage…"></textarea></div>
    <div class="form-group"><label class="form-label">Compétences acquises *</label><textarea id="attestationCompetences" class="form-textarea" rows="4" placeholder="Techniques, méthodologiques, relationnelles…"></textarea></div>
    <div class="form-group"><label class="form-label">Commentaire (optionnel)</label><textarea id="attestationCommentaire" class="form-textarea" rows="2" placeholder="Appréciation globale du stage"></textarea></div>
    <p class="text-xs text-muted">L'attestation sera transmise à <strong>${conv.company}</strong> et téléchargeable en PDF.</p>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button class="btn btn-ghost" onclick="closeOverlay('demandeModal')">Annuler</button>
      <button class="btn btn-cyan" onclick="submitStageAttestation()">📤 Envoyer à l'entreprise</button>
    </div>`;
  modal.classList.add('open');
}

async function submitStageAttestation() {
  const convId = state.pendingAttestationConvId;
  const u = etu();
  if (!convId || !u) return;

  const missions = (document.getElementById('attestationMissions')?.value || '').trim();
  const competences = (document.getElementById('attestationCompetences')?.value || '').trim();
  const commentaire = (document.getElementById('attestationCommentaire')?.value || '').trim();

  if (!missions || !competences) {
    showToast('⚠️ Missions et compétences sont obligatoires');
    return;
  }
  if (missions.length < 50) {
    showToast('⚠️ Décrivez les missions réalisées (minimum 50 caractères)');
    return;
  }
  if (competences.length < 30) {
    showToast('⚠️ Décrivez les compétences acquises (minimum 30 caractères)');
    return;
  }

  try {
    const data = await apiJson('/api/attestations/' + convId, {
      method: 'POST',
      body: JSON.stringify({
        studentName: u.name,
        studentId: u.id || null,
        missions,
        competences,
        commentaire,
      }),
    });
    state.stageAttestations[convId] = data.attestation;
    closeOverlay('demandeModal');
    state.pendingAttestationConvId = null;
    showToast('✅ Attestation envoyée — ' + (data.attestation.entrepriseNom || 'entreprise'));
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Envoi impossible'));
  }
}

function openAttestationViewModal(att) {
  if (!att) return;
  const t = att.prefilled || {};
  const modal = document.getElementById('demandeModal');
  const title = document.getElementById('demandeModalTitle');
  const content = document.getElementById('demandeModalContent');
  if (title) title.textContent = '📋 Attestation de stage — ' + att.studentName;
  const safeMissions = String(att.missions || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeComp = String(att.competences || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  content.innerHTML = `
    <div class="text-xs text-muted mb12">${att.entrepriseNom || '—'} · Envoyée le ${formatStageDate(att.submittedAt)}</div>
    ${attestationPrefilledFieldsHtml(t)}
    <div class="form-group"><label class="form-label">Missions réalisées</label><div class="form-textarea" style="background:var(--bg2);min-height:120px;white-space:pre-wrap">${safeMissions}</div></div>
    <div class="form-group"><label class="form-label">Compétences acquises</label><div class="form-textarea" style="background:var(--bg2);min-height:80px;white-space:pre-wrap">${safeComp}</div></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="closeOverlay('demandeModal')">Fermer</button>
      <button class="btn btn-cyan" onclick="downloadAttestationPdfByConv(${att.conventionId})">⬇ Télécharger PDF</button>
    </div>`;
  modal.classList.add('open');
}

function openAttestationViewById(attId) {
  const att = (state.entrepriseAttestations || []).find(a => a.id === attId)
    || Object.values(state.stageAttestations || {}).find(a => a.id === attId);
  openAttestationViewModal(att);
}

function openAttestationViewByConv(convId) {
  openAttestationViewModal(getStudentStageAttestation({ id: convId }));
}

function downloadAttestationPdfByConv(convId) {
  const att = getStudentStageAttestation({ id: convId })
    || (state.entrepriseAttestations || []).find(a => a.conventionId === convId);
  if (!att) { showToast('⚠️ Attestation introuvable'); return; }
  const t = att.prefilled || {};
  const slug = (att.studentName || 'stagiaire').replace(/\s+/g, '-');
  const filename = `Attestation-stage-${slug}.pdf`;
  showToast('⏳ Génération du PDF en cours...');
  generatePdfFromElement(buildAttestationPdfHtml(att, t), filename, filename);
}

function downloadAttestationTemplatePdf(convId) {
  const conv = conventions.find(c => c.id === convId);
  const u = etuOrEmpty();
  if (!conv) { showToast('⚠️ Convention introuvable'); return; }
  const t = buildAttestationTemplateLocal(conv, u);
  const draft = { missions: '(À compléter par le stagiaire)', competences: '(À compléter par le stagiaire)', commentaire: '' };
  const filename = `Modele-attestation-${(t.studentName || 'stage').replace(/\s+/g, '-')}.pdf`;
  showToast('⏳ Génération du PDF en cours...');
  generatePdfFromElement(buildAttestationPdfHtml(draft, t), filename, filename);
}

function openAbout(){ document.getElementById('aboutModal').classList.add('open'); }
