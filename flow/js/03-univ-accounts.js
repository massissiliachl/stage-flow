// ══════════════════════════════════
// COMPTES UNIVERSITÉ — hiérarchie
// Université (admin global) → Faculté → Département
// ══════════════════════════════════
let universityAccounts = [
  {
    id:'univ-1', type:'universite', parentId:null,
    name:'Pr. Abdelkrim Beniaiche', role_title:'Recteur / Admin plateforme',
    university:'Université Abderrahmane Mira — Béjaïa', faculte:null, departement:null,
    email:'RECTORAT', password:'13102026', avatar:'AB'
  },
  {
    id:'fac-shs', type:'faculte', parentId:'univ-1',
    name:'Pr. Soualmia Abderrahmane', role_title:'Doyen de Faculté',
    university:'Université Abderrahmane Mira — Béjaïa', faculte:'Faculté SHS', departement:null,
    email:'doyen.shs@univ-bejaia.dz', password:'13102026', avatar:'SA'
  },
  {
    id:'dept-sic', type:'departement', parentId:'fac-shs',
    name:'Dr. Ismail Bendbili', role_title:'Chef du Département SIC',
    responsable_stages:'Mme Bisekri',
    encadrante:'Dr. Hider Fouzia',
    university:'Université Abderrahmane Mira — Béjaïa', faculte:'Faculté SHS', departement:'Département SIC',
    email:'sic@univ-bejaia.dz', password:'13102026', avatar:'IB'
  },
  {
    id:'fac-droit', type:'faculte', parentId:'univ-1',
    name:'Pr. Karim Belaïdi', role_title:'Doyen de Faculté',
    university:'Université Abderrahmane Mira — Béjaïa', faculte:'Faculté de Droit', departement:null,
    email:'doyen.droit@univ-bejaia.dz', password:'13102026', avatar:'FD'
  },
  {
    id:'dept-droitprive', type:'departement', parentId:'fac-droit',
    name:'Dr. Naïma Ouyahia', role_title:'Responsable stages — Département Droit Privé',
    university:'Université Abderrahmane Mira — Béjaïa', faculte:'Faculté de Droit', departement:'Département Droit Privé',
    email:'droitprive@univ-bejaia.dz', password:'13102026', avatar:'NO'
  }
];

const accountTypeLabels = { universite:'Université (admin global)', faculte:'Faculté', departement:'Département' };

// Libellé traduit du type de compte (pour l'affichage UI)
function accountTypeLabel(type){
  const map = { universite:'auth_type_univ', faculte:'auth_type_fac', departement:'auth_type_dept' };
  return t(map[type]) || accountTypeLabels[type];
}

// Retourne les comptes descendants (et lui-même) d'un compte donné
function getScopeAccountIds(account){
  const ids = [account.id];
  let changed = true;
  while(changed){
    changed = false;
    universityAccounts.forEach(a=>{
      if(a.parentId && ids.includes(a.parentId) && !ids.includes(a.id)){ ids.push(a.id); changed = true; }
    });
  }
  return ids;
}

// Renvoie les facultés/départements (noms) que ce compte peut voir
function getScopeFiltersFor(account){
  if(account.type==='universite') return null; // null = tout voir
  const ids = getScopeAccountIds(account);
  const accounts = universityAccounts.filter(a=>ids.includes(a.id));
  return {
    facultes: [...new Set(accounts.filter(a=>a.faculte).map(a=>a.faculte))],
    departements: [...new Set(accounts.filter(a=>a.departement).map(a=>a.departement))]
  };
}

function filterByScope(list, account){
  const scope = getScopeFiltersFor(account);
  if(!scope) return list; // université = tout
  return list.filter(item=>{
    if(scope.departements.length) return scope.departements.includes(item.departement);
    if(scope.facultes.length) return scope.facultes.includes(item.faculte);
    return true;
  });
}

// Renvoie les comptes directement rattachés (enfants) d'un compte
function getChildAccounts(account){
  return universityAccounts.filter(a=>a.parentId===account.id);
}

