/**
 * Catalogue universités (inscription, attestation, conventions).
 * Ajouter une entrée par université : name, logoUrl, faculties, attestation.
 */

const UNIVERSITY_CATALOG = [
  {
    id: 'uam-bejaia',
    name: 'Université Abderrahmane Mira — Béjaïa',
    logoUrl: 'assets/logos/universite-bejaia.png',
    registrationHint: 'Université de Béjaïa · جامعة بجاية · Tasdawit n Bgayet',
    faculties: [
      'Faculté de Technologie',
      'Faculté des Sciences Exactes',
      'Faculté des Sciences de la Nature et de la Vie',
      'Faculté des Lettres et des Langues',
      'Faculté de Droit et des Sciences Politiques',
      'Faculté de Médecine',
      'Faculté des Sciences Économiques, Commerciales et des Sciences de Gestion',
      'Faculté des Sciences Humaines et Sociales',
    ],
    attestation: {
      headerNameFr: 'UNIVERSITÉ DE BÉJAÏA',
      ministryAr: 'وزارة التعليم العالي والبحث العلمي',
      universityAr: 'جامعة بجاية',
      taglineAmazigh: 'Tasdawit n Bgayet',
      shortNameFr: 'Université de Béjaïa',
      enrolledAt: "l'Université de Béjaïa",
      city: 'Béjaïa',
    },
  },
];

function findUniversityCatalogEntry(universityName) {
  const name = String(universityName || '').trim();
  if (!name) return null;
  return UNIVERSITY_CATALOG.find(function(u) { return u.name === name; }) || null;
}

function getUniversitiesForStudentRegistration() {
  return UNIVERSITY_CATALOG.map(function(u) {
    return {
      id: u.id,
      name: u.name,
      logoUrl: u.logoUrl,
      registrationHint: u.registrationHint || '',
      faculties: u.faculties.slice(),
    };
  });
}

function universityLogoHtml(logoUrl, alt) {
  if (!logoUrl) return '';
  return '<img src="' + logoUrl + '" alt="' + (alt || '') + '" style="max-height:72px;max-width:100%;object-fit:contain">';
}

function getUniversityRegistrationBranding(universityName) {
  const uni = findUniversityCatalogEntry(universityName);
  if (!uni) {
    return { visible: false, logoHtml: '', hint: '', name: '' };
  }
  return {
    visible: true,
    name: uni.name,
    logoHtml: universityLogoHtml(uni.logoUrl, uni.attestation.shortNameFr || uni.name),
    hint: uni.registrationHint || uni.attestation.shortNameFr || '',
  };
}

function updateStudentRegUniversityBranding() {
  const wrap = document.getElementById('reg_stu_university_branding');
  if (!wrap) return;
  const uniSel = document.getElementById('reg_stu_university');
  const branding = getUniversityRegistrationBranding(uniSel ? uniSel.value : '');
  if (!branding.visible) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2)">
      <div style="flex:0 0 140px;text-align:center">${branding.logoHtml}</div>
      <div>
        <div class="text-sm" style="font-weight:600;color:var(--text)">${branding.name}</div>
        ${branding.hint ? `<div class="text-xs text-muted" style="margin-top:6px;line-height:1.5">${branding.hint}</div>` : ''}
      </div>
    </div>`;
}

function attestationGenericLogoSvg(label) {
  const initials = String(label || 'UN')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function(w) { return w[0]; })
    .join('')
    .toUpperCase() || 'UN';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" width="90" height="72" aria-hidden="true">'
    + '<circle cx="50" cy="36" r="28" fill="#1B365D" opacity="0.15"/>'
    + '<text x="50" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#1B365D">' + initials + '</text>'
    + '</svg>';
}

function getAttestationUniversityBranding(universityName) {
  const name = String(universityName || '').trim();
  const uni = findUniversityCatalogEntry(name);
  if (uni && uni.attestation) {
    const a = uni.attestation;
    return {
      id: uni.id,
      displayName: a.shortNameFr || name,
      headerNameFr: a.headerNameFr,
      ministryAr: a.ministryAr,
      universityAr: a.universityAr,
      taglineAmazigh: a.taglineAmazigh || '',
      enrolledAt: a.enrolledAt,
      city: a.city,
      logoUrl: uni.logoUrl,
      logoHtml: universityLogoHtml(uni.logoUrl, a.shortNameFr),
    };
  }
  const display = name || 'Université de Béjaïa';
  return {
    id: 'generic',
    displayName: display,
    headerNameFr: display.toUpperCase(),
    ministryAr: 'وزارة التعليم العالي والبحث العلمي',
    universityAr: display,
    taglineAmazigh: '',
    enrolledAt: display.indexOf('Université') === 0 ? display : ("l'" + display),
    city: 'Béjaïa',
    logoUrl: '',
    logoHtml: attestationGenericLogoSvg(display),
  };
}

function attestationOfficialStyles() {
  return `
.attestation-sheet{border:3px double #000;padding:22px 26px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#000;line-height:1.85;box-sizing:border-box;background:#fff}
.attestation-sheet .att-rep{text-align:center;font-size:11px;font-weight:600;margin-bottom:10px}
.attestation-sheet .att-header-grid{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px}
.attestation-sheet .att-header-side{flex:0 0 30%;font-size:9px;line-height:1.35}
.attestation-sheet .att-header-side.left{text-align:left}
.attestation-sheet .att-header-side.right{text-align:right;direction:rtl}
.attestation-sheet .att-ministry{font-size:9px}
.attestation-sheet .att-uni-name{color:#1B365D;font-weight:bold;font-size:10px;margin-top:6px;line-height:1.25}
.attestation-sheet .att-logo-center{flex:1;text-align:center;padding:0 8px}
.attestation-sheet .att-logo-center img{max-height:78px;max-width:220px;object-fit:contain}
.attestation-sheet .att-title{text-align:center;font-size:26px;font-weight:bold;color:#9ca3af;-webkit-text-stroke:1px #000;text-shadow:1px 1px 0 #000;margin:18px 0 22px;font-family:Georgia,"Times New Roman",serif;letter-spacing:0.5px}
.attestation-sheet .att-body{margin:0 4px;font-size:13px}
.attestation-sheet .att-line{margin:14px 0}
.attestation-sheet .att-val{border-bottom:1px dotted #333;display:inline;padding:0 2px 1px;font-weight:600;min-width:80px}
.attestation-sheet .att-footer{display:flex;justify-content:space-between;margin-top:42px;font-size:10px;text-align:center;gap:12px}
.attestation-sheet .att-footer-col{flex:1;max-width:48%}
.attestation-sheet .att-legal{text-align:center;font-size:9px;margin-top:28px;font-style:italic;color:#333}
.attestation-sheet .att-annexe{margin-top:24px;padding-top:12px;border-top:1px solid #ccc;font-size:11px}
.attestation-sheet .att-annexe h5{font-size:11px;margin:0 0 8px;text-transform:uppercase}
`;
}

function attestationBlankLine(value, minWidth) {
  const v = String(value || '').trim();
  if (v) return '<span class="att-val">' + v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
  return '<span class="att-val" style="min-width:' + (minWidth || 100) + 'px">&nbsp;</span>';
}
