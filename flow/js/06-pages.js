// ══════════════════════════════════
// PAGES
// ══════════════════════════════════
function getPageHTML(id) {
  const u = etuOrEmpty();
  const pages = {

'dashboard':`
<div class="page-header">
  <h2>Bonjour, ${u.name.split(' ')[0]} 👋</h2>
  <p>${u.specialty} · ${u.university}${(() => { const g = normalizeStudentGroup(u); return g.groupType !== 'solo' ? ` · 👥 ${groupTypeLabel(g.groupType)} : ${formatStudentGroupLabel(u)}` : ''; })()}</p>
</div>
<div class="grid-4 mb16">
  ${(()=>{
  const info = typeof getStudentProgressInfo==='function' ? getStudentProgressInfo(u) : { myDem:[], conv:null, accepted:null, pendingN:0, sigCount:0, pct:0, dossierTrend:'—' };
  const myDem = info.myDem;
  const conv = info.conv;
  const accepted = info.accepted;
  const pendingN = info.pendingN;
  const pct = info.pct;
  const convRef = conv ? (conv.reference || (conv.id ? 'SF-2026-0'+(conv.id+46) : '—')) : '—';
  const convCompany = conv ? (conv.company || '—') : (accepted ? accepted.company : (myDem.length ? myDem[0].company : '—'));
  return `
  <div class="stat-card"><div class="num">${myDem.length}</div><div class="lbl">Demandes envoyées</div><div class="trend">${pendingN ? pendingN+' en attente' : myDem.length ? 'Toutes traitées' : 'Aucune candidature'}</div></div>
  <div class="stat-card"><div class="num" style="color:${accepted?'var(--success)':'var(--text3)'}">${accepted?1:0}</div><div class="lbl">Demande acceptée</div><div class="trend trend-up">${accepted ? '✅ '+accepted.company : '—'}</div></div>
  <div class="stat-card"><div class="num" style="color:var(--accent)">${pct}%</div><div class="lbl">Dossier complété</div><div class="trend">${info.dossierTrend}</div></div>
  <div class="stat-card"><div class="num" style="font-size:16px;line-height:1.3">${conv && conv.periode ? conv.periode : (accepted && accepted.duree ? accepted.duree : '—')}</div><div class="lbl">Durée du stage</div><div class="trend" style="color:var(--cyan2)">${accepted || conv ? convCompany : '—'}</div></div>`;
  })()}
</div>
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">📋 Avancement du dossier</div>
    ${typeof buildStudentTimelineHTML==='function' ? buildStudentTimelineHTML(u) : ''}
  </div>
  <div>
    <div class="card mb16">
      <div class="card-title">📄 Ma convention de stage</div>
      ${(()=>{
  const conv = typeof resolveStudentConv==='function' ? resolveStudentConv(u) : null;
  const accepted = (typeof getStudentDemandes==='function'?getStudentDemandes(u):[]).find(d=>d.status==='accepted');
  if(!conv && !accepted){
    const pending = (typeof getStudentDemandes==='function'?getStudentDemandes(u):[]).filter(d=>d.status==='pending');
    if (pending.length) {
      return '<div class="empty-state" style="padding:20px"><div class="ico">⏳</div><p class="text-sm">' + pending.length + ' candidature' + (pending.length>1?'s':'') + ' en attente de réponse</p><p class="text-xs text-muted mt8">' + pending.map(function(d){ return d.company; }).join(' · ') + '</p><button class="btn btn-ghost btn-sm mt12" onclick="navigateTo(\'demandes\')">Voir mes demandes</button></div>';
    }
    return '<div class="empty-state" style="padding:20px"><div class="ico">📄</div><p class="text-sm text-muted">Postulez à une entreprise pour générer votre convention</p><button class="btn btn-cyan btn-sm mt12" onclick="navigateTo(\'search\')">🔍 Rechercher</button></div>';
  }
  if(!conv && accepted){
    return '<div class="empty-state" style="padding:20px"><div class="ico">📄</div><p class="text-sm">Convention créée à l\'acceptation par <strong>'+accepted.company+'</strong></p><p class="text-xs text-muted mt8">Chargement depuis la base…</p><button class="btn btn-cyan btn-sm mt12" onclick="syncEtudiantFromDb().then(function(){ navigateTo(\'dashboard\'); })">🔄 Actualiser</button></div>';
  }
  const sigCount = [conv.signed_entreprise,conv.signed_univ].filter(Boolean).length;
  const convRef = conv.reference || (conv.id ? 'SF-2026-0'+(conv.id+46) : '—');
  const openBtn = conv.id ? 'openConventionById('+conv.id+')' : 'navigateTo(\'convention\')';
  return `
      <div class="flex items-center gap8 mb12">${statusPill(conv.status)}</div>
      <div class="text-sm text-muted mb12">Convention n° ${convRef} — ${conv.company||'—'}</div>
      <div style="margin-bottom:14px">
        <div class="flex justify-between mb8"><span class="text-xs text-muted">Signatures (${sigCount}/2)</span><span class="text-xs text-muted">${Math.round(sigCount/2*100)}%</span></div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${Math.round(sigCount/2*100)}%"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
        <div class="flex items-center gap8"><span style="color:${conv.signed_entreprise?'var(--success)':'var(--text3)'};font-size:14px">${conv.signed_entreprise?'✅':'⏳'}</span><span class="text-sm text-muted">Entreprise — ${conv.signed_entreprise?'signée':'non signée'}</span></div>
        <div class="flex items-center gap8"><span style="color:${conv.signed_univ?'var(--success)':'var(--text3)'};font-size:14px">${conv.signed_univ?'✅':'⏳'}</span><span class="text-sm text-muted">Doyenne — ${conv.signed_univ?'signée':'non signée'}</span></div>
      </div>
      <button class="btn btn-cyan w-full" onclick="${openBtn}">📄 Voir la convention</button>`;
  })()}
    </div>
    <div class="card">
      <div class="card-title">🔔 Notifications récentes</div>
      ${(()=>{
  const notifs = typeof buildStudentDashboardNotifs==='function' ? buildStudentDashboardNotifs(u) : (notifications.etudiant||[]).slice(0,2);
  return notifs.map(n=>`
        <div class="notif-item ${n.read?'':'notif-unread'}">
          <div class="notif-ico" style="background:${n.color}">${n.icon}</div>
          <div><p>${n.text}</p><div class="time">${n.time}</div></div>
        </div>`).join('');
  })()}
    </div>
  </div>
</div>`,

'search':`
<div class="page-header">
  <h2>🔍 Recherche d'entreprise & de prestataires</h2>
  <p>Tous secteurs confondus — entreprises, cabinets, institutions partenaires, filtrés par domaine et par wilaya</p>
</div>
<div class="search-bar">
  <div class="search-input-wrap">
    <span class="search-icon-pos">🔍</span>
    <input class="search-input" id="searchInput" placeholder="Nom, secteur, thème..." oninput="filterCompanies()">
  </div>
  <select class="filter-select" id="domainFilter" onchange="filterCompanies()">
    ${domains.map(d=>`<option value="${d}">${d}</option>`).join('')}
  </select>
  <select class="filter-select" id="wilayaFilter" onchange="filterCompanies()">
    ${wilayas.map(w=>`<option value="${w}">${w}</option>`).join('')}
  </select>
</div>
<div class="company-grid" id="companyGrid">${(()=>{
  const list = typeof getRegisteredCompanies === 'function' ? getRegisteredCompanies() : companies.filter(function(c) { return c.fromDb; });
  if (!list.length) return typeof companiesSearchEmptyHTML === 'function' ? companiesSearchEmptyHTML() : '<div class="empty-state" style="grid-column:1/-1"><p>Aucune entreprise inscrite</p></div>';
  return list.map(function(c) { return companyCardHTML(c); }).join('');
})()}</div>`,

'demandes':`
<div class="page-header">
  <h2>📋 Mes demandes de stage</h2>
  <p>Suivez l'état de toutes vos candidatures</p>
</div>
${(()=>{ const myDemandes = typeof getStudentDemandes==='function' ? getStudentDemandes(u) : demandes.filter(d=>(d.studentName||'')===u.name);
  const accepted = myDemandes.find(d=>d.status==='accepted'); const pendingCount = myDemandes.filter(d=>d.status==='pending').length;
  if(!accepted || !pendingCount) return '';
  return `
<div class="card mb16" style="border-left:3px solid var(--success);background:rgba(0,196,140,0.05)">
  <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:12px">
    <div>
      <div class="text-sm" style="font-weight:600">✅ Vous avez un accord avec ${accepted.company}</div>
      <div class="text-xs text-muted mt8">Vous avez encore ${pendingCount} demande${pendingCount>1?'s':''} en attente. Vous pouvez les annuler maintenant que votre stage est confirmé.</div>
    </div>
    <button class="btn btn-danger btn-sm" onclick="annulerAutresDemandes()">🗑️ Annuler les ${pendingCount} demande${pendingCount>1?'s':''} en attente</button>
  </div>
</div>`; })()}
<div class="card">
  <div class="flex justify-between items-center mb16">
    <div class="card-title" style="margin:0">Toutes mes demandes</div>
    <button class="btn btn-cyan btn-sm" onclick="navigateTo('search')">+ Nouvelle demande</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Entreprise</th><th>Thème proposé</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${(()=>{ const myDemandes = typeof getStudentDemandes==='function' ? getStudentDemandes(u) : demandes.filter(d=>(d.studentName||'')===u.name);
          if(!myDemandes.length) return '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:20px">Aucune candidature envoyée pour le moment</td></tr>';
          return myDemandes.map(d=>{
            const matchingConv = conventions.find(function(c) {
              if (!c.fromDb) return false;
              if (typeof conventionBelongsToStudent === 'function') return conventionBelongsToStudent(c, u);
              return (c.etudiant || '') === u.name
                && (c.company === d.company || (d.entrepriseId && c.entrepriseId === d.entrepriseId));
            }) || conventions.find(function(c) {
              return c.company === d.company && (c.etudiant || '').includes(u.name.split(' ')[0]);
            });
          return `<tr>
          <td style="display:flex;align-items:center;gap:10px;padding:12px 14px">
            <div style="width:32px;height:32px;border-radius:6px;overflow:hidden;flex-shrink:0">${(companyLogos[d.company]||{svg:''}).svg||`<div style="width:32px;height:32px;background:var(--navy);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700">${d.company.slice(0,2)}</div>`}</div>
            <strong>${d.company}</strong>
          </td>
          <td style="max-width:200px">${d.theme}</td>
          <td>${d.date}</td>
          <td>${statusPill(d.status)}</td>
          <td>${d.status==='pending'?`<button class="btn btn-ghost btn-sm" onclick="annulerDemande(${d.id})">Annuler</button>`:d.status==='accepted'?(matchingConv?`<button class="btn btn-cyan btn-sm" onclick="openConventionById(${matchingConv.id})">Convention</button>`:`<span class="text-xs text-muted">En cours de génération</span>`):'—'}</td>
        </tr>`;}).join('');
        })()}
      </tbody>
    </table>
  </div>
</div>`,

'convention':`
<div class="page-header">
  <h2>📄 Ma convention de stage</h2>
  <p>Convention dématérialisée — Suivi et validation en ligne</p>
</div>
${(()=>{
  // Convention étudiant — priorité à la convention signée en base
  const myConv = typeof getStudentConvention === 'function'
    ? getStudentConvention(u)
    : conventions.find(c=>(c.etudiant||'').includes(u.name.split(' ')[0]));

  if(!myConv){
    const acceptedDem = (typeof getStudentDemandes==='function'?getStudentDemandes(u):[]).find(d=>d.status==='accepted');
    if(acceptedDem){
      return `
<div class="card">
  <div class="empty-state">
    <div class="ico">⏳</div>
    <p>Convention en cours de génération</p>
    <p class="text-xs text-muted mt8">Votre candidature chez <strong>${acceptedDem.company}</strong> a été acceptée — synchronisation avec la base en cours.</p>
    <button class="btn btn-cyan mt16" onclick="syncEtudiantFromDb().then(function(){ navigateTo('convention'); })">🔄 Actualiser</button>
  </div>
</div>`;
    }
    return `
<div class="card">
  <div class="empty-state">
    <div class="ico">📄</div>
    <p>Aucune convention pour le moment</p>
    <p class="text-xs text-muted mt8">Votre convention sera générée automatiquement par votre département dès qu'une entreprise aura accepté l'une de vos candidatures.</p>
    <button class="btn btn-cyan mt16" onclick="navigateTo('search')">🔍 Rechercher une entreprise</button>
  </div>
</div>`;
  }

  const sigCount = [myConv.signed_entreprise,myConv.signed_univ].filter(Boolean).length;
  const sigEnt = myConv.signed_entreprise;
  const sigUniv = myConv.signed_univ;
  const convRef = myConv.reference || ('SF-2026-0'+(myConv.id+46));
  const isSignedInDb = !!(myConv.fromDb && myConv.signed_entreprise && myConv.signed_univ);

  return `
${isSignedInDb ? '<div class="card mb16" style="border-left:4px solid var(--success);padding:14px 18px"><p class="text-sm" style="margin:0">✅ Convention signée et enregistrée en base — document officiel ci-dessous.</p></div>' : ''}
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">Informations de la convention</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${infoRow('Référence', convRef)}
      ${infoRow('Étudiante', formatStudentGroupLabel(u))}
      ${infoRow('Spécialité', u.specialty || myConv.studentSpecialty || '—')}
      ${infoRow('Entreprise d\'accueil', myConv.company)}
      ${infoRow('Encadrant entreprise', myConv.encadrant_entreprise || '—')}
      ${infoRow('Encadrant université (suivi pédagogique)','Dr. Hider Fouzia')}
      ${infoRow('Signataire université (Doyenne)','Pr. Soualmia Abderrahmane — Chef de doyennat, Faculté SHS')}
      ${infoRow('Thème PFE', myConv.theme)}
      ${infoRow('Période', myConv.periode)}
    </div>
    <div style="margin-top:20px;display:flex;gap:8px">
      <button class="btn btn-cyan" onclick="openConventionById(${myConv.id})">📄 Aperçu de ma convention</button>
      <button class="btn btn-ghost" onclick="downloadConvention(${myConv.id})">⬇ Télécharger</button>
    </div>
  </div>
  <div class="card">
    <div class="card-title">🖊️ État des signatures</div>
    <div id="sigStatusEnt">${signRow('Entreprise', myConv.company, sigEnt, sigEnt?'Signé':'En attente')}</div>
    <div id="sigStatusUniv">${signRow('Université — Doyenne (Chef de doyennat)','Pr. Soualmia Abderrahmane', sigUniv, sigUniv?'Signé':'En attente')}</div>
    <div style="margin-top:20px">
      <div class="flex justify-between mb8"><span class="text-xs text-muted">Progression signatures</span><span class="text-xs text-muted" id="sigCount">${sigCount}/2</span></div>
      <div class="progress-wrap"><div class="progress-bar" id="sigProgress" style="width:${Math.round(sigCount/2*100)}%"></div></div>
    </div>
    
  </div>
</div>
${(()=>{ const company=companies.find(c=>c.name===myConv.company); if(!company) return '';
  const ratings = sharedData.companyRatings || {};
  const myRating = (ratings[company.id] && ratings[company.id][u.name]) ? ratings[company.id][u.name].value : 0;
  return `
<div class="card mt16">
  <div class="card-title">⭐ Noter mon entreprise d'accueil</div>
  <p class="text-sm text-muted mb12">Partagez votre expérience de stage chez <strong>${company.name}</strong> — votre note contribue à la note globale visible par les autres étudiants.</p>
  <div id="companyRatingWidget">${starRatingHTML(company.id, myRating, true)}</div>
</div>`; })()}`;
})()}`,

'dossier':`
<div class="page-header">
  <h2>📁 Suivi du dossier complet</h2>
  <p>Tous vos documents centralisés et téléchargeables</p>
</div>
${(() => {
  const conv = typeof resolveStudentConv === 'function' ? resolveStudentConv(u) : null;
  const report = conv ? getStudentStageReport(conv) : null;
  const attestation = conv ? getStudentStageAttestation(conv) : null;
  const signed = conv && conv.signed_entreprise && conv.signed_univ;
  const ended = conv && isStagePeriodEnded(conv);
  const finDate = conv ? (conv.dateFin || conv.date_fin) : null;
  const convRef = conv ? (conv.reference || ('SF-2026-0' + (conv.id + 46))) : '—';
  const convStatus = signed ? (report ? 'Déposé' : (ended ? 'À déposer' : 'Stage en cours')) : 'En attente signatures';
  const rapportRowStatus = report ? 'active' : (ended && signed ? 'pending' : 'missing');
  const rapportSize = report ? (Math.round((report.content || '').length / 1024 * 10) / 10 + ' Ko') : '—';
  const progressSigned = signed ? 100 : 0;
  const progressStage = signed ? (ended ? 100 : 50) : 0;
  const progressReport = report ? 100 : 0;
  const progressAttestation = attestation ? 100 : 0;

  let rapportAction = '';
  if (report) {
    rapportAction = `<button class="btn btn-ghost btn-sm" onclick="openRapportViewByConv(${conv.id})">👁 Lire</button>`;
  } else if (ended && signed && conv) {
    rapportAction = `<button class="btn btn-cyan btn-sm" onclick="openSubmitRapportModal(${conv.id})">📤 Déposer</button>`;
  } else if (signed && finDate) {
    rapportAction = `<span class="text-xs text-muted">Dès le ${formatStageDate(finDate)}</span>`;
  } else {
    rapportAction = `<span class="text-xs text-muted">Non disponible</span>`;
  }

  let attestationAction = '';
  if (attestation) {
    attestationAction = `<button class="btn btn-ghost btn-sm" onclick="openAttestationViewByConv(${conv.id})">👁 Lire</button>
      <button class="btn btn-ghost btn-sm" onclick="downloadAttestationPdfByConv(${conv.id})">⬇ PDF</button>`;
  } else if (ended && signed && conv) {
    attestationAction = `<button class="btn btn-cyan btn-sm" onclick="openSubmitAttestationModal(${conv.id})">📤 Compléter</button>`;
  } else if (signed && conv) {
    attestationAction = `<button class="btn btn-ghost btn-sm" onclick="openAttestationPreviewModal(${conv.id})">📋 Modèle</button>`;
  } else {
    attestationAction = `<span class="text-xs text-muted">Non disponible</span>`;
  }

  return `
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">Documents du dossier</div>
    ${conv ? docRow('Convention de stage — ' + conv.company, 'PDF', signed ? 'active' : 'pending', signed ? 'Signée' : 'En cours') : docRow('Convention de stage', 'PDF', 'missing', '—')}
    <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="flex items-center gap8"><span>${report ? '📄' : (ended ? '📝' : '⏳')}</span><div><div class="text-sm">Rapport de stage final</div><div class="text-xs text-muted">PDF · ${rapportSize}${conv ? ' · ' + conv.company : ''}</div></div></div>
      ${rapportAction}
    </div>
    <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="flex items-center gap8"><span>${attestation ? '📄' : (signed ? '📋' : '❌')}</span><div><div class="text-sm">Attestation de stage</div><div class="text-xs text-muted">PDF · ${attestation ? 'Envoyée' : (signed ? 'Modèle pré-rempli' : '—')}${conv ? ' · ' + conv.company : ''}</div></div></div>
      <div class="flex gap4">${attestationAction}</div>
    </div>
    ${docRow("Fiche d'évaluation entreprise", 'PDF', report ? 'pending' : 'missing', '—')}
  </div>
  <div class="card">
    <div class="card-title">Avancement global</div>
    ${progressRow('Profil étudiant', 100)}
    ${progressRow('Convention signée', progressSigned)}
    ${progressRow('Stage actif', progressStage)}
    ${progressRow('Rapport déposé', progressReport)}
    ${progressRow('Attestation envoyée', progressAttestation)}
    ${conv ? `<div class="text-xs text-muted mt12">Convention <strong>${convRef}</strong> · ${convStatus}${finDate ? '<br>Fin de stage : ' + formatStageDate(finDate) : ''}</div>` : ''}
    ${ended && signed && !report ? `<button class="btn btn-cyan w-full mt16" onclick="openSubmitRapportModal(${conv.id})">📤 Déposer mon rapport de stage</button>` : ''}
    ${ended && signed && !attestation ? `<button class="btn btn-ghost w-full mt8" onclick="openSubmitAttestationModal(${conv.id})">📋 Compléter mon attestation de stage</button>` : ''}
    ${report ? `<div class="card mt16" style="padding:12px;background:var(--bg2);border-left:3px solid var(--success)"><p class="text-sm" style="margin:0">✅ Rapport transmis à <strong>${report.entrepriseNom || conv.company}</strong> le ${formatStageDate(report.submittedAt)}</p></div>` : ''}
    ${attestation ? `<div class="card mt8" style="padding:12px;background:var(--bg2);border-left:3px solid var(--cyan)"><p class="text-sm" style="margin:0">✅ Attestation envoyée à <strong>${attestation.entrepriseNom || conv.company}</strong> le ${formatStageDate(attestation.submittedAt)} · <button class="btn btn-ghost btn-sm" style="margin-left:4px" onclick="downloadAttestationPdfByConv(${conv.id})">Télécharger PDF</button></p></div>` : ''}
  </div>
</div>`;
})()}`,

'profil':`
<div class="page-header">
  <h2>👤 Mon profil étudiante</h2>
  <p>Informations visibles par les entreprises et l'université</p>
</div>
<div class="grid-2 gap16">
  <div class="card">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:16px;background:var(--navy);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:var(--cyan)">${u.avatar||u.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}</div>
      <div>
        <div class="font-syne" style="font-size:18px">${u.name}</div>
        <div class="text-muted text-sm">${u.specialty||'—'}</div>
        <div class="text-xs text-muted">${u.university||'—'}</div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Nom complet</label><input id="profileName" class="form-input" value="${u.name}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Spécialité</label><input id="profileSpecialty" class="form-input" value="${u.specialty||''}"></div>
      <div class="form-group"><label class="form-label">Promotion</label><input id="profilePromo" class="form-input" value="${u.promo||''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Université</label><input id="profileUniversity" class="form-input" value="${u.university||''}"></div>
    <div class="form-group"><label class="form-label">Email universitaire</label><input id="profileEmail" class="form-input" value="${u.email||''}"></div>
    <div class="form-group"><label class="form-label">Encadrant universitaire</label><input id="profileEncadrant" class="form-input" value="${u.encadrant||''}" placeholder="Ex: Dr. Hider Fouzia"></div>
    <div class="form-group"><label class="form-label">Thème PFE</label><input id="profileTheme" class="form-input" value="${u.theme||''}"></div>
    <button class="btn btn-cyan" onclick="saveProfile()">Enregistrer</button>
  </div>
  <div class="card">
    <div class="card-title">CV & Documents</div>
    ${docRow('Curriculum Vitae','PDF','active','340 KB')}
    ${docRow('Lettre de motivation','PDF','active','120 KB')}
    ${docRow('Relevé de notes M1','PDF','active','890 KB')}
    ${docRow('Attestation inscription','PDF','pending','—')}
    <div style="margin-top:16px"><button class="btn btn-ghost w-full">+ Ajouter un document</button></div>
  </div>
</div>
<div class="card mt16">
  <div class="card-title">👥 Groupe de stage (${groupTypeLabel(normalizeStudentGroup(u).groupType)})</div>
  ${(() => {
    const group = normalizeStudentGroup(u);
    if (group.groupType === 'solo' || !group.members.length) {
      return `<p class="text-sm text-muted mb12">Vous travaillez seul(e) sur ce PFE. Vous pouvez modifier votre groupe depuis une nouvelle inscription ou contacter l'administration.</p>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nom complet du binôme</label><input id="binomeName" class="form-input" placeholder="Ex: Hamadach Tinhinan"></div>
        <div class="form-group"><label class="form-label">Email universitaire</label><input id="binomeEmail" class="form-input" placeholder="Ex: t.hamadach@univ-bejaia.dz"></div>
      </div>
      <button class="btn btn-cyan" onclick="addBinome()">+ Ajouter un binôme (démo locale)</button>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:10px">
      <div class="flex items-center justify-between" style="border:1px solid var(--border);border-radius:var(--r2);padding:14px;background:rgba(0,196,140,0.04)">
        <div><div class="text-sm" style="font-weight:600">${u.name} (vous)</div><div class="text-xs text-muted">${u.matricule || ''} · ${u.email || ''}</div></div>
        <span class="status-pill s-active">Titulaire</span>
      </div>
      ${group.members.map((m, i) => `
        <div class="flex items-center justify-between" style="border:1px solid var(--border);border-radius:var(--r2);padding:14px">
          <div class="flex items-center gap12">
            <div style="width:44px;height:44px;border-radius:12px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;color:var(--navy)">${(m.avatar || m.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase())}</div>
            <div>
              <div class="text-sm" style="font-weight:600">${m.name}</div>
              <div class="text-xs text-muted">${m.email || '—'}${m.matricule ? ' · ' + m.matricule : ''}</div>
            </div>
          </div>
          <span class="text-xs text-muted">Coéquipier ${i + 1}</span>
        </div>`).join('')}
    </div>
    <p class="text-xs text-muted mt12">Ce groupe partage le même thème PFE, la même entreprise d'accueil et la même convention de stage.</p>`;
  })()}
