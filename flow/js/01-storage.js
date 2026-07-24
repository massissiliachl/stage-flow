// ══════════════════════════════════
// STOCKAGE PARTAGÉ — liaison réelle entre comptes
// Utilise window.storage (Artifacts, partagé multi-appareils) avec
// repli automatique sur localStorage (partagé entre onglets du même navigateur)
// ══════════════════════════════════
const SHARED_KEY = 'stageflow_shared_v1';
const hasCloudStorage = (typeof window!=='undefined' && window.storage && typeof window.storage.get==='function');

async function sharedLoad(){
  if(hasCloudStorage){
    try{
      const res = await window.storage.get(SHARED_KEY, true);
      return res && res.value ? JSON.parse(res.value) : null;
    }catch(e){ return null; }
  }
  try{
    const raw = localStorage.getItem(SHARED_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

async function sharedSave(data){
  const json = JSON.stringify(data);
  if(hasCloudStorage){
    try{ await window.storage.set(SHARED_KEY, json, true); return; }catch(e){ /* fallthrough */ }
  }
  try{ localStorage.setItem(SHARED_KEY, json); }catch(e){ /* stockage indisponible */ }
}

// ──────────────────────────────────
// PRÉFÉRENCES PERSONNELLES (ex: langue) — stockage non partagé
// Utilise window.storage (base de données des Artifacts) en priorité ;
// localStorage uniquement en dernier recours si window.storage est indisponible
// ──────────────────────────────────
const PREFS_KEY = 'stageflow_prefs_v1';

async function prefsLoad(){
  if(hasCloudStorage){
    try{
      const res = await window.storage.get(PREFS_KEY, false);
      return res && res.value ? JSON.parse(res.value) : {};
    }catch(e){ return {}; }
  }
  try{
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}

async function prefsSave(prefs){
  const json = JSON.stringify(prefs);
  if(hasCloudStorage){
    try{ await window.storage.set(PREFS_KEY, json, false); return; }catch(e){ /* fallthrough */ }
  }
  try{ localStorage.setItem(PREFS_KEY, json); }catch(e){ /* stockage indisponible */ }
}

async function savePref(key, value){
  const prefs = await prefsLoad();
  prefs[key] = value;
  await prefsSave(prefs);
}

// Cache local de l'état partagé (signatures, statuts demandes, statuts conventions)
let sharedData = { conventionStates:{}, demandeStates:{}, companyRatings:{}, universityNotifications:[], generatedConventions:[], updatedAt:0 };

function applySharedDataToModel(){
  // Intègre les conventions générées manuellement par le département (suite à un accord)
  (sharedData.generatedConventions||[]).forEach(gc=>{
    if(!conventions.some(c=>c.id===gc.id)){
      conventions.push(JSON.parse(JSON.stringify(gc)));
    }
  });
  conventions.forEach(c=>{
    if (c.fromDb) {
      c.signatures = c.signatures || {};
      return;
    }
    const s = sharedData.conventionStates[c.id];
    if(s){
      c.signed_etudiant = !!s.signed_etudiant;
      c.signed_entreprise = !!s.signed_entreprise;
      c.signed_univ = !!s.signed_univ;
      if(s.status) c.status = s.status;
      c.signatures = s.signatures || {};
    } else {
      c.signatures = c.signatures || {};
    }
  });
  demandes.forEach(d=>{
    const s = sharedData.demandeStates[d.id];
    if(s && s.status) d.status = s.status;
  });
  // Applique les notes attribuées par les étudiants aux entreprises (moyenne avec la note de base)
  companies.forEach(c=>{
    const ratings = sharedData.companyRatings[c.id];
    if(ratings && Object.keys(ratings).length){
      const values = Object.values(ratings).map(r=>r.value);
      const all = [c.baseRating!==undefined ? c.baseRating : c.rating, ...values];
      const avg = all.reduce((a,b)=>a+b,0) / all.length;
      if(c.baseRating===undefined) c.baseRating = c.rating;
      c.rating = Math.round(avg*10)/10;
      c.studentRatingsCount = values.length;
    }
  });
  // Synchronise les signatures de la convention active si nécessaire
  const mainConv = typeof getStudentConvention === 'function' ? getStudentConvention(etu()) : null;
  if(mainConv && mainConv.signatures) state.signatures = mainConv.signatures;
}

async function syncSharedData(){
  const data = await sharedLoad();
  if(data){
    sharedData = {
      conventionStates: data.conventionStates || {},
      demandeStates: data.demandeStates || {},
      companyRatings: data.companyRatings || {},
      universityNotifications: data.universityNotifications || [],
      generatedConventions: data.generatedConventions || [],
      updatedAt: data.updatedAt || 0
    };
    applySharedDataToModel();
  }
}

async function persistSharedData(){
  sharedData.updatedAt = Date.now();
  await sharedSave(sharedData);
}

// Sauvegarde l'état d'une convention (signatures + statut) dans le stockage partagé
async function persistConventionState(conventionId){
  const conv = conventions.find(c=>c.id===conventionId);
  if(!conv) return null;
  sharedData.conventionStates[conventionId] = {
    signed_etudiant: !!conv.signed_etudiant,
    signed_entreprise: !!conv.signed_entreprise,
    signed_univ: !!conv.signed_univ,
    status: conv.status,
    signatures: conv.signatures || {},
    documentHash: conv.documentHash || null,
    finalIntegrityHash: conv.finalIntegrityHash || null,
  };
  await persistSharedData();
  if (conv.fromDb && typeof apiJson === 'function' && state.role) {
    const sig = conv.signatures && conv.signatures[state.role];
    if (sig) {
      try {
        const payload = {
          type: sig.type,
          data: sig.data || null,
          text: sig.text || null,
        };
        const data = await apiJson('/api/conventions/' + conventionId + '/sign', {
          method: 'PATCH',
          body: JSON.stringify({ role: state.role, signature: payload }),
        });
        if (data.convention && typeof mergeConventionFromApi === 'function') {
          mergeConventionFromApi(data.convention);
        }
        return data;
      } catch (e) {
        console.warn('[StageFlow] Signature convention (base):', e.message);
        throw e;
      }
    }
  }
  return null;
}

async function persistConventionArchive(conventionId) {
  const conv = conventions.find(function(c) { return c.id === conventionId; });
  if (!conv) return null;
  conv.status = 'archived';
  sharedData.conventionStates[conventionId] = {
    ...(sharedData.conventionStates[conventionId] || {}),
    signed_etudiant: !!conv.signed_etudiant,
    signed_entreprise: !!conv.signed_entreprise,
    signed_univ: !!conv.signed_univ,
    status: 'archived',
    signatures: conv.signatures || {},
    documentHash: conv.documentHash || null,
    finalIntegrityHash: conv.finalIntegrityHash || null,
  };
  await persistSharedData();
  return conv;
}

// Sauvegarde l'état d'une demande (statut accepté/refusé)
async function persistDemandeState(demandeId){
  const d = demandes.find(x=>x.id===demandeId);
  if(!d) return;
  sharedData.demandeStates[demandeId] = { status: d.status };
  await persistSharedData();
}

// Enregistre la note (1-5 étoiles) attribuée par un étudiant à une entreprise
async function persistCompanyRating(companyId, studentName, value){
  if(!sharedData.companyRatings[companyId]) sharedData.companyRatings[companyId] = {};
  sharedData.companyRatings[companyId][studentName] = { value, date: new Date().toISOString() };
  await persistSharedData();
  applySharedDataToModel();
}

// ──────────────────────────────────
// RÉINITIALISATION DE L'ESSAI
// Remet à zéro signatures, demandes, notes et conventions au moment
// de quitter la plateforme, afin de pouvoir recommencer la démonstration.
// ──────────────────────────────────
async function resetSharedData(){
  // Restaure les conventions et demandes à leur état d'origine
  conventions.forEach((c,i)=>{
    if(i < DEFAULT_CONVENTIONS.length) Object.assign(c, JSON.parse(JSON.stringify(DEFAULT_CONVENTIONS[i])));
  });
  // Supprime les conventions générées dynamiquement (suite à un accord)
  conventions.length = DEFAULT_CONVENTIONS.length;
  demandes.forEach((d,i)=>{
    Object.assign(d, JSON.parse(JSON.stringify(DEFAULT_DEMANDES[i])));
  });
  // Réinitialise les notes attribuées et l'état partagé
  companies.forEach(c=>{
    if(c.baseRating!==undefined){ c.rating = c.baseRating; delete c.baseRating; }
    delete c.studentRatingsCount;
  });
  state.signatures = {};
  sharedData = { conventionStates:{}, demandeStates:{}, companyRatings:{}, universityNotifications:[], generatedConventions:[], updatedAt:0 };
  await persistSharedData();
}

// Rafraîchit périodiquement l'état partagé pour refléter les actions des autres comptes
let sharedSyncInterval = null;
let sharedSyncVisibilityBound = false;

function getSharedSyncIntervalMs() {
  if (state.role === 'entreprise') return 500;
  if (state.role === 'etudiant') return 3000;
  return 4000;
}

async function syncRoleDataFromDb() {
  if (state.role === 'entreprise' && state.user && state.user.entrepriseId && typeof syncEntrepriseDataFromDb === 'function') {
    return syncEntrepriseDataFromDb(state.user);
  }
  if (state.role === 'etudiant' && state.user && typeof syncEtudiantFromDb === 'function') {
    await syncEtudiantFromDb();
    return { changed: true, newDemandes: [] };
  }
  if (state.role === 'universite' && typeof syncUniversiteFromDb === 'function') {
    return syncUniversiteFromDb();
  }
  return { changed: false, newDemandes: [] };
}

async function runSharedSyncTick() {
  const ind = document.getElementById('syncIndicator');
  if (ind) ind.classList.add('syncing');
  const before = JSON.stringify(sharedData);
  await syncSharedData();
  const syncResult = await syncRoleDataFromDb();
  if (ind) ind.classList.remove('syncing');
  if (syncResult && syncResult.newDemandes && syncResult.newDemandes.length && typeof notifyNewEntrepriseDemandes === 'function') {
    notifyNewEntrepriseDemandes(syncResult.newDemandes);
  }
  if (state.role && (JSON.stringify(sharedData) !== before || (syncResult && syncResult.changed))) {
    refreshCurrentView();
  }
}

function bindSharedSyncVisibility() {
  if (sharedSyncVisibilityBound || typeof document === 'undefined') return;
  sharedSyncVisibilityBound = true;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && state.role) {
      runSharedSyncTick();
    }
  });
  window.addEventListener('focus', function() {
    if (state.role) runSharedSyncTick();
  });
}

function startSharedSync(){
  bindSharedSyncVisibility();
  syncSharedData().then(async function(){
    if(state.role) {
      const syncResult = await syncRoleDataFromDb();
      if (syncResult && syncResult.newDemandes && syncResult.newDemandes.length && typeof notifyNewEntrepriseDemandes === 'function') {
        notifyNewEntrepriseDemandes(syncResult.newDemandes);
      }
      refreshCurrentView();
    }
  });
  if(sharedSyncInterval) return;
  const scheduleNext = function() {
    sharedSyncInterval = setTimeout(function() {
      runSharedSyncTick().finally(scheduleNext);
    }, getSharedSyncIntervalMs());
  };
  scheduleNext();
}

// Recharge la page courante et les éléments dynamiques (badges, modales ouvertes)
function refreshCurrentView(){
  if(state.currentPage){
    try{
      document.getElementById('mainContent').innerHTML = getPageHTML(state.currentPage);
    }catch(err){
      console.error('Erreur de rafraîchissement de la page', state.currentPage, err);
    }
  }
  buildSidebar();
  const convModal = document.getElementById('conventionModal');
  if(convModal && convModal.classList.contains('open')) openConvention();
  updateSigDisplay();
  buildNotifList();
}
