/**
 * Snapshot parties (étudiant + entreprise) pour conventions de stage
 */

function parseSignaturesJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function mapConventionRow(row) {
  const ref = row.reference || '';
  const sig = parseSignaturesJson(row.signatures);
  const parties = sig.parties || {};
  const st = parties.student || {};
  const ent = parties.entreprise || {};

  return {
    id: Number(row.id),
    reference: ref,
    etudiant: row.student_name,
    company: row.entreprise_nom,
    entrepriseId: row.entreprise_id ? Number(row.entreprise_id) : null,
    theme: row.theme || st.theme || '',
    periode: row.periode || st.duree || '',
    dateDebut: row.date_debut || null,
    dateFin: row.date_fin || null,
    status: row.status,
    signed_etudiant: Boolean(row.signed_etudiant),
    signed_entreprise: Boolean(row.signed_entreprise),
    signed_univ: Boolean(row.signed_universite),
    faculte: row.faculte || st.faculte || '',
    departement: row.departement || st.departement || '',
    encadrant_entreprise: ent.encadrant || row.encadrant || '—',
    studentEmail: st.email || '',
    studentMatricule: st.matricule || '',
    studentSpecialty: st.specialty || '',
    studentUniversity: st.university || '',
    studentBinome: st.binome || null,
    studentGroupType: st.groupType || (st.binome ? (Array.isArray(st.groupMembers) && st.groupMembers.length > 1 ? 'quadrinome' : 'binome') : 'solo'),
    studentGroupMembers: st.groupMembers || (st.binome && st.binome.name ? [st.binome] : (st.binome && st.binome.members ? st.binome.members : [])),
    studentPromotion: st.promotion || '',
    studentEncadrant: st.encadrant || '',
    entrepriseNif: ent.nif || '',
    entrepriseNrc: ent.nrc || '',
    entrepriseNis: ent.nis || '',
    entrepriseAdresse: ent.adresse || '',
    entreprisePhone: ent.phone || '',
    entrepriseEmail: ent.email || '',
    entrepriseSecteur: ent.secteur || '',
    entrepriseWilaya: ent.wilaya || '',
    entrepriseRepresentant: ent.representant || '',
    entrepriseIdentifiant: ent.identifiant || '',
    parties,
    signatures: sig,
    documentHash: row.document_hash || sig.documentHash || null,
    finalIntegrityHash: row.final_integrity_hash || null,
    hashAlgorithm: row.hash_algorithm || 'SHA-256',
    fromDb: true,
  };
}

async function buildPartiesSnapshot(client, demand, encadrantEnt) {
  try {
    return await buildPartiesSnapshotFull(client, demand, encadrantEnt);
  } catch (err) {
    console.warn('buildPartiesSnapshot — repli minimal:', err.message);
    return buildPartiesSnapshotMinimal(demand, encadrantEnt);
  }
}

function buildPartiesSnapshotMinimal(demand, encadrantEnt) {
  return {
    student: {
      name: demand.student_name,
      email: '',
      matricule: '',
      specialty: demand.departement || '',
      university: 'Université Abderrahmane Mira — Béjaïa',
      theme: demand.theme || '',
      faculte: demand.faculte || '',
      departement: demand.departement || '',
      duree: (demand.duree || '').trim() || '2 mois',
      promotion: '',
      binome: null,
      groupType: 'solo',
      groupMembers: [],
    },
    entreprise: {
      nom: demand.entreprise_nom,
      identifiant: '',
      secteur: '',
      wilaya: '',
      adresse: '',
      phone: '',
      email: '',
      nif: '',
      nrc: '',
      nis: '',
      encadrant: encadrantEnt || '—',
      representant: 'Direction RH',
    },
  };
}

