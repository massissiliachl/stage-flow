// ══════════════════════════════════
// DATA
// ══════════════════════════════════
const state = { role:null, user:null, currentPage:null, signatures:{}, currentCompanyId:null, currentCompanyName:null, authMode:'login', regAccountType:'departement', lang:'fr' };

// Map des comptes inscrits en session (email → objet utilisateur)
// Permet de gérer plusieurs comptes créés dynamiquement
const registeredAccounts = { etudiant:{}, entreprise:{} };

const API_BASE = 'http://localhost:3000';

async function apiJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
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
    nif: (document.getElementById('entProfilNif')?.value || '').replace(/\D/g, ''),
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

function enterEntrepriseApp(account) {
  state.role = 'entreprise';
  state.user = account;
  state.user._role = 'entreprise';
  closeOverlay('companyLoginModal');
  hideLanding();
  const app = document.getElementById('app');
  app.style.display = 'flex'; app.style.flexDirection = 'column';
  document.getElementById('userNameDisplay').textContent = flowUserDisplayName(state.user);
  document.getElementById('userRoleDisplay').textContent = 'Entreprise';
  document.getElementById('avatarDisplay').textContent = state.user.avatar || (state.user.company||state.user.name).slice(0,2).toUpperCase();
  buildSidebar(); buildNotifList(); navigateTo(getDefaultPage());
  startSharedSync();
}

// Retourne le compte étudiant actif (compte inscrit ou compte démo)
function etu(){ return (state.role==='etudiant' && state.user) ? state.user : users.etudiant; }
function ent(){ return (state.role==='entreprise' && state.user) ? state.user : users.entreprise; }
function specialiteToTag(secteur){ return secteur ? secteur.split(/[\/,]/)[0].trim() : 'Stage'; }

