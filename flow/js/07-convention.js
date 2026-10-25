// ══════════════════════════════════
// CONVENTION MODAL
// ══════════════════════════════════

function conventionPartyStudent(conv) {
  return (conv.parties || (conv.signatures && conv.signatures.parties) || {}).student || {};
}

function conventionPartyEntreprise(conv) {
  return (conv.parties || (conv.signatures && conv.signatures.parties) || {}).entreprise || {};
}

/** Même champs / titres pour tous — valeurs propres à chaque étudiant et à son entreprise */
function resolveConventionStudentFields(conv, u) {
  u = u || etuOrEmpty();
  const st = conventionPartyStudent(conv);
  const ent = conventionPartyEntreprise(conv);
  const canUseStudentProfile = u && typeof conventionBelongsToStudent === 'function'
    ? conventionBelongsToStudent(conv, u)
    : (state.role === 'etudiant');

  function pickDb(stVal, convVal, userVal, fallback) {
    const v = String(convVal || stVal || '').trim();
    if (v) return v;
    if (canUseStudentProfile && String(userVal || '').trim()) return String(userVal).trim();
    return fallback;
  }

  let entrepriseSecteur = String(conv.entrepriseSecteur || ent.secteur || '').trim();
  let entrepriseWilaya = String(conv.entrepriseWilaya || ent.wilaya || '').trim();
  if ((!entrepriseSecteur || !entrepriseWilaya) && typeof companies !== 'undefined') {
    const entId = conv.entrepriseId ? Number(conv.entrepriseId) : null;
    const company = entId
      ? companies.find(function(c) { return Number(c.id) === entId; })
      : companies.find(function(c) { return c.name === conv.company; });
    if (company) {
      if (!entrepriseSecteur) entrepriseSecteur = company.sector || '';
      if (!entrepriseWilaya) entrepriseWilaya = company.wilaya || '';
    }
  }

  if (conv.fromDb) {
    return {
      etudiantNom: conv.etudiant || st.name || (canUseStudentProfile ? u.name : '') || '—',
      specialite: pickDb(st.specialty, conv.studentSpecialty, u.specialty, '—'),
      matricule: pickDb(st.matricule, conv.studentMatricule, u.matricule, '—'),
      emailEtu: pickDb(st.email, conv.studentEmail, u.email, '—'),
      universiteNom: pickDb(st.university, conv.studentUniversity, u.university, 'Université Abderrahmane Mira — Béjaïa'),
      faculteLabel: pickDb(st.faculte, conv.faculte, u.faculte, 'Faculté SHS'),
      deptLabel: pickDb(st.departement, conv.departement, u.departement || u.dept, 'Département SIC'),
      theme: String(conv.theme || st.theme || (canUseStudentProfile ? u.theme : '') || '').trim() || '—',
      periode: String(conv.periode || st.duree || '').trim() || '—',
      company: String(conv.company || ent.nom || '').trim() || '—',
      entrepriseSecteur,
      entrepriseWilaya,
    };
  }

  return {
    etudiantNom: u.name || '—',
    specialite: String(u.specialty || '').trim() || '—',
    matricule: String(u.matricule || '').trim() || '—',
    emailEtu: String(u.email || '').trim() || '—',
    universiteNom: String(u.university || '').trim() || 'Université Abderrahmane Mira — Béjaïa',
    faculteLabel: String(u.faculte || '').trim() || 'Faculté SHS',
    deptLabel: String(u.departement || u.dept || '').trim() || 'Département SIC',
    theme: String(conv.theme || u.theme || '').trim() || '—',
    periode: String(conv.periode || '').trim() || '—',
    company: String(conv.company || '').trim() || '—',
    entrepriseSecteur,
    entrepriseWilaya,
  };
}

function resolveEncadrantUniversitaire(conv, u) {
  const st = conventionPartyStudent(conv);
  const canUseStudentProfile = u && typeof conventionBelongsToStudent === 'function'
    ? conventionBelongsToStudent(conv, u)
    : (state.role === 'etudiant');
  if (conv.fromDb) {
    const v = conv.studentEncadrant || st.encadrant || (canUseStudentProfile && u.encadrant) || '';
    return String(v).trim() || '—';
  }
  return String((u && u.encadrant) || '').trim() || '—';
}

function resolveEncadrantEntreprise(conv) {
  const ent = conventionPartyEntreprise(conv);
  let v = conv.encadrant_entreprise || ent.encadrant || conv.encadrant || '';
  v = String(v).trim();
  if (v && v !== '—') return v;
  if (typeof demandes !== 'undefined') {
    const d = demandes.find(function(x) {
      if (x.status !== 'accepted') return false;
      if (conv.entrepriseId && x.entrepriseId) return Number(x.entrepriseId) === Number(conv.entrepriseId);
      return x.company === conv.company;
    });
    if (d && d.encadrant && String(d.encadrant).trim() && d.encadrant !== '—') {
      return String(d.encadrant).trim();
    }
  }
  return '—';
}

