// ──────────────────────────────────
// INITIALISATION DE LA LANGUE
// ──────────────────────────────────
(async function initLang(){
  let saved = 'fr';
  try{
    const prefs = await prefsLoad();
    saved = prefs.lang || 'fr';
  }catch(e){}
  state.lang = saved;
  document.documentElement.lang = saved;
  document.documentElement.dir = saved==='ar' ? 'rtl' : 'ltr';
  renderLandingTexts();
  const btn = document.getElementById('langToggleBtn');
  if(btn) btn.textContent = t('lang_btn');
  const btnApp = document.getElementById('langToggleBtnApp');
  if(btnApp) btnApp.textContent = t('lang_btn');
})();

// ──────────────────────────────────
// NOUVEL ESSAI À CHAQUE OUVERTURE DE LA PLATEFORME
// Chaque chargement/rechargement de la page ersisté
// (signatures, demandes, notes) pour repartir d'une démonstration vierge.
// ──────────────────────────────────
resetSharedData();