// ══════════════════════════════════
// I18N — Traductions FR / AR
// ══════════════════════════════════
const i18n = {
  fr: {
    // Landing
    nav_login:'Connexion', nav_about:'À propos',
    hero_badge:'🇩🇿 Plateforme 100% algérienne · Conforme loi n°15-04',
    hero_title1:'La nouvelle ère', hero_title2:'de la gestion', hero_title3:'de stages',
    hero_desc:"StageFlow connecte étudiants, entreprises et universités dans un processus entièrement dématérialisé — de la recherche à la signature électronique et l'archivage.",
    hero_cta_start:'Commencer', hero_cta_company:'Espace Entreprise', hero_cta_univ:'Espace Université',
    role_select_label:'SE CONNECTER EN TANT QUE',
    role_student:'Étudiant', role_student_desc:'Recherchez, postulez, signez en ligne',
    role_company:'Entreprise', role_company_desc:'Gérez vos demandes de stage PFE',
    role_univ:'Université', role_univ_desc:'Validez, archivez, suivez les conventions',
    stat_students:'ÉTUDIANTS INSCRITS', stat_companies:'ENTREPRISES PARTENAIRES', stat_univs:'COMPTES UNIVERSITAIRES', stat_delay:'CONVENTIONS FINALISÉES', stat_paper:'PAPIER REQUIS',
    about_title:'À propos — StageFlow',
    about_text1:"StageFlow est une plateforme de gestion dématérialisée des stages PFE qui connecte étudiants, entreprises et universités. Elle permet la recherche et la postulation aux offres, la validation administrative, la signature électronique sécurisée et l'archivage numérique conforme aux normes en vigueur. Objectifs : réduire les délais, supprimer le papier et centraliser les échanges pour une traçabilité complète.",
    about_text2:"Fonctionnalités : publication d'offres, candidatures en ligne, workflow de validation universitaire, signatures électroniques (empreinte SHA‑256), génération de PDF et suivi statistique.",
    close:'Fermer', logout:'Déconnexion',

    // Auth université
    auth_login_tab:'Connexion', auth_register_tab:'Créer un compte',
    auth_title:'Espace Université',
    auth_subtitle:'Université, facultés et départements — chacun avec son propre espace et ses propres dossiers',
    auth_back:"← Retour à l'accueil",
    auth_login_sub:'Connectez-vous avec le compte de votre établissement, faculté ou département.',
    auth_email:'Email institutionnel', auth_password:'Mot de passe', auth_password_confirm:'Confirmer le mot de passe',
    auth_login_btn:'Se connecter', auth_demo_accounts:'Comptes de démonstration :',
    auth_register_sub:'Inscrivez votre établissement, faculté ou département sur StageFlow.',
    auth_account_type:'Type de compte',
    auth_type_univ:'Université (administration centrale)', auth_type_fac:'Faculté', auth_type_dept:'Département',
    auth_parent_univ:'Université de rattachement', auth_parent_fac:'Faculté de rattachement',
    auth_no_parent:"Aucun établissement disponible — créez d'abord une université",
    auth_resp_name:'Nom du responsable', auth_resp_title:'Fonction',
    auth_org_univ:"Nom de l'université", auth_org_fac:'Nom de la faculté', auth_org_dept:'Nom du département',
    auth_org_univ_ph:'Ex: Université Abderrahmane Mira — Béjaïa', auth_org_fac_ph:'Ex: Faculté des Sciences Économiques', auth_org_dept_ph:'Ex: Département Informatique',
    auth_security_note:"Chaque compte (université, faculté ou département) dispose de son propre espace : ses étudiants, demandes, conventions et archives restent séparés et visibles uniquement par ce compte — sauf pour l'université qui supervise l'ensemble.",
    auth_create_btn:'Créer le compte',

    // Top bar
    sync_label:'Synchronisé',

    // Sidebar — étudiant
    nav_dashboard:'Tableau de bord', nav_search:'Recherche entreprise', nav_demandes:'Mes demandes',
    nav_convention:'Ma convention', nav_dossier:'Suivi du dossier', nav_profil:'Mon profil',
    // Sidebar — entreprise
    nav_ent_dashboard:'Tableau de bord', nav_ent_demandes:'Demandes reçues', nav_ent_conventions:'Conventions',
    nav_ent_stagiaires:'Stagiaires actifs', nav_ent_profil:'Profil entreprise',
    // Sidebar — université
    nav_univ_dashboard:'Tableau de bord', nav_univ_conventions:'Conventions', nav_univ_etudiants:'Étudiants',
    nav_univ_entreprises:'Entreprises', nav_univ_stats:'Statistiques', nav_univ_archives:'Archives',
    nav_univ_comptes:'Comptes & structure', nav_univ_paiement:'Abonnement & Paiement',
    nav_section_title:'Navigation', sidebar_scope_title:'Espace connecté', scope_global:'Vue globale — toutes facultés',

    // Common buttons / labels
    btn_save:'Enregistrer', btn_cancel:'Annuler', btn_close:'Fermer', btn_view:'Voir', btn_download:'⬇ Télécharger',
    btn_sign:'✍️ Signer électroniquement', btn_already_signed:'✅ Déjà signé', btn_consult:'Consulter',
    status_pending:'En attente', status_accepted:'Accepté', status_rejected:'Refusé', status_cancelled:'Annulée',
    status_active:'Actif', status_signed:'Signé', status_archived:'Archivé',

    // Lang toggle
    lang_btn:'AR',
  },
  ar: {
    nav_login:'تسجيل الدخول', nav_about:'حول المنصة',
    hero_badge:'🇩🇿 منصة جزائرية 100% · متوافقة مع القانون رقم 15-04',
    hero_title1:'العصر الجديد', hero_title2:'لإدارة', hero_title3:'التربصات',
    hero_desc:'StageFlow : بسّط مسار تربصك.',
    hero_cta_start:'ابدأ الآن', hero_cta_company:'فضاء المؤسسة', hero_cta_univ:'فضاء الجامعة',
    role_select_label:'تسجيل الدخول باعتباري',
    role_student:'طالب', role_student_desc:'ابحث وتقدّم ووقّع عبر الإنترنت',
    role_company:'مؤسسة', role_company_desc:'إدارة طلبات التربص',
    role_univ:'جامعة', role_univ_desc:'تحقق وأرشف وتابع الاتفاقيات',
    stat_students:'طالب مسجل', stat_companies:'مؤسسة شريكة', stat_univs:'حساب جامعي', stat_delay:'اتفاقيات منجزة', stat_paper:'ورق مطلوب',
    about_title:'حول المنصة — StageFlow',
    about_text1:'StageFlow هي منصة رقمية لإدارة تربصات نهاية الدراسة تربط الطلبة والمؤسسات والجامعات. تتيح البحث عن العروض والتقديم عليها، والتحقق الإداري، والتوقيع الإلكتروني الآمن، والأرشفة الرقمية المتوافقة مع المعايير المعمول بها. الأهداف: تقليص الآجال، إلغاء الورق، وتمركز التبادلات لضمان تتبع كامل.',
    about_text2:'الميزات: نشر العروض، التقديم عبر الإنترنت، مسار التحقق الجامعي، التوقيعات الإلكترونية (بصمة SHA-256)، توليد ملفات PDF والمتابعة الإحصائية.',
    close:'إغلاق', logout:'تسجيل الخروج',

    auth_login_tab:'تسجيل الدخول', auth_register_tab:'إنشاء حساب',
    auth_title:'فضاء الجامعة',
    auth_subtitle:'الجامعة والكليات والأقسام — لكل منها فضاؤه الخاص وملفاته الخاصة',
    auth_back:'← رجوع إلى الصفحة الرئيسية',
    auth_login_sub:'سجّل الدخول بحساب مؤسستك أو كليتك أو قسمك.',
    auth_email:'البريد الإلكتروني المؤسسي', auth_password:'كلمة المرور', auth_password_confirm:'تأكيد كلمة المرور',
    auth_login_btn:'تسجيل الدخول', auth_demo_accounts:'حسابات للتجربة:',
    auth_register_sub:'سجّل مؤسستك أو كليتك أو قسمك على StageFlow.',
    auth_account_type:'نوع الحساب',
    auth_type_univ:'جامعة (الإدارة المركزية)', auth_type_fac:'كلية', auth_type_dept:'قسم',
    auth_parent_univ:'الجامعة التابع لها', auth_parent_fac:'الكلية التابع لها',
    auth_no_parent:'لا توجد مؤسسة متاحة — قم أولاً بإنشاء جامعة',
    auth_resp_name:'اسم المسؤول', auth_resp_title:'الوظيفة',
    auth_org_univ:'اسم الجامعة', auth_org_fac:'اسم الكلية', auth_org_dept:'اسم القسم',
    auth_org_univ_ph:'مثال: جامعة عبد الرحمن ميرة — بجاية', auth_org_fac_ph:'مثال: كلية العلوم الاقتصادية', auth_org_dept_ph:'مثال: قسم المعلوماتية',
    auth_security_note:'كل حساب (جامعة، كلية أو قسم) يملك فضاءه الخاص: طلابه، طلباته، اتفاقياته وأرشيفه تبقى منفصلة ومرئية فقط لهذا الحساب — باستثناء الجامعة التي تشرف على الجميع.',
    auth_create_btn:'إنشاء الحساب',

    sync_label:'متزامن',

    nav_dashboard:'لوحة التحكم', nav_search:'البحث عن مؤسسة', nav_demandes:'طلباتي',
    nav_convention:'اتفاقيتي', nav_dossier:'متابعة الملف', nav_profil:'ملفي الشخصي',
    nav_ent_dashboard:'لوحة التحكم', nav_ent_demandes:'الطلبات الواردة', nav_ent_conventions:'الاتفاقيات',
    nav_ent_stagiaires:'المتربصون النشطون', nav_ent_profil:'ملف المؤسسة',
    nav_univ_dashboard:'لوحة التحكم', nav_univ_conventions:'الاتفاقيات', nav_univ_etudiants:'الطلبة',
    nav_univ_entreprises:'المؤسسات', nav_univ_stats:'الإحصائيات', nav_univ_archives:'الأرشيف',
    nav_univ_comptes:'الحسابات والهيكلة', nav_univ_paiement:'الاشتراك والدفع',
    nav_section_title:'التنقل', sidebar_scope_title:'الحساب المتصل', scope_global:'رؤية شاملة — جميع الكليات',

    btn_save:'حفظ', btn_cancel:'إلغاء', btn_close:'إغلاق', btn_view:'عرض', btn_download:'⬇ تحميل',
    btn_sign:'✍️ التوقيع الإلكتروني', btn_already_signed:'✅ تم التوقيع', btn_consult:'استشارة',
    status_pending:'قيد الانتظار', status_accepted:'مقبول', status_rejected:'مرفوض', status_cancelled:'ملغاة',
    status_active:'نشط', status_signed:'موقّع', status_archived:'مؤرشف',

    lang_btn:'FR',
  }
};