</div>`,

// ── ENTREPRISE ──────────────
'ent-dashboard':`
<div class="page-header">
  <h2>Tableau de bord — ${state.user.company||state.user.name} 🏢</h2>
  <p>Gestion des stages PFE · Campagne ${new Date().getFullYear()} · <span class="text-xs text-muted">Candidatures reçues en temps réel</span></p>
</div>
${(()=>{ const myDemandes = typeof getEntrepriseDemandes === 'function' ? getEntrepriseDemandes() : demandes.filter(function(d) { return typeof belongsToCurrentEntreprise === 'function' ? belongsToCurrentEntreprise(d) : d.company === (state.user.company || state.user.name); });
  const received = myDemandes.length;
  const accepted = myDemandes.filter(d=>d.status==='accepted').length;
  const myConvs = typeof getEntrepriseConventions === 'function' ? getEntrepriseConventions() : conventions.filter(function(c) { return typeof belongsToCurrentEntreprise === 'function' ? belongsToCurrentEntreprise(c) : c.company === (state.user.company || state.user.name); });
  const toSign = myConvs.filter(c=>c.status!=='archived' && c.status!=='signed').length;
  const active = myConvs.filter(c=>c.status==='active'||c.status==='signed').length;
  return `
<div class="grid-4 mb16">
  <div class="stat-card"><div class="num">${received}</div><div class="lbl">Demandes reçues</div></div>
  <div class="stat-card"><div class="num" style="color:var(--success)">${accepted}</div><div class="lbl">Stages acceptés</div></div>
  <div class="stat-card"><div class="num" style="color:var(--accent)">${toSign}</div><div class="lbl">Convention(s) à signer</div></div>
  <div class="stat-card"><div class="num" style="color:var(--cyan2)">${active}</div><div class="lbl">Stagiaires actifs</div></div>
</div>
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">📩 Demandes récentes</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Étudiant(e)</th><th>Thème</th><th>Encadrant</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${myDemandes.length ? myDemandes.map(d=>`
          <tr>
            <td><strong>${d.studentLabel||d.studentName||'—'}</strong></td>
            <td style="max-width:200px">${d.theme}</td>
            <td class="text-sm">${d.status==='accepted' && d.encadrant && d.encadrant!=='—' ? d.encadrant : '—'}</td>
            <td>${d.date}</td>
            <td>${d.status==='pending'
              ? `<div style="display:flex;gap:6px"><button class="btn btn-success btn-sm" onclick="openAcceptDemandeModal(${d.id})">✓ Accepter</button><button class="btn btn-danger btn-sm" onclick="refuserDemandeById(${d.id})">✕</button></div>`
              : statusPill(d.status)}</td>
          </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:20px">Aucune demande reçue pour le moment</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <div class="card-title">📄 Conventions à signer</div>
    ${(()=>{ const myConvs = (typeof getEntrepriseConventions === 'function' ? getEntrepriseConventions() : conventions.filter(function(c) { return typeof belongsToCurrentEntreprise === 'function' ? belongsToCurrentEntreprise(c) : c.company === (state.user.company || state.user.name); })).filter(function(c) { return c.status !== 'archived'; });
      if(!myConvs.length) return '<div class="empty-state"><div class="ico">📄</div><p>Aucune convention en attente</p></div>';
      return myConvs.map(conv=>{
        const sigCount=[conv.signed_entreprise,conv.signed_univ].filter(Boolean).length;
        return `<div style="border:1px solid var(--border);border-radius:var(--r2);padding:16px;margin-bottom:10px">
        <div class="flex justify-between items-center mb8">
          <strong class="text-sm">SF-2026-0${conv.id+46} — ${conv.etudiant}</strong>
          ${statusPill(conv.status)}
        </div>
        <div class="text-xs text-muted mb12">${conv.theme} — ${conv.periode}</div>
        <div class="text-xs text-muted mb12">Encadrant : ${conv.encadrant_entreprise||'—'} · Signatures : ${sigCount}/2 ${conv.signed_entreprise?'· déjà signée par votre entreprise':''}</div>
        <button class="btn btn-cyan btn-sm" onclick="openConventionById(${conv.id})">${conv.signed_entreprise?'👁️ Voir la convention':'✍️ Signer la convention'}</button>
      </div>`;
      }).join('');
    })()}
  </div>
</div>`; })()}`,

'ent-demandes':`
<div class="page-header">
  <h2>📩 Demandes de stage reçues</h2>
</div>
<div class="card">
  <div class="table-wrap">
    <table>
      <thead><tr><th>Étudiant(e)</th><th>Thème</th><th>Encadrant</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${(()=>{ const myDemandes = typeof getEntrepriseDemandes === 'function' ? getEntrepriseDemandes() : demandes.filter(function(d) { return typeof belongsToCurrentEntreprise === 'function' ? belongsToCurrentEntreprise(d) : d.company === (state.user.company || state.user.name); });
          if(!myDemandes.length) return '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Aucune demande reçue pour le moment</td></tr>';
          return myDemandes.map(d=>`<tr>
            <td><strong>${d.studentLabel||d.studentName||'—'}</strong></td>
            <td style="max-width:220px">${d.theme}</td>
            <td class="text-sm">${d.status==='accepted' && d.encadrant && d.encadrant!=='—' ? d.encadrant : (d.status==='pending' ? '<span class="text-muted">À désigner</span>' : '—')}</td>
            <td>${d.date}</td>
            <td>${statusPill(d.status)}</td>
            <td>${d.status==='pending'
              ? `<div style="display:flex;gap:6px"><button class="btn btn-success btn-sm" title="Accepter et désigner l'encadrant" onclick="openAcceptDemandeModal(${d.id})">✓</button><button class="btn btn-danger btn-sm" onclick="refuserDemandeById(${d.id})">✕</button></div>`
              : d.status==='accepted'
                ? (()=>{ const c = conventions.find(function(x) { return x.fromDb && (x.etudiant || '') === (d.studentName || '') && (typeof belongsToCurrentEntreprise === 'function' ? belongsToCurrentEntreprise(x) : x.company === d.company); });
                  return c ? `<button class="btn btn-cyan btn-sm" onclick="openConventionById(${c.id})">Voir convention</button>` : `<span class="text-xs text-muted">Convention en cours…</span>`;
                })()
                : '—'}</td>
          </tr>`).join('');
        })()}
      </tbody>
    </table>
  </div>
</div>`,

'ent-conventions':`
<div class="page-header"><h2>📄 Conventions de stage</h2></div>
<div class="card">
  <div class="table-wrap">
    <table>
      <thead><tr><th>Référence</th><th>Étudiant(e)</th><th>Encadrant</th><th>Thème</th><th>Période</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${(()=>{ const myConvs = typeof getEntrepriseConventions === 'function' ? getEntrepriseConventions() : conventions.filter(function(c) { return typeof belongsToCurrentEntreprise === 'function' ? belongsToCurrentEntreprise(c) : c.company === (state.user.company || state.user.name); });
          if(!myConvs.length) return '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:20px">Aucune convention pour le moment</td></tr>';
          return myConvs.map(c=>`<tr>
          <td><strong>${c.reference||('SF-2026-0'+(c.id+46))}</strong></td>
          <td>${c.etudiant}</td>
          <td class="text-sm">${c.encadrant_entreprise||'—'}</td>
          <td style="max-width:180px">${c.theme}</td>
          <td>${c.periode}</td>
          <td>${statusPill(c.status)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="openConventionById(${c.id})">Voir</button></td>
        </tr>`).join('');
        })()}
      </tbody>
    </table>
  </div>
</div>`,

'ent-stagiaires':`
<div class="page-header"><h2>👥 Stagiaires — ${state.user.company||state.user.name||'Entreprise'}</h2></div>
${(() => {
  const rapports = state.entrepriseRapports || [];
  const attestations = state.entrepriseAttestations || [];
  let html = '';
  if (attestations.length) {
    html += `<div class="card mb16">
      <div class="card-title">📋 Attestations de stage reçues</div>
      ${attestations.map(a => `<div style="border:1px solid var(--border);border-radius:var(--r2);padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div class="text-sm" style="font-weight:600">${a.studentName}</div>
          <div class="text-xs text-muted">${(a.prefilled && a.prefilled.theme) || '—'}</div>
          <div class="text-xs text-muted mt4">Reçue le ${formatStageDate(a.submittedAt)}</div>
        </div>
        <div class="flex gap4">
          <button class="btn btn-ghost btn-sm" onclick="openAttestationViewById('${a.id}')">Voir</button>
          <button class="btn btn-cyan btn-sm" onclick="downloadAttestationPdfByConv(${a.conventionId})">⬇ PDF</button>
        </div>
      </div>`).join('')}
    </div>`;
  }
  if (rapports.length) {
    html += `<div class="card mb16">
      <div class="card-title">📝 Rapports de stage reçus</div>
      ${rapports.map(r => `<div style="border:1px solid var(--border);border-radius:var(--r2);padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div class="text-sm" style="font-weight:600">${r.studentName}</div>
          <div class="text-xs text-muted">${r.title}</div>
          <div class="text-xs text-muted mt4">Déposé le ${formatStageDate(r.submittedAt)} · ${r.summary || (r.content || '').slice(0, 80) + '…'}</div>
        </div>
        <button class="btn btn-cyan btn-sm" onclick="openRapportViewById('${r.id}')">Lire le rapport</button>
      </div>`).join('')}
    </div>`;
  }
  return html;
})()}
<div class="grid-2 gap16">
  ${(() => {
    const company = state.user.company || state.user.name;
    const mine = conventions.filter(c => c.company === company || (c.entrepriseId && state.user.entrepriseId && c.entrepriseId === state.user.entrepriseId));
    if (!mine.length) {
      return '<div class="card"><div class="empty-state" style="padding:24px"><div class="ico">👥</div><p class="text-sm text-muted">Aucun stagiaire pour le moment</p></div></div>';
    }
    return mine.map(c => {
      const initials = (c.etudiant || 'ET').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const sigN = [c.signed_entreprise, c.signed_univ].filter(Boolean).length;
      const fin = c.dateFin || c.date_fin;
      const ended = typeof isStagePeriodEnded === 'function' && isStagePeriodEnded(c);
      const report = (state.entrepriseRapports || []).find(r => r.conventionId === c.id);
      const attestation = (state.entrepriseAttestations || []).find(a => a.conventionId === c.id);
      return `<div class="card">
    <div class="flex items-center gap12 mb12">
      <div style="width:44px;height:44px;border-radius:12px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;color:var(--navy)">${initials}</div>
      <div><div class="font-syne" style="font-size:14px">${c.etudiant}</div><div class="text-xs text-muted">${c.faculte || '—'} · ${c.departement || '—'}</div></div>
    </div>
    <div class="text-sm mb8">${c.theme || '—'}</div>
    <div class="text-xs text-muted mb10">${c.periode || '—'}${fin ? ' · Fin : ' + formatStageDate(fin) : ''}</div>
    <div class="flex justify-between mb6"><span class="text-xs text-muted">Convention</span><span class="text-xs text-muted">${sigN}/2 signatures</span></div>
    <div class="progress-wrap mb10"><div class="progress-bar" style="width:${Math.round(sigN/2*100)}%"></div></div>
    ${report ? '<span class="status-pill s-active" style="font-size:10px;margin-right:6px">Rapport reçu ✅</span>' : (ended ? '<span class="status-pill s-pending" style="font-size:10px;margin-right:6px">En attente rapport</span>' : '<span class="text-xs text-muted">Stage en cours</span>')}
    ${attestation ? '<span class="status-pill s-active" style="font-size:10px">Attestation reçue ✅</span>' : (ended ? '<span class="status-pill s-pending" style="font-size:10px">En attente attestation</span>' : '')}
  </div>`;
    }).join('');
  })()}
</div>`,

'ent-profil':`
${(() => {
  const u = state.user || {};
  const nom = u.company || 'Mon entreprise';
  const secteur = u.sector || '';
  const wilaya = u.wilaya || '';
  const logoHtml = (companyLogos[nom] && companyLogos[nom].svg)
    ? companyLogos[nom].svg
    : '<div style="width:64px;height:64px;border-radius:12px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px">' + nom.slice(0,2).toUpperCase() + '</div>';
  const esc = (v) => String(v || '').replace(/"/g, '&quot;');
  return `
<div class="page-header">
  <h2>🏢 Profil — ${nom}</h2>
  <p class="text-sm text-muted">Identifiant connexion : <strong>${u.identifiant || '—'}</strong></p>
</div>
<div class="card" style="max-width:640px">
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
    <div style="width:64px;height:64px;overflow:hidden;border-radius:12px">${logoHtml}</div>
    <div>
      <div class="font-syne" style="font-size:18px">${nom}</div>
      <div class="text-muted text-sm">${secteur || 'Secteur'} — ${wilaya || 'Wilaya'}</div>
    </div>
  </div>
  <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin-bottom:16px;font-size:12px;font-weight:600;color:var(--text2)">📋 Identité légale</div>
  <div class="form-group"><label class="form-label">Raison sociale</label><input id="entProfilNom" class="form-input" value="${esc(nom)}"></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">NIF</label><input id="entProfilNif" class="form-input" value="${esc(u.nif)}"></div>
    <div class="form-group"><label class="form-label">N° RC</label><input id="entProfilNrc" class="form-input" value="${esc(u.nrc)}"></div>
  </div>
  <div class="form-group"><label class="form-label">NIS</label><input id="entProfilNis" class="form-input" value="${esc(u.nis)}"></div>
  <div style="background:var(--bg2);border-radius:var(--r2);padding:10px 14px;margin:16px 0;font-size:12px;font-weight:600;color:var(--text2)">📍 Coordonnées & activité</div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Secteur</label><input id="entProfilSecteur" class="form-input" value="${esc(secteur)}"></div>
    <div class="form-group"><label class="form-label">Wilaya</label><input id="entProfilWilaya" class="form-input" value="${esc(wilaya)}"></div>
  </div>
  <div class="form-group"><label class="form-label">Adresse</label><input id="entProfilAdresse" class="form-input" value="${esc(u.adresse)}"></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Téléphone</label><input id="entProfilPhone" class="form-input" value="${esc(u.phone)}"></div>
    <div class="form-group"><label class="form-label">Email RH</label><input id="entProfilEmail" class="form-input" type="email" value="${esc(u.email)}"></div>
  </div>
  <div class="form-group"><label class="form-label">Encadrant stages</label><input id="entProfilEncadrant" class="form-input" value="${esc(u.encadrant_stage)}"></div>
  <button class="btn btn-cyan" onclick="saveEntrepriseProfile()">Enregistrer en base</button>
</div>`;
})()}`,

// ── UNIVERSITÉ ──────────────
'univ-dashboard': state.user.type==='universite' ? `
<div class="page-header">
  <h2>Tableau de bord — ${state.user.university} 🏛️</h2>
  <p>${state.user.name} — ${state.user.role_title} · Vue globale de toutes les facultés et départements</p>
</div>
<div class="grid-4 mb16">
  ${(()=>{ const sStudents=filterByScope(getUniversityStudents(),state.user), sConv=filterByScope(conventions,state.user);
    const placed=sStudents.filter(s=>s.status==='active'||s.status==='accepted'||s.status==='archived').length;
    const placementRate = sStudents.length ? Math.round(placed/sStudents.length*100) : 0;
    const toValidate=sConv.filter(c=>c.status!=='archived').length;
    const archived=sConv.filter(c=>c.status==='archived').length;
    return `
  <div class="stat-card"><div class="num">${sStudents.length}</div><div class="lbl">Étudiants — toutes facultés</div></div>
  <div class="stat-card"><div class="num" style="color:var(--success)">${placementRate}%</div><div class="lbl">Taux de placement global</div></div>
  <div class="stat-card"><div class="num" style="color:var(--accent)">${toValidate}</div><div class="lbl">Conventions à valider</div></div>
  <div class="stat-card"><div class="num" style="color:var(--cyan2)">${archived}</div><div class="lbl">Conventions archivées</div></div>`; })()}
</div>
<div class="card mb16">
  <div class="card-title">🏛️ État de chaque faculté & spécialité (département)</div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Faculté</th><th>Département / Spécialité</th><th>Étudiants</th><th>Placés</th><th>Conventions</th><th>Signées complètes</th><th>Archivées</th></tr></thead>
      <tbody>
        ${buildOrgBreakdown().map(fac=>`
          <tr style="background:var(--bg2)">
            <td colspan="2"><strong>${fac.faculte}</strong> <span class="text-xs text-muted">(total)</span></td>
            <td><strong>${fac.totals.students}</strong></td>
            <td><strong>${fac.totals.placed}</strong></td>
            <td><strong>${fac.totals.conventions}</strong></td>
            <td><strong>${fac.totals.signedFull}</strong></td>
            <td><strong>${fac.totals.archived}</strong></td>
          </tr>
          ${fac.departements.map(d=>`
          <tr>
            <td class="text-xs text-muted"></td>
            <td>${d.departement}</td>
            <td>${d.students}</td>
            <td>${d.placed}</td>
            <td>${d.conventions}</td>
            <td>${d.signedFull}</td>
            <td>${d.archived}</td>
          </tr>`).join('')}
        `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">Aucune faculté inscrite pour le moment — utilisez "Comptes & structure" pour en créer</td></tr>'}
      </tbody>
    </table>
  </div>
</div>
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">Répartition des étudiants par spécialité</div>
    ${(()=>{
      const rows = [];
      buildOrgBreakdown().forEach(fac=>{
        fac.departements.forEach(d=>{ if(d.students>0) rows.push({l:d.departement, v:d.students}); });
      });
      const total = rows.reduce((sum,r)=>sum+r.v,0);
      const data = total ? rows.map(r=>({l:r.l, v:Math.round(r.v/total*100)})) : [];
      return data.length ? barChart(data) : '<div class="empty-state"><div class="ico">🎓</div><p>Aucune donnée disponible pour le moment</p></div>';
    })()}
  </div>
  <div class="card">
    <div class="card-title">Conventions / mois</div>
    ${barChart([{l:'Novembre',v:4},{l:'Décembre',v:8},{l:'Janvier',v:14},{l:'Février',v:21}])}
  </div>
</div>
` : `
<div class="page-header">
  <h2>Tableau de bord — ${state.user.faculte||state.user.university} 🏛️</h2>
  <p>${state.user.type==='departement'?state.user.departement+' · ':''}${state.user.name} — ${state.user.role_title}</p>
</div>
${(()=>{ const recent = (sharedData.universityNotifications||[]).filter(n=> n.conventionGenerated && faculteMatches(state.user.faculte, n.faculte) && (state.user.type==='faculte' || departementMatches(state.user.departement, n.departement))).slice(-3).reverse();
  if(!recent.length) return '';
  return `
<div class="card mb16" style="border-left:3px solid var(--success);background:rgba(0,196,140,0.05)">
  ${recent.map(n=>`
  <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:12px;${recent.length>1?'padding:8px 0;border-bottom:1px solid var(--border)':''}">
    <div>
      <div class="text-sm" style="font-weight:600">📄 Convention créée automatiquement : ${n.studentLabel} × ${n.company}</div>
      <div class="text-xs text-muted mt8">${n.conventionReference || (n.generatedConventionId ? 'SF-2026-0'+(n.generatedConventionId+46) : '—')} · ${n.theme} · Encadrant : ${n.encadrantEntreprise || '—'}</div>
    </div>
    ${n.generatedConventionId ? `<button class="btn btn-cyan btn-sm" onclick="openConventionById(${n.generatedConventionId})">Voir la convention</button>` : ''}
  </div>`).join('')}
</div>`; })()}
<div class="grid-4 mb16">
  ${(()=>{ const sStudents=filterByScope(getUniversityStudents(),state.user), sConv=filterByScope(conventions,state.user);
    const placed=sStudents.filter(s=>s.status==='active'||s.status==='accepted'||s.status==='archived').length;
    const toValidate=sConv.filter(c=>c.status!=='archived').length;
    const archived=sConv.filter(c=>c.status==='archived').length;
    return `
  <div class="stat-card"><div class="num">${sStudents.length}</div><div class="lbl">Étudiants inscrits</div></div>
  <div class="stat-card"><div class="num" style="color:var(--success)">${placed}</div><div class="lbl">Stages placés</div></div>
  <div class="stat-card"><div class="num" style="color:var(--accent)">${toValidate}</div><div class="lbl">Conventions à valider</div></div>
  <div class="stat-card"><div class="num" style="color:var(--cyan2)">${archived}</div><div class="lbl">Archives</div></div>`; })()}
</div>
<div class="grid-2 gap16">
  <div class="card">
    <div class="card-title">📋 Conventions en attente</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${filterByScope(conventions,state.user).filter(c=>c.status!=='archived').map(c=>`
      <div style="border:1px solid var(--border);border-radius:var(--r2);padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="text-sm" style="font-weight:500">${c.etudiant}</div>
          <div class="text-xs text-muted">${c.company} · ${c.theme.slice(0,38)}...</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${statusPill(c.status)}
          <button class="btn btn-cyan btn-sm" onclick="openConventionById(${c.id})">${c.signed_univ ? 'Voir' : '✍️ Signer'}</button>
        </div>
      </div>`).join('') || '<div class="empty-state"><div class="ico">✅</div><p>Aucune convention en attente pour ce périmètre</p></div>'}
    </div>
  </div>
  <div class="card">
    <div class="card-title">📊 Taux de placement</div>
    ${progressRow('Placement global',81)}
    ${progressRow('Conventions signées complètes',26)}
    ${progressRow('Archives ce semestre',25)}
    <div class="mt16"><button class="btn btn-ghost w-full" onclick="navigateTo('univ-stats')">Voir statistiques →</button></div>
  </div>
</div>`,

'univ-conventions':`
<div class="page-header">
  <h2>📄 Conventions — Validation & Archivage</h2>
  <p>${state.user.type==='universite'?'Toutes facultés et départements':state.user.type==='faculte'?state.user.faculte+' — tous départements':state.user.departement}</p>
</div>
<div class="card">
  <div class="table-wrap">
    <table>
      <thead><tr><th>Référence</th><th>Étudiante</th>${state.user.type!=='departement'?'<th>Département</th>':''}<th>Entreprise</th><th>Thème</th><th>Signatures</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>
        ${filterByScope(conventions,state.user).map(c=>`<tr>
          <td><strong>${c.reference || ('SF-2026-0' + (c.id + 46))}</strong></td>
          <td>${c.etudiant}</td>
          ${state.user.type!=='departement'?`<td class="text-xs">${c.departement || '—'}</td>`:''}
          <td>${c.company}</td>
          <td style="max-width:140px">${c.theme}</td>
          <td>
            <span title="Entreprise" style="color:${c.signed_entreprise?'var(--success)':'var(--text3)'}">En </span>
            <span title="Doyenne" style="color:${c.signed_univ?'var(--success)':'var(--text3)'}">D</span>
          </td>
          <td>${statusPill(c.status)}</td>
          <td style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="openConventionById(${c.id})">Voir</button>
            ${c.status!=='archived'?`<button class="btn btn-navy btn-sm" onclick="archiverConvention('${c.etudiant}')">Archiver</button>`:'<span class="text-xs text-muted">Archivé ✅</span>'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`,

'univ-etudiants':`
<div class="page-header">
  <h2>🎓 Étudiants inscrits</h2>
  <p>${state.user.type==='universite'?'Tous les étudiants — toutes facultés et départements':state.user.type==='faculte'?'Étudiants de '+state.user.faculte:'Étudiants du '+state.user.departement}</p>
</div>
<div class="card">
  <div class="search-bar mb16">
    <div class="search-input-wrap"><span class="search-icon-pos">🔍</span><input class="search-input" placeholder="Rechercher un étudiant..."></div>
    <select class="filter-select"><option>Tous les statuts</option><option>Placé</option><option>En recherche</option></select>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Étudiant(e)</th><th>Spécialité</th>${state.user.type!=='departement'?'<th>Département</th>':''}<th>Entreprise</th><th>Statut</th></tr></thead>
      <tbody>
        ${filterByScope(getUniversityStudents(),state.user).map(s=>`<tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.specialty}</td>
          ${state.user.type!=='departement'?`<td class="text-xs">${s.departement}</td>`:''}
          <td>${s.company}</td>
          <td>${statusPill(s.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`,

'univ-entreprises':`
<div class="page-header"><h2>🏢 Entreprises & prestataires partenaires</h2><p>Toutes wilayas et domaines confondus</p></div>
<div class="search-bar">
  <div class="search-input-wrap">
    <span class="search-icon-pos">🔍</span>
    <input class="search-input" id="searchInput" placeholder="Nom, secteur, thème..." oninput="filterCompanies()">
  </div>
  <select class="filter-select" id="domainFilter" onchange="filterCompanies()">
    ${domains.map(d=>`<option value="${d}">${d}</option>`).join('')}
  </select>
  <select class="filter-select" id="wilayaFilter" onchange="filterCompanies()">
    ${wilayas.map(w=>`<option value="${w}">${w}</option>`).join('')}
  </select>
</div>
<div class="company-grid" id="companyGrid">${(()=>{
  const list = typeof getRegisteredCompanies === 'function' ? getRegisteredCompanies() : companies.filter(function(c) { return c.fromDb; });
  if (!list.length) return typeof companiesSearchEmptyHTML === 'function' ? companiesSearchEmptyHTML() : '<div class="empty-state" style="grid-column:1/-1"><p>Aucune entreprise inscrite</p></div>';
  return list.map(function(c) { return companyCardHTML(c); }).join('');
})()}</div>`,

'univ-stats':`
<div class="page-header"><h2>📈 Statistiques & Rapports</h2><p>${state.user.type==='universite'?'Vue globale — toutes facultés et départements · Semestre 1 2026':'Données analytiques PFE — Semestre 1 2026'}</p></div>
<div class="grid-4 mb16">
  <div class="stat-card"><div class="num">47</div><div class="lbl">Étudiants total</div></div>
  <div class="stat-card"><div class="num" style="color:var(--success)">81%</div><div class="lbl">Taux placement</div></div>
  <div class="stat-card"><div class="num" style="color:var(--cyan2)">2.3j</div><div class="lbl">Délai moyen acceptation</div></div>
  <div class="stat-card"><div class="num" style="color:var(--accent)">100%</div><div class="lbl">Dématérialisation</div></div>
</div>
<div class="grid-2 gap16 mb16">
  <div class="card">
    <div class="card-title">Répartition par département</div>
    ${barChart([{l:'Département Communication',v:42},{l:'Département de Sociologie',v:31},{l:'Département STAPS',v:27}])}
  </div>
  <div class="card">
    <div class="card-title">Conventions / mois</div>
    ${barChart([{l:'Novembre',v:4},{l:'Décembre',v:8},{l:'Janvier',v:14},{l:'Février',v:21}])}
  </div>
</div>
${state.user.type==='universite' ? `
<div class="card">
  <div class="card-title">🏛️ Répartition par faculté & spécialité (département)</div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Faculté</th><th>Département / Spécialité</th><th>Étudiants</th><th>Placés</th><th>Conventions</th><th>Signées complètes</th><th>Archivées</th></tr></thead>
      <tbody>
        ${buildOrgBreakdown().map(fac=>`
          <tr style="background:var(--bg2)">
            <td colspan="2"><strong>${fac.faculte}</strong> <span class="text-xs text-muted">(total)</span></td>
            <td><strong>${fac.totals.students}</strong></td>
            <td><strong>${fac.totals.placed}</strong></td>
            <td><strong>${fac.totals.conventions}</strong></td>
            <td><strong>${fac.totals.signedFull}</strong></td>
            <td><strong>${fac.totals.archived}</strong></td>
          </tr>
          ${fac.departements.map(d=>`
          <tr>
            <td class="text-xs text-muted"></td>
            <td>${d.departement}</td>
            <td>${d.students}</td>
            <td>${d.placed}</td>
            <td>${d.conventions}</td>
            <td>${d.signedFull}</td>
            <td>${d.archived}</td>
          </tr>`).join('')}
        `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px">Aucune faculté inscrite pour le moment</td></tr>'}
      </tbody>
    </table>
  </div>
</div>` : ''}`,

'univ-archives':`
<div class="page-header"><h2>🗄️ Archives GED</h2><p>${state.user.type==='universite'?'Vue globale — archivage de toutes les facultés et spécialités · Chiffrement AES-256, horodatage':'Archivage sécurisé — chiffrement AES-256, horodatage'}</p></div>
<div class="card mb16">
  <div style="display:flex;align-items:center;gap:12px;background:var(--bg2);border-radius:var(--r2);padding:14px">
    <span style="font-size:20px">🔒</span>
    <div><div class="text-sm" style="font-weight:500">Archivage sécurisé · Chiffrement AES-256</div><div class="text-xs text-muted">Tous les documents sont horodatés et conservés en base</div></div>
  </div>
</div>
${state.user.type==='universite' ? `
<div class="card mb16">
  <div class="card-title">🏛️ Conventions archivées par faculté & spécialité</div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Faculté</th><th>Département / Spécialité</th><th>Conventions archivées</th></tr></thead>
      <tbody>
        ${buildOrgBreakdown().map(fac=>`
          <tr style="background:var(--bg2)">
            <td colspan="2"><strong>${fac.faculte}</strong> <span class="text-xs text-muted">(total)</span></td>
            <td><strong>${fac.totals.archived}</strong></td>
          </tr>
          ${fac.departements.map(d=>`
          <tr>
            <td class="text-xs text-muted"></td>
            <td>${d.departement}</td>
            <td>${d.archived}</td>
          </tr>`).join('')}
        `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:24px">Aucune faculté inscrite pour le moment</td></tr>'}
      </tbody>
    </table>
  </div>
</div>` : ''}
<div class="card">
  <div class="card-title">📄 Détail des conventions archivées</div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Référence</th><th>Étudiante</th>${state.user.type==='universite'?'<th>Faculté</th><th>Spécialité (département)</th>':''}<th>Entreprise</th><th>Date archivage</th><th>Taille</th><th>Actions</th></tr></thead>
      <tbody>
        ${filterByScope(conventions,state.user).filter(c=>c.status==='archived').map(c=>`<tr><td><strong>${c.reference || ('SF-2026-0' + (c.id + 46))}</strong></td><td>${c.etudiant}</td>${state.user.type==='universite'?`<td class="text-xs">${c.faculte}</td><td class="text-xs">${c.departement}</td>`:''}<td>${c.company}</td><td>12 Jan 2026</td><td>4.2 MB</td><td style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" onclick="openConventionById(${c.id})">Consulter</button><button class="btn btn-ghost btn-sm" onclick="downloadArchivedConvention(${c.id})">⬇</button></td></tr>`).join('') || `<tr><td colspan="${state.user.type==='universite'?7:5}" style="text-align:center;color:var(--text3);padding:24px">Aucune archive pour ce périmètre</td></tr>`}
      </tbody>
    </table>
  </div>
</div>`,

'univ-comptes':`
<div class="page-header">
  <h2>🏛️ Comptes & structure</h2>
  <p>${state.user.type==='universite'?'Gérez les facultés et départements rattachés à votre université':'Gérez les départements rattachés à '+state.user.faculte}</p>
</div>
<div class="grid-2 gap16 mb16">
  <div class="card">
    <div class="card-title">${state.user.type==='universite'?'🏫 Facultés':'📚 Départements'}</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${getChildAccounts(state.user).length ? getChildAccounts(state.user).map(a=>`
      <div style="border:1px solid var(--border);border-radius:var(--r2);padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="text-sm" style="font-weight:600">${a.faculte || a.departement}</div>
          <div class="text-xs text-muted">${a.name} — ${a.role_title}</div>
          ${a.responsable_stages ? `<div class="text-xs text-muted">👤 Responsable des stages : ${a.responsable_stages}</div>` : ''}${a.encadrante ? `<div class="text-xs text-muted">📚 Encadrante universitaire : ${a.encadrante}</div>` : ''}
          <div class="text-xs text-muted" style="font-family:monospace;margin-top:2px">${a.email}</div>
        </div>
        <span class="status-pill s-active">Actif</span>
      </div>`).join('') : `<div class="empty-state"><div class="ico">🏛️</div><p>Aucun ${state.user.type==='universite'?'faculté':'département'} inscrit pour le moment</p></div>`}
    </div>
    <button class="btn btn-cyan w-full mt16" onclick="openAddChildAccount()">+ ${state.user.type==='universite'?'Ajouter une faculté':'Ajouter un département'}</button>
  </div>
  <div class="card">
    <div class="card-title">ℹ️ Comment ça fonctionne</div>
    <p class="text-sm text-muted" style="line-height:1.7">Chaque ${state.user.type==='universite'?'faculté':'département'} dispose de son propre compte (email + mot de passe) et de son propre espace StageFlow : ses étudiants, demandes, conventions et archives lui sont propres et ne sont visibles que par lui.</p>
    <p class="text-sm text-muted" style="line-height:1.7;margin-top:10px">${state.user.type==='universite'?"En tant qu'université, vous gardez une vue globale sur toutes les facultés et tous les départements.":'En tant que faculté, vous voyez les données de tous vos départements, mais pas celles des autres facultés.'}</p>
  </div>
</div>`,

'univ-paiement':`
<div class="page-header">
  <h2>💳 Abonnement & Paiement</h2>
  <p>Gérez votre abonnement StageFlow — Paiement sécurisé via Baridi Mob</p>
</div>

<!-- PLAN ACTUEL -->
<div style="background:linear-gradient(135deg,var(--navy) 0%,#163366 100%);border-radius:16px;padding:24px 28px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
  <div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">PLAN ACTUEL</div>
    <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff">Plan Gratuit <span style="font-size:13px;color:var(--cyan);font-weight:500;margin-left:8px">— Période d'essai 30 jours</span></div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px">Expire le 15 Février 2026 · Université Abderrahmane Mira — Béjaïa</div>
  </div>
  <div style="background:rgba(240,165,0,0.2);border:1px solid rgba(240,165,0,0.4);color:var(--accent);padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600">⚠️ Expiration dans 12 jours</div>
</div>

<!-- LES 3 TARIFS -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:24px">

  <!-- UNIVERSITÉ -->
  <div style="background:var(--navy);border:2px solid var(--cyan);border-radius:20px;padding:32px 24px;position:relative">
    <div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--cyan);color:var(--navy);font-size:11px;font-weight:800;padding:5px 16px;border-radius:20px;white-space:nowrap;letter-spacing:.5px">🏛️ UNIVERSITÉ</div>
    <div style="margin-top:12px;font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:#fff;margin-bottom:4px">Abonnement annuel</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:20px">Accès complet — toute la structure</div>
    <div style="font-family:'Syne',sans-serif;font-size:42px;font-weight:800;color:var(--cyan);line-height:1;margin-bottom:4px">100 000 <span style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.4)">DA</span></div>
    <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-bottom:24px">par an · toutes facultés & départements</div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:24px">
      ${["Toutes les facultés & départements","Étudiants & conventions illimités","Tableau de bord Recteur","Statistiques par département","Signature électronique ANCE","Archivage GED illimité","Notifications temps réel","Support prioritaire"].map(f=>`<div style="font-size:13px;color:rgba(255,255,255,0.8);display:flex;align-items:center;gap:8px"><span style="color:var(--cyan);font-weight:700;flex-shrink:0">✓</span>${f}</div>`).join('')}
    </div>
    <button class="btn btn-cyan w-full" onclick="selectPlan('Université — Abonnement annuel','100 000')">Souscrire — 100 000 DA/an</button>
  </div>

  <!-- ÉTUDIANT -->
  <div style="background:#fff;border:2px solid var(--navy);border-radius:20px;padding:32px 24px;position:relative">
    <div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;font-size:11px;font-weight:800;padding:5px 16px;border-radius:20px;white-space:nowrap;letter-spacing:.5px">🎓 ÉTUDIANT</div>
    <div style="margin-top:12px;font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--navy);margin-bottom:4px">Inscription annuelle</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:20px">Valable pour toute l'année universitaire</div>
    <div style="font-family:'Syne',sans-serif;font-size:42px;font-weight:800;color:var(--navy);line-height:1;margin-bottom:4px">100 <span style="font-size:14px;font-weight:400;color:var(--text3)">DA</span></div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:24px">par an · paiement unique</div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:24px">
      ${["Accès complet à l'espace étudiant","Recherche & candidature entreprises","Lettre de motivation automatique","Convention électronique","Signature numérique certifiée","Archivage permanent de la convention","Historique de tous les stages","Valable toute l'année universitaire"].map(f=>`<div style="font-size:13px;color:var(--text2);display:flex;align-items:center;gap:8px"><span style="color:var(--cyan);font-weight:700;flex-shrink:0">✓</span>${f}</div>`).join('')}
    </div>
    <button class="btn btn-cyan w-full" onclick="selectPlan('Étudiant — Inscription annuelle','100')">Payer — 100 DA/an</button>
  </div>

  <!-- ENTREPRISE GRATUIT -->
  <div style="background:#fff;border:2px solid var(--success);border-radius:20px;padding:32px 24px;position:relative">
    <div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--success);color:#fff;font-size:11px;font-weight:800;padding:5px 16px;border-radius:20px;white-space:nowrap;letter-spacing:.5px">🏢 ENTREPRISE</div>
    <div style="margin-top:12px;font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--navy);margin-bottom:4px">Accès gratuit</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:20px">Pour favoriser l'adoption</div>
    <div style="font-family:'Syne',sans-serif;font-size:42px;font-weight:800;color:var(--success);line-height:1;margin-bottom:4px">0 <span style="font-size:14px;font-weight:400;color:var(--text3)">DA</span></div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:24px">accès permanent & illimité</div>
    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:24px">
      ${["Inscription libre et immédiate","Réception des candidatures PFE","Gestion & traitement des demandes","Signature électronique conventions","Suivi des stagiaires actifs","Évaluations et notation","Accès illimité permanent"].map(f=>`<div style="font-size:13px;color:var(--text2);display:flex;align-items:center;gap:8px"><span style="color:var(--success);font-weight:700;flex-shrink:0">✓</span>${f}</div>`).join('')}
    </div>
    <div style="background:rgba(0,196,140,0.08);border:1px solid rgba(0,196,140,0.25);border-radius:10px;padding:13px;text-align:center;font-size:13px;color:var(--success);font-weight:600">✅ Accès automatique dès l'inscription</div>
  </div>
</div>

<!-- HISTORIQUE PAIEMENTS -->
<div class="card">
  <div class="card-title">🧾 Historique des paiements</div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Date</th><th>Plan</th><th>Montant</th><th>Méthode</th><th>Référence</th><th>Statut</th></tr></thead>
      <tbody>
        <tr>
          <td>15 Jan 2026</td><td>Essai gratuit</td>
          <td><strong>0 DA</strong></td><td>—</td>
          <td>SF-FREE-2026-001</td>
          <td><span class="status-pill s-active">Actif</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- MODAL BARIDI MOB -->
<div id="baridiModal">
  <div class="baridi-box">
    <div class="baridi-header">
      <div class="baridi-logo">
        <svg viewBox="0 0 52 52" width="44" height="44"><rect width="52" height="52" rx="8" fill="#006633"/>
        <text x="26" y="22" text-anchor="middle" fill="#fff" font-size="8" font-family="Arial" font-weight="bold">BARIDI</text>
        <text x="26" y="34" text-anchor="middle" fill="#FFD700" font-size="8" font-family="Arial" font-weight="bold">MOB</text>
        <circle cx="26" cy="42" r="3" fill="#FFD700"/></svg>
      </div>
      <div><h3>Paiement Baridi Mob</h3><p>Algérie Poste · Paiement mobile sécurisé</p></div>
    </div>
    <div class="baridi-body">
      <div class="baridi-amount-box">
        <div class="amount-label">Montant à régler</div>
        <div class="amount-val" id="baridiAmount">100 000 DA</div>
        <div class="amount-plan" id="baridiPlan">Abonnement annuel StageFlow</div>
      </div>
      <div class="baridi-steps">
        <div class="baridi-step"><div class="baridi-step-num">1</div><div><p>Ouvrez l'application Baridi Mob</p><span>Disponible sur Play Store & App Store — Algérie Poste</span></div></div>
        <div class="baridi-step"><div class="baridi-step-num">2</div><div><p>Paiement marchand → Saisir le RIP StageFlow</p><span>RIP : <strong style="color:var(--navy);letter-spacing:1px">00799 99900 00100 12345 67</strong></span></div></div>
        <div class="baridi-step"><div class="baridi-step-num">3</div><div><p>Entrez le code de référence</p><span>Référence : <strong style="color:var(--navy)">UAMB-2026-SIC</strong></span></div></div>
        <div class="baridi-step"><div class="baridi-step-num">4</div><div><p>Saisissez le numéro de reçu ci-dessous</p><span>Votre abonnement sera activé sous 24h</span></div></div>
      </div>
      <div class="baridi-rip-input">
        <input type="text" id="baridiRecu" placeholder="N° de reçu Baridi Mob" maxlength="20">
        <button class="btn btn-ghost btn-sm" onclick="generateBaridiRecu()">Générer</button>
      </div>
      <button class="baridi-confirm-btn" onclick="confirmBaridiPaiement()"><span>🔒</span> Confirmer le paiement</button>
      <div class="baridi-secure-note"><span>🔒</span> Paiement sécurisé · Algérie Poste · Conforme réglementation algérienne</div>
      <div style="text-align:center;margin-top:12px"><button class="btn btn-ghost btn-sm" onclick="closeBaridiModal()">Annuler</button></div>
    </div>
  </div>
</div>

<style>
#baridiModal{display:none;position:fixed;inset:0;background:rgba(11,30,61,0.6);z-index:250;align-items:center;justify-content:center}
#baridiModal.open{display:flex}
.baridi-box{background:#fff;border-radius:20px;width:480px;max-width:95vw;overflow:hidden;box-shadow:0 24px 64px rgba(11,30,61,0.2)}
.baridi-header{background:linear-gradient(135deg,#006633 0%,#009944 100%);padding:24px 28px;display:flex;align-items:center;gap:16px}
.baridi-logo{width:52px;height:52px;background:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.baridi-header h3{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:2px}
.baridi-header p{font-size:12px;color:rgba(255,255,255,0.7)}
.baridi-body{padding:24px 28px}
.baridi-amount-box{background:linear-gradient(135deg,#f0f9f4,#e6f7ee);border:1px solid #b2dfcc;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:20px}
.amount-label{font-size:12px;color:#4a7c59;margin-bottom:4px}
.amount-val{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#006633}
.amount-plan{font-size:12px;color:#4a7c59;margin-top:4px}
.baridi-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:20px}
.baridi-step{display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--bg);border-radius:10px;border:1px solid var(--border)}
.baridi-step-num{width:26px;height:26px;background:#006633;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px}
.baridi-step p{font-size:13px;color:var(--text);font-weight:500;margin-bottom:2px}
.baridi-step span{font-size:11px;color:var(--text3)}
.baridi-rip-input{display:flex;gap:8px;margin-bottom:16px}
.baridi-rip-input input{flex:1;padding:10px 14px;border:2px solid var(--border);border-radius:var(--r2);font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:.15s;letter-spacing:1px}
.baridi-rip-input input:focus{border-color:#006633}
.baridi-confirm-btn{width:100%;padding:13px;background:#006633;color:#fff;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;border:none;border-radius:10px;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center;gap:8px}
.baridi-confirm-btn:hover{background:#009944;transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,102,51,0.35)}
.baridi-secure-note{display:flex;align-items:center;gap:6px;justify-content:center;margin-top:12px;font-size:11px;color:var(--text3)}
</style>
`
  };
  return pages[id]||`<div class="empty-state"><div class="ico">🚧</div><p>Page en construction</p></div>`;
}
