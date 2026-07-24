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

function listStudentUniversities() {
  return STUDENT_UNIVERSITIES.map(function(u) {
    return {
      id: u.id,
      name: u.name,
      logoUrl: u.logoUrl || '',
      shortNameFr: u.shortNameFr || u.name,
      faculties: u.faculties.slice(),
    };
  });
}

function findUniversityByName(universityName) {
  const name = String(universityName || '').trim();
  if (!name) return null;
  return STUDENT_UNIVERSITIES.find(function(u) { return u.name === name; }) || null;
}

function isValidStudentFaculty(universityName, faculteName) {
  const uni = findUniversityByName(universityName);
  if (!uni) return false;
  const fac = String(faculteName || '').trim();
  return uni.faculties.includes(fac);
}

module.exports = {
  STUDENT_UNIVERSITIES,
  listStudentUniversities,
  findUniversityByName,
  isValidStudentFaculty,
};