function t(key){
  return (i18n[state.lang] && i18n[state.lang][key]) || i18n.fr[key] || key;
}

function setLang(lang){
  state.lang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang==='ar' ? 'rtl' : 'ltr';
  savePref('lang', lang);
  // Re-render landing / auth screen / app depending on what's visible
  renderLandingTexts();
  if(document.getElementById('univAuthScreen').style.display !== 'none'){
    renderUnivAuth();
  }
  if(state.role){
    buildSidebar();
    if(state.currentPage) navigateTo(state.currentPage);
  }
  const btn = document.getElementById('langToggleBtn');
  if(btn) btn.textContent = t('lang_btn');
  const btnApp = document.getElementById('langToggleBtnApp');
  if(btnApp) btnApp.textContent = t('lang_btn');
  const logoutBtn = document.getElementById('i18n-logout-btn');
  if(logoutBtn) logoutBtn.textContent = t('logout');
}

function toggleLang(){
  setLang(state.lang==='fr' ? 'ar' : 'fr');
}

// Applique les traductions sur la page d'accueil (landing)
function renderLandingTexts(){
  const map = {
    'i18n-nav-login':'nav_login', 'i18n-nav-about':'nav_about',
    'i18n-hero-badge':'hero_badge', 'i18n-hero-title1':'hero_title1', 'i18n-hero-title2':'hero_title2', 'i18n-hero-title3':'hero_title3',
    'i18n-hero-desc':'hero_desc',
    'i18n-role-label':'role_select_label',
    'i18n-role-student':'role_student', 'i18n-role-student-desc':'role_student_desc',
    'i18n-role-company':'role_company', 'i18n-role-company-desc':'role_company_desc',
    'i18n-role-univ':'role_univ', 'i18n-role-univ-desc':'role_univ_desc',
    'i18n-stat-students':'stat_students', 'i18n-stat-companies':'stat_companies', 'i18n-stat-univs':'stat_univs', 'i18n-stat-delay':'stat_delay', 'i18n-stat-paper':'stat_paper',
    'i18n-about-title':'about_title', 'i18n-about-text1':'about_text1', 'i18n-about-text2':'about_text2', 'i18n-about-close':'close',
    'i18n-auth-back':'auth_back', 'i18n-auth-title':'auth_title', 'i18n-auth-subtitle':'auth_subtitle'
  };
  Object.entries(map).forEach(([id,key])=>{
    const el = document.getElementById(id);
    if(el) el.textContent = t(key);
  });
  renderLandingStats();
}

// Calcule et affiche les vraies statistiques de la plateforme (pas de chiffres fictifs)
function renderLandingStats(){
  // Étudiants : compte de démo + comptes réellement inscrits en session
  const totalStudents = students_bejaia.length + Object.keys(registeredAccounts.etudiant).length;

  // Entreprises : liste des partenaires (démo + inscrites en session)
  const totalCompanies = companies.length;

  // Universités / facultés / départements connectés (structure réelle)
  const totalUnivAccounts = universityAccounts.length;

  // Taux de dématérialisation des conventions : signées ou archivées / total
  const totalConv = conventions.length;
  const doneConv = conventions.filter(c=>c.status==='signed'||c.status==='archived').length;
  const completionRate = totalConv ? Math.round(doneConv/totalConv*100) : 0;

  const setNum = (id, val) => { const el=document.getElementById(id); if(el) el.textContent = val; };
  setNum('stat-num-students', totalStudents);
  setNum('stat-num-companies', totalCompanies);
  setNum('stat-num-univs', totalUnivAccounts);
  setNum('stat-num-delay', completionRate + '%');
  setNum('stat-num-paper', '0');
}