// Construit une répartition étudiants / conventions par faculté → département
// Utilisé par le rectorat (vue université) pour les statistiques et l'archivage globaux
function buildOrgBreakdown(){
  const facultes = universityAccounts.filter(a=>a.type==='faculte');
  return facultes.map(fac=>{
    const depts = universityAccounts.filter(a=>a.type==='departement' && a.parentId===fac.id);
    const deptRows = depts.map(dep=>{
      const sStudents = students_bejaia.filter(s=>s.departement===dep.departement);
      const sConv = conventions.filter(c=>c.departement===dep.departement);
      const archived = sConv.filter(c=>c.status==='archived');
      const signedFull = sConv.filter(c=>c.signed_entreprise && c.signed_univ);
      return {
        faculte: fac.faculte, departement: dep.departement,
        students: sStudents.length, conventions: sConv.length,
        archived: archived.length, signedFull: signedFull.length,
        placed: sStudents.filter(s=>s.status==='active'||s.status==='accepted'||s.status==='archived').length
      };
    });
    const totals = deptRows.reduce((acc,r)=>({
      students: acc.students+r.students, conventions: acc.conventions+r.conventions,
      archived: acc.archived+r.archived, signedFull: acc.signedFull+r.signedFull, placed: acc.placed+r.placed
    }), {students:0,conventions:0,archived:0,signedFull:0,placed:0});
    return { faculte: fac.faculte, totals, departements: deptRows };
  });
}

const users = {
  etudiant: {
    id:'d1111111-1111-1111-1111-111111111111',
    name:'Djatout Nour El Houda',
    faculte:'Faculté SHS',
    email:'n.djatout@univ-bejaia.dz',
    matricule:'202133011300',
    password:'13102026',
    specialty:'Master 2 — Communication et Relations Publiques',
    promo:'2025-2026',
    university:'Université Abderrahmane Mira — Béjaïa',
    dept:'Département Sciences de la Communication',
    avatar:'DN',
    theme:"Usage de l'IA dans les pratiques de la communication commerciale",
    company:'Cevital',
    encadrant:'Dr. Hider Fouzia',
    encadrant_ent:'M. Hamouchi — Directeur Marketing',
    periode:'Février — Mars 2026 (2 mois)',
    debut:'01 Février 2026',
    fin:'31 Mars 2026',
    binome: {
      name:'Hamadach Tinhinan',
      email:'t.hamadach@univ-bejaia.dz',
      specialty:'Master 2 — Communication et Relations Publiques',
      avatar:'HT'
    },
    groupType: 'binome',
    groupMembers: [{
      name:'Hamadach Tinhinan',
      email:'t.hamadach@univ-bejaia.dz',
      specialty:'Master 2 — Communication et Relations Publiques',
      avatar:'HT'
    }]
  },
  entreprise: { name:'Direction RH', company:'Cevital', sector:'Agroalimentaire', wilaya:'Béjaïa', avatar:'CV', identifiant:'CEVITALAGRO', password:'13102026' }
};