async function buildPartiesSnapshotFull(client, demand, encadrantEnt) {
  const entRes = await client.query(
    `SELECT
       e.nom, e.secteur, e.wilaya, e.adresse, e.phone, e.email_contact,
       e.nif, e.nrc, e.nis, e.identifiant,
       u.email AS user_email, u.phone AS user_phone, u.encadrant_ent, u.display_name
     FROM entreprises e
     LEFT JOIN users u ON u.entreprise_id = e.id AND u.role = 'entreprise'
     WHERE e.id = $1
     LIMIT 1`,
    [demand.entreprise_id]
  );
  const e = entRes.rows[0] || {};

  let studentParty = {
    name: demand.student_name,
    email: '',
    matricule: '',
    specialty: demand.departement || '',
    university: 'Université Abderrahmane Mira — Béjaïa',
    theme: demand.theme || '',
    faculte: demand.faculte || '',
    departement: demand.departement || '',
    duree: (demand.duree || '').trim() || '2 mois',
    promotion: '',
    binome: null,
  };

  const applyStudentRow = (s) => {
    const sd = s.student_data && typeof s.student_data === 'object' ? s.student_data : {};
    const binomeRaw = s.binome && typeof s.binome === 'object' ? s.binome : null;
    let groupType = sd.groupType || 'solo';
    let groupMembers = [];
    if (binomeRaw && binomeRaw.groupType && Array.isArray(binomeRaw.members)) {
      groupType = binomeRaw.groupType;
      groupMembers = binomeRaw.members;
    } else if (binomeRaw && binomeRaw.name) {
      groupType = 'binome';
      groupMembers = [binomeRaw];
    } else if (s.binome && s.binome.name) {
      groupType = 'binome';
      groupMembers = [s.binome];
    }
    studentParty = {
      name: s.display_name || demand.student_name,
      email: s.email || sd.email || '',
      matricule: s.matricule || sd.matricule || '',
      specialty: s.specialty || sd.specialty || '',
      university: sd.university || 'Université Abderrahmane Mira — Béjaïa',
      theme: demand.theme || sd.theme || s.theme || '',
      faculte: s.faculte || (demand.faculte && !String(demand.faculte).includes('Université') ? demand.faculte : '') || 'Faculté SHS',
      departement: s.departement || demand.departement || sd.dept || '',
      promotion: s.promotion || sd.promo || '',
      encadrant: s.encadrant || sd.encadrant || '',
      duree: (demand.duree || '').trim() || sd.duree || '2 mois',
      groupType,
      groupMembers,
      binome: groupMembers[0] || null,
    };
  };

  const loadStudent = async (userId) => {
    try {
      const stuRes = await client.query(
        `SELECT
           u.email, u.display_name, u.student_data, u.binome, u.theme, u.encadrant,
           s.matricule, s.specialty, s.promotion, s.faculte, s.departement
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
      );
      if (!stuRes.rows.length) return;
      applyStudentRow(stuRes.rows[0]);
    } catch (err) {
      console.warn('loadStudent (schéma étendu) — repli:', err.message);
      const stuRes = await client.query(
        `SELECT
           u.email, u.display_name,
           s.matricule, s.specialty, s.promotion, s.faculte, s.departement
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [userId]
      );
      if (!stuRes.rows.length) return;
      applyStudentRow(stuRes.rows[0]);
    }
  };

  if (demand.student_id) {
    await loadStudent(demand.student_id);
  } else if (demand.student_name) {
    const byName = await client.query(
      `SELECT u.id FROM users u
       WHERE u.role = 'etudiant' AND u.display_name = $1
       LIMIT 1`,
      [demand.student_name]
    );
    if (byName.rows.length) await loadStudent(byName.rows[0].id);
  }

  const entrepriseParty = {
    nom: e.nom || demand.entreprise_nom,
    identifiant: e.identifiant || '',
    secteur: e.secteur || '',
    wilaya: e.wilaya || '',
    adresse: e.adresse || '',
    phone: e.phone || e.user_phone || '',
    email: e.email_contact || e.user_email || '',
    nif: e.nif || '',
    nrc: e.nrc || '',
    nis: e.nis || '',
    encadrant: encadrantEnt || e.encadrant_ent || '—',
    representant: e.display_name || 'Direction RH',
  };

  return { student: studentParty, entreprise: entrepriseParty };
}

module.exports = {
  parseSignaturesJson,
  mapConventionRow,
  buildPartiesSnapshot,
};
