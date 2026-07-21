-- Données de démonstration (université, entreprises — pas d'étudiant pré-créé)

INSERT INTO universities (id, name, acronym, wilaya, email)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'Université Abderrahmane Mira — Béjaïa',
  'UAMB',
  'Béjaïa',
  'rectorat@univ-bejaia.dz'
);

INSERT INTO faculties (id, university_id, name, code) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Faculté SHS', 'SHS'),
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Faculté de Droit', 'DROIT');

INSERT INTO departments (id, university_id, faculty_id, name, code, encadrante) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Département SIC', 'SIC', 'Dr. Hider Fouzia'),
  ('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'Département Droit Privé', 'DP', NULL);

INSERT INTO entreprises (id, nom, domaine, secteur, wilaya, adresse, phone, email_contact, nif, nrc, nis, offres, note, tags, identifiant) VALUES
  (1, 'Cevital', 'Industrie & Énergie', 'Agroalimentaire', 'Béjaïa', 'Zone industrielle Ouled Aissa, 06000 Béjaïa', '034 81 00 00', 'stages@cevital.com', '000160000123456', '06/00-1234567B12', '12345678901234', 4, 4.7, ARRAY['Marketing','Communication'], 'CEVITALAGRO'),
  (2, 'Sonatrach', 'Industrie & Énergie', 'Énergie / Pétrochimie', 'Béjaïa', NULL, NULL, NULL, NULL, NULL, NULL, 5, 4.2, ARRAY['Informatique','HSE'], NULL),
  (3, 'Djezzy', 'Télécommunications & IT', 'Télécommunications', 'Béjaïa', NULL, NULL, NULL, NULL, NULL, NULL, 2, 4.0, ARRAY['Marketing','IT'], NULL),
  (4, 'Algérie Telecom', 'Télécommunications & IT', 'Télécommunications', 'Béjaïa', NULL, NULL, NULL, NULL, NULL, NULL, 3, 4.3, ARRAY['SI','Sécurité'], NULL),
  (5, 'Ooredoo', 'Télécommunications & IT', 'Télécommunications', 'Béjaïa', NULL, NULL, NULL, NULL, NULL, NULL, 2, 4.1, ARRAY['Marketing Digital'], NULL),
  (6, 'BNA Banque', 'Finance & Banque', 'Finance / Banque', 'Béjaïa', NULL, NULL, NULL, NULL, NULL, NULL, 2, 3.9, ARRAY['Finance','Communication'], NULL);

SELECT setval(pg_get_serial_sequence('entreprises', 'id'), GREATEST((SELECT MAX(id) FROM entreprises), 1));

INSERT INTO users (
  id, login_id, password_hash, role, display_name, avatar, entreprise_id
) VALUES (
  'd2222222-2222-2222-2222-222222222222',
  'CEVITALAGRO',
  '13102026',
  'entreprise',
  'Direction RH — Cevital',
  'CV',
  1
);

-- Les étudiants s'inscrivent via POST /api/auth/etudiant/register (solo / binôme / quadrinôme)

INSERT INTO conventions (id, reference, student_id, student_name, entreprise_id, entreprise_nom, theme, periode, status, faculte, departement, university_id, department_id) VALUES
  (2, 'SF-2026-048', NULL, 'Amira Bensaid', 3, 'Djezzy', 'Stratégie comm. digitale', 'Fév – Mar 2026', 'pending', 'Faculté SHS', 'Département SIC', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111'),
  (3, 'SF-2026-049', NULL, 'Sara Meziane', 2, 'Sonatrach', 'Communication de crise', 'Jan – Fév 2026', 'archived', 'Faculté SHS', 'Département SIC', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111');

SELECT setval(pg_get_serial_sequence('conventions', 'id'), GREATEST((SELECT MAX(id) FROM conventions), 1));