// Company logos: SVG-based inline logos
const companyLogos = {
  'Cevital': {bg:'#003087', text:'Cevital', color:'#fff', svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#003087"/><text x="26" y="22" text-anchor="middle" fill="#fff" font-size="8" font-family="Arial" font-weight="bold">CEVITAL</text><text x="26" y="34" text-anchor="middle" fill="#E8B400" font-size="5" font-family="Arial">GROUPE</text><circle cx="26" cy="42" r="3" fill="#E8B400"/></svg>`},
  'Sonatrach': {bg:'#006633', text:'SH', svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#006633"/><text x="26" y="30" text-anchor="middle" fill="#FFD700" font-size="14" font-family="Arial" font-weight="bold">SH</text><text x="26" y="42" text-anchor="middle" fill="#fff" font-size="5.5" font-family="Arial">SONATRACH</text></svg>`},
  'Djezzy': {bg:'#E31837', text:'djezzy', svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#E31837"/><text x="26" y="31" text-anchor="middle" fill="#fff" font-size="9.5" font-family="Arial" font-weight="bold">djezzy</text></svg>`},
  'Algérie Telecom': {bg:'#003399', text:'AT', svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#003399"/><text x="26" y="24" text-anchor="middle" fill="#fff" font-size="15" font-family="Arial" font-weight="bold">AT</text><text x="26" y="37" text-anchor="middle" fill="#fff" font-size="5" font-family="Arial">ALGÉRIE TELECOM</text></svg>`},
  'Ooredoo': {bg:'#E4002B', text:'ooredoo', svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#E4002B"/><text x="26" y="31" text-anchor="middle" fill="#fff" font-size="7.5" font-family="Arial" font-weight="bold">ooredoo</text></svg>`},
  'BNA Banque': {bg:'#1E3A5F', text:'BNA', svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#1E3A5F"/><text x="26" y="26" text-anchor="middle" fill="#FFD700" font-size="14" font-family="Arial" font-weight="bold">BNA</text><text x="26" y="38" text-anchor="middle" fill="#fff" font-size="5.5" font-family="Arial">BANQUE</text></svg>`},
  'Condor Electronics': {bg:'#CC0000', text:'CONDOR', svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px"><rect width="52" height="52" rx="8" fill="#CC0000"/><text x="26" y="24" text-anchor="middle" fill="#fff" font-size="7" font-family="Arial" font-weight="bold">CONDOR</text><text x="26" y="36" text-anchor="middle" fill="#fff" font-size="5.5" font-family="Arial">ELECTRONICS</text></svg>`}
};

// Domaines disponibles (catégories larges, tous secteurs d'activité)
const domains = [
  'Tous les domaines',
  'Industrie & Énergie',
  'Télécommunications & IT',
  'Finance & Banque',
  'Droit & Justice',
  'Santé & Paramédical',
  'Éducation & Formation',
  'BTP & Architecture',
  'Tourisme & Hôtellerie',
  'Administration publique',
  'Commerce & Distribution'
];

// Liste des wilayas couvertes par la plateforme
const wilayas = ['Toutes les wilayas','Béjaïa','Alger','Sétif','Oran','Constantine','Tizi Ouzou','Annaba'];

const companies = [
  // ── Industrie & Énergie ──
  { id:1, name:'Cevital', domain:'Industrie & Énergie', sector:'Agroalimentaire', wilaya:'Béjaïa', offers:4, rating:4.7, tags:['Marketing','Communication','Management','Digital'] },
  { id:2, name:'Sonatrach', domain:'Industrie & Énergie', sector:'Énergie / Pétrochimie', wilaya:'Béjaïa', offers:5, rating:4.2, tags:['Informatique','HSE','Communication'] },
  { id:7, name:'Sonelgaz', domain:'Industrie & Énergie', sector:'Énergie / Électricité-Gaz', wilaya:'Sétif', offers:3, rating:4.1, tags:['Électrotechnique','HSE','Communication'] },
  { id:8, name:'Naftal', domain:'Industrie & Énergie', sector:'Distribution pétrolière', wilaya:'Oran', offers:2, rating:4.0, tags:['Logistique','HSE','Commercial'] },

  // ── Télécommunications & IT ──
  { id:3, name:'Djezzy', domain:'Télécommunications & IT', sector:'Télécommunications', wilaya:'Béjaïa', offers:2, rating:4.0, tags:['Marketing','IT','Réseaux'] },
  { id:4, name:'Algérie Telecom', domain:'Télécommunications & IT', sector:'Télécommunications', wilaya:'Béjaïa', offers:3, rating:4.3, tags:['SI','Sécurité','Communication'] },
  { id:5, name:'Ooredoo', domain:'Télécommunications & IT', sector:'Télécommunications', wilaya:'Béjaïa', offers:2, rating:4.1, tags:['Marketing Digital','Data'] },
  { id:9, name:'NTIC Solutions', domain:'Télécommunications & IT', sector:'Services numériques / ESN', wilaya:'Alger', offers:4, rating:4.4, tags:['Développement','UX/UI','Communication digitale'] },

  // ── Finance & Banque ──
  { id:6, name:'BNA Banque', domain:'Finance & Banque', sector:'Finance / Banque', wilaya:'Béjaïa', offers:2, rating:3.9, tags:['Finance','Communication','RP'] },
  { id:10, name:'CPA — Crédit Populaire d\'Algérie', domain:'Finance & Banque', sector:'Banque', wilaya:'Sétif', offers:2, rating:3.8, tags:['Finance','Gestion','RP'] },
  { id:11, name:'CNEP-Banque', domain:'Finance & Banque', sector:'Banque / Épargne', wilaya:'Constantine', offers:2, rating:3.9, tags:['Finance','Communication','Marketing'] },

  // ── Droit & Justice ──
  { id:12, name:'Cabinet Maître Belkacem', domain:'Droit & Justice', sector:'Avocat — Droit des affaires', wilaya:'Béjaïa', offers:2, rating:4.5, tags:['Droit','Communication juridique','RP'] },
  { id:13, name:'Étude Notariale Ait Saïd', domain:'Droit & Justice', sector:'Notariat', wilaya:'Béjaïa', offers:1, rating:4.4, tags:['Droit','Rédaction','Archivage'] },
  { id:14, name:'Cabinet Maître Cherif & Associés', domain:'Droit & Justice', sector:'Avocat — Droit social & RH', wilaya:'Alger', offers:3, rating:4.6, tags:['Droit social','Communication','Conseil'] },
  { id:15, name:'Étude Notariale Benyahia', domain:'Droit & Justice', sector:'Notariat', wilaya:'Sétif', offers:1, rating:4.3, tags:['Droit immobilier','Rédaction d\'actes'] },
  { id:16, name:'Cabinet d\'Huissier Mansouri', domain:'Droit & Justice', sector:'Huissier de justice', wilaya:'Oran', offers:1, rating:4.1, tags:['Procédures','Notification','Archivage'] },

  // ── Santé & Paramédical ──
  { id:17, name:'Clinique El Amel', domain:'Santé & Paramédical', sector:'Clinique privée', wilaya:'Béjaïa', offers:2, rating:4.2, tags:['Communication santé','Accueil patient','RP'] },
  { id:18, name:'Laboratoire Saidal', domain:'Santé & Paramédical', sector:'Industrie pharmaceutique', wilaya:'Alger', offers:3, rating:4.3, tags:['Marketing pharma','Communication','Qualité'] },
  { id:19, name:'Centre Médical Annaba Santé', domain:'Santé & Paramédical', sector:'Centre médical', wilaya:'Annaba', offers:1, rating:4.0, tags:['Communication','Accueil','Administration'] },

  // ── Éducation & Formation ──
  { id:20, name:'Université Abderrahmane Mira', domain:'Éducation & Formation', sector:'Enseignement supérieur', wilaya:'Béjaïa', offers:5, rating:4.5, tags:['Communication institutionnelle','Événementiel','RP'] },
  { id:21, name:'Institut de Formation Avenir', domain:'Éducation & Formation', sector:'Formation professionnelle', wilaya:'Tizi Ouzou', offers:2, rating:4.0, tags:['Pédagogie','Communication','Marketing'] },

  // ── Lycées & CEM (Béjaïa) — stages d'enseignement, Lettres et Langues ──
  { id:30, name:'Lycée Ibn Khaldoun', domain:'Éducation & Formation', sector:'Lycée — Enseignement secondaire', wilaya:'Béjaïa', offers:3, rating:4.1, tags:['Français','Anglais','Pédagogie','Lettres et Langues'] },
  { id:31, name:'Lycée El Hidhab', domain:'Éducation & Formation', sector:'Lycée — Enseignement secondaire', wilaya:'Béjaïa', offers:2, rating:4.0, tags:['Arabe','Français','Traduction','Lettres et Langues'] },
  { id:32, name:'Lycée Krim Belkacem', domain:'Éducation & Formation', sector:'Lycée — Enseignement secondaire', wilaya:'Béjaïa', offers:2, rating:4.2, tags:['Anglais','Espagnol','Pédagogie','Lettres et Langues'] },
  { id:33, name:'Lycée Akkache Ali', domain:'Éducation & Formation', sector:'Lycée — Enseignement secondaire', wilaya:'Béjaïa', offers:2, rating:3.9, tags:['Français','Tamazight','Lettres et Langues'] },
  { id:34, name:'CEM Frantz Fanon', domain:'Éducation & Formation', sector:'CEM — Enseignement moyen', wilaya:'Béjaïa', offers:2, rating:4.0, tags:['Français','Arabe','Pédagogie','Lettres et Langues'] },
  { id:35, name:'CEM Amirouche', domain:'Éducation & Formation', sector:'CEM — Enseignement moyen', wilaya:'Béjaïa', offers:2, rating:3.8, tags:['Anglais','Français','Lettres et Langues'] },
  { id:36, name:'CEM Ibn Sina', domain:'Éducation & Formation', sector:'CEM — Enseignement moyen', wilaya:'Béjaïa', offers:1, rating:3.9, tags:['Arabe','Éducation islamique','Lettres et Langues'] },
  { id:37, name:'CEM Boudjellil', domain:'Éducation & Formation', sector:'CEM — Enseignement moyen', wilaya:'Béjaïa', offers:1, rating:3.8, tags:['Français','Tamazight','Lettres et Langues'] },
  { id:38, name:'CEM Bouakaz', domain:'Éducation & Formation', sector:'CEM — Enseignement moyen', wilaya:'Béjaïa', offers:1, rating:3.8, tags:['Français','Arabe','Lettres et Langues'] },
  { id:39, name:'CEM Goumez', domain:'Éducation & Formation', sector:'CEM — Enseignement moyen', wilaya:'Béjaïa', offers:1, rating:3.7, tags:['Anglais','Français','Lettres et Langues'] },
  { id:40, name:'Lycée Anani', domain:'Éducation & Formation', sector:'Lycée — Enseignement secondaire', wilaya:'Béjaïa', offers:2, rating:4.0, tags:['Français','Anglais','Lettres et Langues'] },
  { id:41, name:'Lycée Technicum', domain:'Éducation & Formation', sector:'Lycée technique — Enseignement secondaire', wilaya:'Béjaïa', offers:2, rating:4.1, tags:['Français','Technique','Pédagogie','Lettres et Langues'] },

  // ── BTP & Architecture ──
  { id:22, name:'Groupe COSIDER', domain:'BTP & Architecture', sector:'BTP / Construction', wilaya:'Alger', offers:3, rating:4.1, tags:['Communication chantier','HSE','RH'] },
  { id:23, name:'Cabinet d\'Architecture Amazigh Design', domain:'BTP & Architecture', sector:'Architecture & urbanisme', wilaya:'Béjaïa', offers:1, rating:4.4, tags:['Design','Communication visuelle','Projets'] },

  // ── Tourisme & Hôtellerie ──
  { id:24, name:'Hôtel Royal Béjaïa', domain:'Tourisme & Hôtellerie', sector:'Hôtellerie', wilaya:'Béjaïa', offers:2, rating:4.2, tags:['Communication','Événementiel','Relation client'] },
  { id:25, name:'Agence de Voyages Tassili Tours', domain:'Tourisme & Hôtellerie', sector:'Agence de voyage', wilaya:'Oran', offers:1, rating:4.0, tags:['Marketing touristique','Communication digitale'] },

  // ── Administration publique ──
  { id:26, name:'APC Béjaïa', domain:'Administration publique', sector:'Collectivité locale', wilaya:'Béjaïa', offers:2, rating:3.8, tags:['Communication institutionnelle','Protocole','Archivage'] },
  { id:27, name:'Direction de la Culture — Wilaya de Sétif', domain:'Administration publique', sector:'Institution culturelle', wilaya:'Sétif', offers:1, rating:3.9, tags:['Événementiel','Communication','RP'] },

  // ── Commerce & Distribution ──
  { id:28, name:'Condor Electronics', domain:'Commerce & Distribution', sector:'Électronique / Distribution', wilaya:'Béjaïa', offers:3, rating:4.0, tags:['Marketing','Communication produit','Commercial'] },
  { id:29, name:'Ardis', domain:'Commerce & Distribution', sector:'Grande distribution', wilaya:'Alger', offers:2, rating:3.9, tags:['Marketing','Merchandising','Communication'] }
];

const students_bejaia = [
  { name:'Djatout Nour El Houda', specialty:'Master 2 Comm. & RP', theme:"Usage de l'IA dans la comm. commerciale", company:'Cevital', status:'active', faculte:'Faculté SHS', departement:'Département SIC' },
  { name:'Amira Bensaid', specialty:'Master 2 Comm. & RP', theme:'Stratégie de comm. digitale PME', company:'Djezzy', status:'accepted', faculte:'Faculté SHS', departement:'Département SIC' },
  { name:'Lyna Talbi', specialty:'Licence 3 Comm.', theme:'Relations publiques secteur bancaire', company:'BNA Banque', status:'accepted', faculte:'Faculté SHS', departement:'Département SIC' },
  { name:'Katia Ouali', specialty:'Master 2 SIC', theme:'IA et veille informationnelle', company:'Algérie Telecom', status:'pending', faculte:'Faculté SHS', departement:'Département SIC' },
  { name:'Ryad Ferhat', specialty:'Master 2 SIC', theme:'Transformation numérique PME', company:'En recherche', status:'pending', faculte:'Faculté SHS', departement:'Département SIC' },
  { name:'Sara Meziane', specialty:'Master 2 Comm.', theme:'Communication de crise digitale', company:'Sonatrach', status:'archived', faculte:'Faculté SHS', departement:'Département SIC' },
  { name:'Yacine Boudiaf', specialty:'Master 2 Droit des affaires', theme:'Conformité juridique des startups', company:'Cabinet Maître Belkacem', status:'accepted', faculte:'Faculté de Droit', departement:'Département Droit Privé' },
  { name:'Ines Rahmani', specialty:'Master 2 Droit des affaires', theme:'Signature électronique et droit algérien', company:'Étude Notariale Ait Saïd', status:'pending', faculte:'Faculté de Droit', departement:'Département Droit Privé' }
];

const demandes = [
  { id:1, company:'Cevital', status:'accepted', date:'2026-01-10', theme:"Usage de l'IA dans les pratiques de la communication commerciale", encadrant:'M. Hamouchi', studentName:'Djatout Nour El Houda', studentLabel:'Djatout Nour El Houda' },
  { id:2, company:'Djezzy', status:'pending', date:'2026-01-08', theme:"Usage de l'IA dans les pratiques de la communication commerciale", encadrant:'—', studentName:'Djatout Nour El Houda', studentLabel:'Djatout Nour El Houda' },
  { id:3, company:'Ooredoo', status:'rejected', date:'2026-01-05', theme:"Usage de l'IA dans les pratiques de la communication commerciale", encadrant:'—', studentName:'Djatout Nour El Houda', studentLabel:'Djatout Nour El Houda' }
];

const conventions = [
  { id:1, etudiant:'Djatout Nour El Houda', company:'Cevital', theme:"Usage de l'IA dans la comm. commerciale", periode:'Fév – Mar 2026', status:'active', signed_etudiant:false, signed_entreprise:false, signed_univ:false, faculte:'Faculté SHS', departement:'Département SIC' },
  { id:2, etudiant:'Amira Bensaid', company:'Djezzy', theme:'Stratégie comm. digitale', periode:'Fév – Mar 2026', status:'pending', signed_etudiant:true, signed_entreprise:false, signed_univ:false, faculte:'Faculté SHS', departement:'Département SIC' },
  { id:3, etudiant:'Sara Meziane', company:'Sonatrach', theme:'Communication de crise', periode:'Jan – Fév 2026', status:'archived', signed_etudiant:true, signed_entreprise:true, signed_univ:true, faculte:'Faculté SHS', departement:'Département SIC' },
  { id:4, etudiant:'Yacine Boudiaf', company:'Cabinet Maître Belkacem', theme:'Conformité juridique des startups', periode:'Mar – Avr 2026', status:'pending', signed_etudiant:true, signed_entreprise:false, signed_univ:false, faculte:'Faculté de Droit', departement:'Département Droit Privé' }
];

// Instantanés des valeurs d'origine — utilisés pour réinitialiser l'essai à la déconnexion
const DEFAULT_CONVENTIONS = JSON.parse(JSON.stringify(conventions));
const DEFAULT_DEMANDES = JSON.parse(JSON.stringify(demandes));

const notifications = {
  etudiant:[
    { icon:'✅', color:'#D1FAE5', text:'Cevital a accepté votre demande de stage', time:'Il y a 2h', read:false },
    { icon:'📄', color:'#DBEAFE', text:"Convention SF-2026-047 générée — en attente de signature", time:'Il y a 3h', read:false },
    { icon:'⏳', color:'#FFF3CD', text:'Djezzy : demande en cours d\'examen', time:'Il y a 1j', read:true }
  ],
  entreprise:[
    { icon:'📩', color:'#DBEAFE', text:'Nouvelle demande de Djatout Nour El Houda — Master Comm. & RP', time:'Il y a 1h', read:false },
    { icon:'✍️', color:'#EDE9FE', text:'Convention SF-2026-047 en attente de votre signature', time:'Il y a 4h', read:false }
  ],
  universite:[
    { icon:'📋', color:'#D1FAE5', text:'3 nouvelles conventions à valider ce mois-ci', time:'Il y a 30min', read:false },
    { icon:'📊', color:'#DBEAFE', text:'Rapport mensuel des stages disponible', time:'Il y a 1j', read:true }
  ]
};
