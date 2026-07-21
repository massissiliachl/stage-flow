// ══════════════════════════════════
// CONVENTION MODAL
// ══════════════════════════════════

/** HTML identique à l'aperçu convention (aperçu + PDF) */
function buildConventionPdfHtml(convId, forPdf) {
  const u = etuOrEmpty();
  const conv = convId
    ? conventions.find(c => c.id === convId)
    : (typeof getStudentConvention === 'function' ? getStudentConvention(u) : null);
  if (!conv) {
    return '<div class="empty-state" style="padding:24px"><p>Aucune convention disponible</p></div>';
  }
  convId = conv.id;
  const signedCount = [conv.signed_entreprise, conv.signed_univ].filter(Boolean).length;

  const etudiantNom = conv.fromDb ? conv.etudiant : u.name;
  const studentGroup = normalizeStudentGroup(conv.fromDb ? {
    groupType: conv.studentGroupType || (conv.studentBinome ? 'binome' : 'solo'),
    groupMembers: conv.studentGroupMembers || (conv.studentBinome ? [conv.studentBinome] : []),
    binome: conv.studentBinome,
  } : u);
  const groupMembersHtml = studentGroup.members.map((m) =>
    `<div class="pdf-field"><label>Coéquipier :</label><div class="val">${m.name.toUpperCase()}${m.matricule ? ' · ' + m.matricule : ''}</div></div>`
  ).join('');
  const specialite = conv.fromDb ? (conv.studentSpecialty || '—') : (u.specialty || '—');
  const matricule = conv.fromDb ? (conv.studentMatricule || '—') : (u.matricule || '—');
  const emailEtu = conv.fromDb ? (conv.studentEmail || '—') : (u.email || '—');
  const universiteNom = conv.fromDb ? (conv.studentUniversity || 'Université Abderrahmane Mira — Béjaïa') : (u.university || 'Université Abderrahmane Mira — Béjaïa');
  const encadrantEnt = conv.encadrant_entreprise || '—';
  const encadrantUniv = conv.fromDb ? (conv.studentEncadrant || '—') : (u.encadrant || '—');
  const docRef = conv.reference || ('SF-2026-0' + (conv.id + 46));
  const faculteLabel = conv.faculte || 'Faculté SHS';
  const deptLabel = conv.departement || 'Département SIC';
  const entLegalBlock = `
        <div class="pdf-field"><label>Entreprise d'accueil :</label><div class="val">${conv.company}</div></div>
        ${conv.entrepriseSecteur ? `<div class="pdf-field"><label>Secteur d'activité :</label><div class="val">${conv.entrepriseSecteur}</div></div>` : ''}
        ${conv.entrepriseWilaya ? `<div class="pdf-field"><label>Wilaya :</label><div class="val">${conv.entrepriseWilaya}</div></div>` : ''}
        <div class="pdf-field"><label>Encadrant stage :</label><div class="val">${encadrantEnt}</div></div>`;

  return `
    <div class="pdf-preview">
      <div class="pdf-header">
        <div class="uni-name">République Algérienne Démocratique et Populaire<br>Ministère de l'Enseignement Supérieur et de la Recherche Scientifique</div>
        <div style="margin-top:8px;font-size:11px;color:#555">${universiteNom} · ${faculteLabel} · ${deptLabel}</div>
        <div class="doc-title">CONVENTION DE STAGE DE FIN D'ÉTUDES (PFE)</div>
        <div style="font-size:10px;color:#777;margin-top:4px">Établie conformément au <strong>Décret exécutif n° 13-306 du 16 septembre 2013</strong> fixant les conditions et modalités d'organisation des stages pratiques en milieu professionnel au profit des étudiants de l'enseignement supérieur</div>
        <div class="doc-ref">Réf. : <strong>${docRef}</strong> · Année universitaire 2025-2026 · Généré le ${new Date().toLocaleDateString('fr-DZ')}</div>
      </div>

      <div class="pdf-section">
        <h4>Article 1 — Les parties contractantes <span style="font-weight:400;font-size:10px">(Art. 4 du Décret 13-306)</span></h4>
        <div class="pdf-field"><label>Établissement :</label><div class="val">${universiteNom}</div></div>
        <div class="pdf-field"><label>Faculté / Département :</label><div class="val">${faculteLabel} — ${deptLabel}</div></div>
        <div class="pdf-field"><label>Représenté par :</label><div class="val">Pr. Soualmia Abderrahmane — Doyen ${faculteLabel}</div></div>
        ${entLegalBlock}
      </div>

      <div class="pdf-section">
        <h4>Article 2 — Stagiaire(s) <span style="font-weight:400;font-size:10px">(Art. 3 du Décret 13-306)</span></h4>
        <div class="pdf-field"><label>Nom et prénom :</label><div class="val">${etudiantNom.toUpperCase()}</div></div>
        ${studentGroup.groupType !== 'solo' ? `<div class="pdf-field"><label>Modalité PFE :</label><div class="val">${groupTypeLabel(studentGroup.groupType)}</div></div>` : ''}
        ${groupMembersHtml}
        <div class="pdf-field"><label>Niveau / Spécialité :</label><div class="val">${specialite}</div></div>
        <div class="pdf-field"><label>N° matricule :</label><div class="val">${matricule}</div></div>
        <div class="pdf-field"><label>Email universitaire :</label><div class="val">${emailEtu}</div></div>
      </div>

      <div class="pdf-section">
        <h4>Article 3 — Objet et durée du stage <span style="font-weight:400;font-size:10px">(Art. 5 et 6 du Décret 13-306)</span></h4>
        <div class="pdf-field"><label>Thème du PFE :</label><div class="val">${conv.theme}</div></div>
        <div class="pdf-field"><label>Période :</label><div class="val">${conv.periode}</div></div>
        <div class="pdf-field"><label>Encadrant entreprise :</label><div class="val">${encadrantEnt}</div></div>
        <div class="pdf-field"><label>Encadrant universitaire :</label><div class="val">${encadrantUniv}</div></div>
        <p style="font-size:11px;color:#555;margin-top:6px;line-height:1.6">Conformément à l'article 5 du Décret exécutif n° 13-306, la durée du stage ne peut excéder six (6) mois par année universitaire.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 4 — Conditions d'accueil <span style="font-weight:400;font-size:10px">(Art. 7 et 8 du Décret 13-306)</span></h4>
        <p style="font-size:12px;color:#444;line-height:1.7">L'organisme d'accueil s'engage à mettre à la disposition du (des) stagiaire(s) les équipements et ressources nécessaires à la réalisation du projet. Un tuteur professionnel est désigné au sein de l'entreprise pour assurer le suivi de l'étudiant(e) conformément à l'article 7 du présent décret.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 5 — Obligations du stagiaire <span style="font-weight:400;font-size:10px">(Art. 9 du Décret 13-306)</span></h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Le (la) stagiaire est tenu(e) de respecter le règlement intérieur de l'organisme d'accueil, d'observer la confidentialité des informations auxquelles il (elle) a accès, d'effectuer le stage avec assiduité et de produire un rapport de stage final soumis à l'établissement d'enseignement supérieur à l'issue du stage.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 6 — Obligations de l'établissement d'enseignement supérieur <span style="font-weight:400;font-size:10px">(Art. 10 du Décret 13-306)</span></h4>
        <p style="font-size:12px;color:#444;line-height:1.7">L'université s'engage à désigner un encadrant pédagogique chargé du suivi du stage, à valider le rapport de stage, et à délivrer une attestation de stage à l'issue de la période. L'encadrant universitaire effectuera au moins une visite de suivi auprès de l'organisme d'accueil.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 7 — Protection sociale et couverture <span style="font-weight:400;font-size:10px">(Art. 12 du Décret 13-306)</span></h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Le (la) stagiaire conserve le bénéfice de la couverture sociale accordée en qualité d'étudiant(e) de l'enseignement supérieur. L'organisme d'accueil n'est pas tenu de rémunérer le stage, sauf dispositions particulières arrêtées entre les parties.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 8 — Propriété intellectuelle et confidentialité</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Les résultats et travaux produits dans le cadre de ce stage restent la propriété de l'université et de l'organisme d'accueil, selon les accords conclus entre les parties. Le (la) stagiaire s'engage à ne divulguer aucune information confidentielle relative à l'activité de l'organisme d'accueil.</p>
      </div>

      <div class="pdf-sign-row" id="signRowPDF">
        <div class="sign-box-pdf">
          <div class="role-lbl">L'Entreprise</div>
          <div class="sign-name">${conv.company}</div>
          ${signBoxContent('entreprise', conv, forPdf)}
        </div>
        <div class="sign-box-pdf">
          <div class="role-lbl">L'Université — Doyenne (Chef de doyennat)</div>
          <div class="sign-name">Pr. Soualmia Abderrahmane — Chef de doyennat · ${conv.faculte || 'Faculté SHS'}</div>
          ${signBoxContent('universite', conv, forPdf)}
        </div>
      </div>

      <div style="text-align:center;margin-top:16px">
        <div style="font-size:10px;color:#888;margin-bottom:6px">Convention régie par le Décret exécutif n° 13-306 du 16 Rabie Ethani 1435 correspondant au 16 septembre 2013</div>
        ${signedCount > 0 ? `<span class="cert-badge">🔒 ${signedCount}/2 signature(s) certifiée(s) · SHA-256 · ${new Date().toLocaleDateString('fr-DZ')}</span>` : ''}
        ${conv.documentHash ? `<div style="font-size:9px;font-family:monospace;color:#666;margin-top:8px">Document : ${conv.documentHash}</div>` : ''}
        ${conv.finalIntegrityHash ? `<div style="font-size:9px;font-family:monospace;color:#666;margin-top:4px">Intégrité finale : ${conv.finalIntegrityHash}</div>` : ''}
      </div>
    </div>`;
}

function openConvention(convId) {
  const u = etuOrEmpty();
  const conv = convId
    ? conventions.find(c => c.id === convId)
    : (typeof getStudentConvention === 'function' ? getStudentConvention(u) : null);
  if (!conv) {
    showToast('ℹ️ Aucune convention disponible');
    return;
  }
  convId = conv.id;
  state.openConventionId = convId;

  document.getElementById('conventionContent').innerHTML = buildConventionPdfHtml(convId);

  const btn = document.getElementById('btnSignConvention');
  if (btn) {
    if (state.role === 'etudiant') {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
      const alreadySigned = state.role === 'entreprise' ? conv.signed_entreprise : conv.signed_univ;
      btn.textContent = alreadySigned ? '✅ Déjà signé' : '✍️ Signer électroniquement';
      btn.disabled = !!alreadySigned;
      btn.style.opacity = alreadySigned ? '0.6' : '1';
    }
  }
  document.getElementById('conventionModal').classList.add('open');
}

function signBoxContent(role, conv, forPdf) {
  const sig = conv && conv.signatures ? conv.signatures[role] : null;
  if (sig) {
    if (sig.type === 'draw') {
      return `<div class="sign-result done"><img src="${sig.data}" style="max-height:52px;max-width:100%;object-fit:contain" alt="signature"></div>
              <div class="sign-date">Signé le ${sig.date}<br><span style="font-size:9px;color:#888;font-family:monospace">${sig.hash || ''}</span></div>`;
    }
    return `<div class="sign-result done" style="font-family:Georgia,serif;font-size:18px;color:#0B1E3D;font-style:italic">${sig.text}</div>
            <div class="sign-date">Signé le ${sig.date}<br><span style="font-size:9px;color:#888;font-family:monospace">${sig.hash || ''}</span></div>`;
  }
  if (!forPdf && role === state.role) {
    return `<div class="sign-result" onclick="openSignModal()" style="cursor:pointer;flex-direction:column;gap:4px"><span>⬆️</span><span>Cliquer pour signer</span></div><div class="sign-date">En attente — c'est à vous de signer</div>`;
  }
  return `<div class="sign-result" style="flex-direction:column;gap:4px;cursor:default;opacity:.85"><span>🔒</span><span>En attente de cette partie</span></div><div class="sign-date">En attente</div>`;
}

async function openConventionById(convId) {
  if (typeof loadConventionFromDb === 'function') {
    await loadConventionFromDb(convId);
  }
  openConvention(convId);
}