/** Binôme / quadrinôme : snapshot convention, sinon profil étudiant connecté */
function resolveConventionStudentGroup(conv, u) {
  u = u || etuOrEmpty();
  const canUseStudentProfile = u && typeof conventionBelongsToStudent === 'function'
    ? conventionBelongsToStudent(conv, u)
    : (state.role === 'etudiant');
  if (conv.fromDb) {
    const fromSnapshot = normalizeStudentGroup({
      groupType: conv.studentGroupType || (conv.studentBinome ? 'binome' : 'solo'),
      groupMembers: conv.studentGroupMembers || (conv.studentBinome ? [conv.studentBinome] : []),
      binome: conv.studentBinome,
    });
    if (fromSnapshot.members.length) return fromSnapshot;
    if (canUseStudentProfile) return normalizeStudentGroup(u);
    return fromSnapshot;
  }
  return normalizeStudentGroup(u);
}

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
  const f = resolveConventionStudentFields(conv, u);
  const studentGroup = resolveConventionStudentGroup(conv, u);
  const groupMembersHtml = studentGroup.members.map((m) =>
    `<div class="pdf-field"><label>Coéquipier :</label><div class="val">${m.name.toUpperCase()}${m.matricule ? ' · ' + m.matricule : ''}</div></div>`
  ).join('');
  const encadrantEnt = resolveEncadrantEntreprise(conv);
  const encadrantUniv = resolveEncadrantUniversitaire(conv, u);
  const docRef = conv.reference || ('SF-2026-0' + (conv.id + 46));
  const entLegalBlock = `
        <div class="pdf-field"><label>Entreprise d'accueil :</label><div class="val">${f.company}</div></div>
        ${f.entrepriseSecteur ? `<div class="pdf-field"><label>Secteur d'activité :</label><div class="val">${f.entrepriseSecteur}</div></div>` : ''}
        ${f.entrepriseWilaya ? `<div class="pdf-field"><label>Wilaya :</label><div class="val">${f.entrepriseWilaya}</div></div>` : ''}
        <div class="pdf-field"><label>Encadrant stage :</label><div class="val">${encadrantEnt}</div></div>`;

  return `
    <div class="pdf-preview">
      <div class="pdf-header">
        <div class="uni-name">République Algérienne Démocratique et Populaire<br>Ministère de l'Enseignement Supérieur et de la Recherche Scientifique</div>
        <div style="margin-top:8px;font-size:11px;color:#555">${f.universiteNom} · ${f.faculteLabel} · ${f.deptLabel}</div>
        <div class="doc-title">CONVENTION DE STAGE DE FIN D'ÉTUDES (PFE)</div>
        <div style="font-size:10px;color:#777;margin-top:4px">Établie conformément au <strong>Décret exécutif n° 13-306 du 16 septembre 2013</strong> fixant les conditions et modalités d'organisation des stages pratiques en milieu professionnel au profit des étudiants de l'enseignement supérieur</div>
        <div class="doc-ref">Réf. : <strong>${docRef}</strong> · Année universitaire 2025-2026 · Généré le ${new Date().toLocaleDateString('fr-DZ')}</div>
      </div>

      <div class="pdf-section">
        <h4>Données relatives à l'étudiant et à l'organisme d'accueil</h4>
        <div class="pdf-field"><label>Établissement :</label><div class="val">${f.universiteNom}</div></div>
        <div class="pdf-field"><label>Faculté / Département :</label><div class="val">${f.faculteLabel} — ${f.deptLabel}</div></div>
        <div class="pdf-field"><label>Représenté par :</label><div class="val">Pr. Soualmia Abderrahmane — Doyen ${f.faculteLabel}</div></div>
        ${entLegalBlock}
        <div class="pdf-field"><label>Nom et prénom :</label><div class="val">${String(f.etudiantNom || '').toUpperCase()}</div></div>
        ${studentGroup.groupType !== 'solo' ? `<div class="pdf-field"><label>Modalité PFE :</label><div class="val">${groupTypeLabel(studentGroup.groupType)}</div></div>` : ''}
        ${groupMembersHtml}
        <div class="pdf-field"><label>Niveau / Spécialité :</label><div class="val">${f.specialite}</div></div>
        <div class="pdf-field"><label>N° matricule :</label><div class="val">${f.matricule}</div></div>
        <div class="pdf-field"><label>Email universitaire :</label><div class="val">${f.emailEtu}</div></div>
        <div class="pdf-field"><label>Thème du PFE :</label><div class="val">${f.theme}</div></div>
        <div class="pdf-field"><label>Période :</label><div class="val">${f.periode}</div></div>
        <div class="pdf-field"><label>Encadrant entreprise :</label><div class="val">${encadrantEnt}</div></div>
        <div class="pdf-field"><label>Encadrant universitaire :</label><div class="val">${encadrantUniv}</div></div>
      </div>

      <p style="font-size:12px;font-weight:600;margin:18px 0 10px;text-align:center;color:#333">Il a été arrêté et convenu ce qui suit :</p>

      <div class="pdf-section">
        <h4>Article 1 : Objet</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">La présente convention a pour objet de définir les conditions de prise en charge au sein de l'entreprise <strong>${f.company}</strong>, d'étudiants de l'université pour l'accomplissement de stage pratique avec élaboration par chaque étudiant, en fin de formation, d'un rapport de stage.</p>
        <p style="font-size:12px;color:#444;line-height:1.7;margin-top:8px">Le nom de l'étudiant, la durée, les secteurs de l'entreprise dans lesquels s'effectuera le stage ainsi que le personnel d'encadrement, sont définis dans la partie réservée aux données relatives à l'étudiant.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 2 : But du stage</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Le stage de formation a pour but essentiel d'assurer l'illustration ou l'application pratique de l'enseignement dispensé à l'université, en faisant participer l'étudiant à un travail dans l'entreprise.</p>
        <p style="font-size:12px;color:#444;line-height:1.7;margin-top:8px">L'organisation du stage est établie par le chef d'entreprise (ou son représentant) en accord avec le responsable pédagogique, en fonction du programme des études poursuivies.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 3 : Statut de l'étudiant</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Pendant son séjour à l'entreprise, l'étudiant stagiaire conserve son statut d'étudiant à l'université. Il pourra, notamment, participer à des activités pédagogiques liées à sa formation après en avoir prévenu le responsable du stage dans l'entreprise.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 4 : Règlement et vie dans l'organisme d'accueil</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Pendant son séjour à l'entreprise, l'étudiant est soumis aux droits et obligations du règlement intérieur de celle-ci, notamment en ce qui concerne la discipline, les visites médicales et horaires de travail, les règles de prévention, hygiène, sécurité du travail, et le secret professionnel éventuellement.</p>
        <p style="font-size:12px;color:#444;line-height:1.7;margin-top:8px">En cas de manquement à la discipline, l'entreprise sera en droit de mettre fin au stage de l'étudiant fautif sans préjudice de poursuites judiciaires, après avoir prévenu le responsable pédagogique.</p>
        <p style="font-size:12px;color:#444;line-height:1.7;margin-top:8px">Avant le départ de l'étudiant(e), le responsable de l'entreprise devra s'assurer que l'avertissement adressé à l'université a bien été reçu par cette dernière.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 5 : Protection sociale du stagiaire</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Pendant son séjour à l'entreprise, l'étudiant continue de bénéficier du régime d'assurance maladie étudiant, qui lui confère son statut, conformément à la législation relative aux assurances sociales.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 6 : Responsabilité de l'étudiant et de l'organisme d'accueil</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">En cas d'accident survenu à l'étudiant, soit au cours du travail, soit au cours du trajet, l'entreprise s'engage à aviser rapidement l'université. Si l'accident a lieu pendant une période de fermeture de l'université, l'entreprise procédera elle-même à la déclaration de l'accident de travail dans les délais réglementaires auprès de la CNAS.</p>
        <p style="font-size:12px;color:#444;line-height:1.7;margin-top:8px">Pour les risques qu'il encourt ou fait encourir à des tiers pendant la durée de son stage, l'étudiant est couvert par l'assurance « responsabilité civile générale » en vigueur au sein de l'entreprise.</p>
      </div>

      <div class="pdf-section">
        <h4>Article 7 : Confidentialité, propriété intellectuelle, rapport de stage</h4>
        <p style="font-size:12px;color:#444;line-height:1.7">Le responsable de l'enseignement peut demander au responsable du stage de l'entreprise une évaluation du comportement du stagiaire et de la qualité du travail effectué par celui-ci. Par ailleurs, le stage donne lieu à la rédaction d'un rapport de stage que l'étudiant doit remettre au responsable pédagogique, après l'avoir porté à la connaissance du responsable de stage. Ce rapport peut rester la propriété de l'entreprise dans le cas de la sauvegarde du secret industriel ; il sera cependant communiqué, pour une évaluation pédagogique, à des enseignants.</p>
        <p style="font-size:12px;color:#444;line-height:1.7;margin-top:8px">La présente clause de confidentialité s'entend également à toute présentation orale de soutenance. Si l'étudiant en fait la demande, l'entreprise lui remettra un certificat indiquant la nature et la durée du stage accompli.</p>
      </div>

      <div class="pdf-sign-row" id="signRowPDF">
        <div class="sign-box-pdf">
          <div class="role-lbl">L'Entreprise</div>
          <div class="sign-name">${f.company}</div>
          ${signBoxContent('entreprise', conv, forPdf)}
        </div>
        <div class="sign-box-pdf">
          <div class="role-lbl">L'Université — Doyenne (Chef de doyennat)</div>
          <div class="sign-name">Pr. Soualmia Abderrahmane — Chef de doyennat · ${f.faculteLabel}</div>
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
