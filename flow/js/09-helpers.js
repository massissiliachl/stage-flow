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
  const theme = document.getElementById('profileTheme')?.value.trim();

  if(name)  { u.name      = name; state.user.name = name; }
  if(spec)  { u.specialty = spec; state.user.specialty = spec; }
  if(promo) { u.promo     = promo; state.user.promo = promo; }
  if(univ)  { u.university= univ; state.user.university = univ; }
  if(email) { u.email     = email; state.user.email = email; }
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

  const filtered = companies.filter(c=>{
    const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
      || (c.domain||'').toLowerCase().includes(q) || c.tags.some(t=>t.toLowerCase().includes(q));
    const matchesDomain = domain==='Tous les domaines' || c.domain===domain;
    const matchesWilaya = wilaya==='Toutes les wilayas' || c.wilaya===wilaya;
    return matchesQuery && matchesDomain && matchesWilaya;
  });

  const grid = document.getElementById('companyGrid');
  if(!grid) return;
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
  const list = notifications[state.role]||[];
  // Pour les comptes université (faculté/département), ajouter les notifications d'accord dynamiques
  let dynamicNotifs = [];
  if(state.role==='universite' && state.user && state.user.type!=='universite'){
    dynamicNotifs = (sharedData.universityNotifications||[])
      .filter(n=> n.faculte===state.user.faculte &&
        (state.user.type==='faculte' || n.departement===state.user.departement))
      .map(n=>({
        icon: n.conventionGenerated ? '📄' : '🔔',
        color: n.conventionGenerated ? '#D1FAE5' : '#FFF3CD',
        text: n.conventionGenerated
          ? `Convention générée — ${n.studentLabel} × ${n.company} (SF-2026-0${(n.generatedConventionId||0)+46})`
          : `Nouvel accord : ${n.studentLabel} × ${n.company} — cliquez pour générer la convention`,
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
  state.currentCompanyId = id;
  state.currentCompanyName = name;
  const u = etu();
  document.getElementById('demandeModalTitle').textContent = `Postuler chez ${name}`;
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
      <button class="btn btn-cyan" onclick="submitDemande('${name}')">📩 Envoyer la candidature</button>
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
    showToast(`📩 Candidature envoyée à ${companyName} — enregistrée en base, réponse sous 48h`);
    refreshCurrentView();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Envoi impossible — vérifiez que le Backend tourne'));
  }
}

function annulerDemande(id){
  const d = demandes.find(x=>x.id===id);
  if(!d){ showToast('🗑️ Demande annulée'); return; }
  d.status = 'cancelled';
  persistDemandeState(id);
  showToast(`🗑️ Demande à ${d.company} annulée`);
  refreshCurrentView();
}

// Annule automatiquement toutes les demandes en attente une fois qu'un accord est trouvé
function annulerAutresDemandes(){
  const pendingOnes = demandes.filter(d=>d.status==='pending');
  if(!pendingOnes.length){ showToast('ℹ️ Aucune autre demande en attente'); return; }
  pendingOnes.forEach(d=>{
    d.status = 'cancelled';
    persistDemandeState(d.id);
  });
  showToast(`🗑️ ${pendingOnes.length} demande(s) en attente annulée(s) — vous avez déjà un accord`);
  refreshCurrentView();
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

// Accepte une demande précise par son id — enregistre en base + convention auto
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
      ? `✅ Demande acceptée — convention ${ref} créée en base`
      : `✅ Accord avec ${data.demande.studentLabel||data.demande.studentName}`);
    refreshCurrentView();
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

// Crée une notification côté université lorsqu'un accord étudiant/entreprise est trouvé
async function notifyUniversityOfAccord(demande){
  // Utilise les données de l'étudiant propriétaire de la demande (et non le compte connecté,
  // car cette fonction est appelée depuis le contexte "entreprise")
  const studentName  = demande.studentName;
  const studentLabel = demande.studentLabel || studentName;
  const studentProfile = Object.values(registeredAccounts.etudiant).find(s=>s.name===studentName) || null;
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
    faculte: 'Faculté SHS',
    departement: 'Département SIC',
    conventionGenerated: false,
    read: false
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
function openAbout(){ document.getElementById('aboutModal').classList.add('open'); }
