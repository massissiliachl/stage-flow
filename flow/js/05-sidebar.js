// ══════════════════════════════════
// SIDEBAR
// ══════════════════════════════════
const menus = {
  etudiant:[
    { labelKey:'nav_dashboard', id:'dashboard', icon:'📊' },
    { labelKey:'nav_search', id:'search', icon:'🔍' },
    { labelKey:'nav_demandes', id:'demandes', icon:'📋', badge:2 },
    { labelKey:'nav_convention', id:'convention', icon:'📄' },
    { labelKey:'nav_dossier', id:'dossier', icon:'📁' },
    { labelKey:'nav_profil', id:'profil', icon:'👤' }
  ],
  entreprise:[
    { labelKey:'nav_ent_dashboard', id:'ent-dashboard', icon:'📊' },
    { labelKey:'nav_ent_demandes', id:'ent-demandes', icon:'📩', badge:1 },
    { labelKey:'nav_ent_conventions', id:'ent-conventions', icon:'📄' },
    { labelKey:'nav_ent_stagiaires', id:'ent-stagiaires', icon:'👥' },
    { labelKey:'nav_ent_profil', id:'ent-profil', icon:'🏢' }
  ],
  universite:[
    { labelKey:'nav_univ_dashboard', id:'univ-dashboard', icon:'📊' },
    { labelKey:'nav_univ_conventions', id:'univ-conventions', icon:'📄', badge:3 },
    { labelKey:'nav_univ_etudiants', id:'univ-etudiants', icon:'🎓' },
    { labelKey:'nav_univ_entreprises', id:'univ-entreprises', icon:'🏢' },
    { labelKey:'nav_univ_stats', id:'univ-stats', icon:'📈' },
    { labelKey:'nav_univ_archives', id:'univ-archives', icon:'🗄️' },
    { labelKey:'nav_univ_comptes', id:'univ-comptes', icon:'🏛️' },
    { labelKey:'nav_univ_paiement', id:'univ-paiement', icon:'💳' }
  ],
  // Menu réduit pour le Recteur (compte université) : uniquement le tableau de bord
  // statistique global et la gestion de la structure (facultés/départements)
  universite_recteur:[
    { labelKey:'nav_univ_dashboard', id:'univ-dashboard', icon:'📊' },
    { labelKey:'nav_univ_comptes', id:'univ-comptes', icon:'🏛️' },
    { labelKey:'nav_univ_paiement', id:'univ-paiement', icon:'💳' }
  ]
};

function buildSidebar() {
  let items = menus[state.role];
  if(state.role==='universite' && state.user){
    if(state.user.type==='universite'){
      // Recteur : menu réduit (tableau de bord statistique + structure)
      items = menus.universite_recteur;
    } else {
      // Faculté / Département : espace complet, sans la recherche d'entreprises
      items = items.filter(i=>i.id!=='univ-entreprises');
      if(state.user.type==='departement'){
        items = items.filter(i=>i.id!=='univ-comptes');
      }
    }
  }
  const scopeLabel = state.role==='universite' ? scopeLabelHTML() : '';
  document.getElementById('sidebar').innerHTML = `${scopeLabel}<div class="sidebar-section"><div class="sidebar-label">${t('nav_section_title')}</div>${
    items.map(i=>`<button class="nav-item" id="nav-${i.id}" onclick="navigateTo('${i.id}')">
      <span class="nav-icon">${i.icon}</span>${t(i.labelKey)}${i.badge?`<span class="nav-badge">${i.badge}</span>`:''}
    </button>`).join('')}</div>`;
}

function scopeLabelHTML(){
  const u = state.user;
  if(!u) return '';
  const scopeText = u.type==='universite' ? t('scope_global') : u.type==='faculte' ? u.faculte : `${u.departement} · ${u.faculte}`;
  return `<div class="sidebar-section" style="border-bottom:1px solid var(--border);margin-bottom:8px;padding-bottom:14px">
    <div class="sidebar-label">${t('sidebar_scope_title')}</div>
    <div style="font-size:12px;font-weight:600;color:var(--navy);padding:0 8px">${accountTypeLabel(u.type)}</div>
    <div style="font-size:11px;color:var(--text3);padding:2px 8px">${scopeText}</div>
  </div>`;
}

function navigateTo(pageId) {
  state.currentPage = pageId;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const el = document.getElementById('nav-'+pageId);
  if(el) el.classList.add('active');
  const renderPage = function() {
  try{
    document.getElementById('mainContent').innerHTML = getPageHTML(pageId);
  }catch(err){
    console.error("Erreur lors de l'affichage de la page", pageId, err);
    document.getElementById('mainContent').innerHTML = `<div class="empty-state"><div class="ico">⚠️</div><p>Une erreur est survenue lors de l'affichage de cette page.</p><p class="text-xs text-muted">${(err&&err.message)||''}</p></div>`;
  }
  };
  if (pageId === 'search' && typeof loadCompaniesFromDb === 'function') {
    loadCompaniesFromDb().finally(renderPage);
    return;
  }
  if (state.role === 'etudiant' && (pageId === 'dashboard' || pageId === 'demandes' || pageId === 'convention' || pageId === 'dossier') && typeof syncEtudiantFromDb === 'function') {
    syncEtudiantFromDb().finally(renderPage);
    return;
  }
  if (state.role === 'entreprise' && pageId === 'ent-stagiaires' && typeof syncEntrepriseStageDocsFromDb === 'function') {
    syncEntrepriseStageDocsFromDb().finally(renderPage);
    return;
  }
  if (state.role === 'entreprise' && ['ent-dashboard', 'ent-demandes', 'ent-conventions'].includes(pageId) && typeof syncEntrepriseDataFromDb === 'function' && state.user && state.user.entrepriseId) {
    syncEntrepriseDataFromDb(state.user).finally(renderPage);
    return;
  }
  renderPage();
}
