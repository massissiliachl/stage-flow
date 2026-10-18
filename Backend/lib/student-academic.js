/**
 * Universités et facultés disponibles à l'inscription étudiant
 */

const STUDENT_UNIVERSITIES = [
  {
    id: 'uam-bejaia',
    name: 'Université Abderrahmane Mira — Béjaïa',
    logoUrl: 'assets/logos/universite-bejaia.png',
    shortNameFr: 'Université de Béjaïa',
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
  },
];

function cloneCatalogEntry(u) {
  return {
    id: u.id,
    name: u.name,
    logoUrl: u.logoUrl || '',
    shortNameFr: u.shortNameFr || u.name,
    registrationHint: u.registrationHint || '',
    faculties: u.faculties.slice(),
  };
}

function listStudentUniversities() {
  return STUDENT_UNIVERSITIES.map(cloneCatalogEntry);
}

function mergeUniversityLists(baseList, extraRows) {
  const byName = {};
  baseList.forEach(function(u) {
    byName[u.name] = cloneCatalogEntry(u);
  });

  (extraRows || []).forEach(function(row) {
    const uniName = String(row.university_name || row.name || '').trim();
    const facName = String(row.faculty_name || row.faculte || '').trim();
    if (!uniName) return;
    if (!byName[uniName]) {
      byName[uniName] = {
        id: 'db-' + uniName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48),
        name: uniName,
        logoUrl: '',
        shortNameFr: uniName,
        registrationHint: '',
        faculties: [],
      };
    }
    const rowLogo = String(row.university_logo || row.logo || '').trim();
    if (rowLogo) byName[uniName].logoUrl = rowLogo;
    if (facName && !byName[uniName].faculties.includes(facName)) {
      byName[uniName].faculties.push(facName);
    }
  });

  const bejaiaName = STUDENT_UNIVERSITIES[0] && STUDENT_UNIVERSITIES[0].name;
  const ordered = [];
  if (bejaiaName && byName[bejaiaName]) ordered.push(byName[bejaiaName]);
  Object.keys(byName)
    .filter(function(n) { return n !== bejaiaName; })
    .sort(function(a, b) { return a.localeCompare(b, 'fr'); })
    .forEach(function(n) { ordered.push(byName[n]); });
  return ordered;
}

async function listStudentUniversitiesMerged(pool) {
  const base = listStudentUniversities();
  if (!pool) return base;
  try {
    const res = await pool.query(
      `SELECT u.name AS university_name, u.logo AS university_logo, f.name AS faculty_name
       FROM universities u
       LEFT JOIN faculties f ON f.university_id = u.id AND (f.is_active IS NULL OR f.is_active IS NOT FALSE)
       WHERE (u.is_active IS NULL OR u.is_active IS NOT FALSE)
       ORDER BY u.name, f.name NULLS LAST`
    );
    return mergeUniversityLists(STUDENT_UNIVERSITIES, res.rows);
  } catch (err) {
    console.warn('[StageFlow] listStudentUniversitiesMerged:', err.message);
    return base;
  }
}

async function registerUniversityStructure(pool, universityName, faculteName, logoUrl) {
  const university = String(universityName || '').trim();
  const faculte = String(faculteName || '').trim();
  const logo = String(logoUrl || '').trim();
  if (!university) return { ok: false, error: 'Nom université requis' };
  if (!pool) return { ok: false, error: 'Base de données indisponible' };

  const uniRes = await pool.query(
    `INSERT INTO universities (name, logo)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET
       updated_at = NOW(),
       logo = CASE WHEN EXCLUDED.logo IS NOT NULL AND EXCLUDED.logo <> '' THEN EXCLUDED.logo ELSE universities.logo END
     RETURNING id, name`,
    [university, logo || null]
  );
  const universityId = uniRes.rows[0].id;

  if (faculte) {
    await pool.query(
      `INSERT INTO faculties (university_id, name)
       VALUES ($1, $2)
       ON CONFLICT (university_id, name) DO UPDATE SET updated_at = NOW()`,
      [universityId, faculte]
    );
  }

  return { ok: true, universityId };
}

function normalizeUniversityNameKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findUniversityInList(list, universityName) {
  const name = String(universityName || '').trim();
  if (!name) return null;
  const key = normalizeUniversityNameKey(name);
  return (list || []).find(function(u) {
    return u.name === name || normalizeUniversityNameKey(u.name) === key;
  }) || null;
}

function findUniversityByName(universityName) {
  return findUniversityInList(STUDENT_UNIVERSITIES, universityName);
}

function normalizeFacultyKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isValidStudentFacultyInList(list, universityName, faculteName) {
  const uni = findUniversityInList(list, universityName);
  if (!uni) return false;
  const fac = String(faculteName || '').trim();
  const facKey = normalizeFacultyKey(fac);
  return uni.faculties.some(function(f) {
    return f === fac || normalizeFacultyKey(f) === facKey;
  });
}

function isValidStudentFaculty(universityName, faculteName) {
  return isValidStudentFacultyInList(listStudentUniversities(), universityName, faculteName);
}

async function isValidStudentFacultyMerged(pool, universityName, faculteName) {
  const list = await listStudentUniversitiesMerged(pool);
  return isValidStudentFacultyInList(list, universityName, faculteName);
}

module.exports = {
  STUDENT_UNIVERSITIES,
  listStudentUniversities,
  listStudentUniversitiesMerged,
  mergeUniversityLists,
  registerUniversityStructure,
  findUniversityByName,
  isValidStudentFaculty,
  isValidStudentFacultyMerged,
};
