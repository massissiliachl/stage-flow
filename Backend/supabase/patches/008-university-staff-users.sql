-- Comptes université (mots de passe hashés scrypt — changer en production via SQL ou futur écran admin)
-- Mot de passe initial aligné sur la démo : à remplacer sur Render après déploiement.

INSERT INTO users (
  id, email, login_id, password_hash, role, display_name, avatar, role_title,
  university_id, faculty_id, department_id, is_active, email_verified
) VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'rectorat@univ-bejaia.dz',
    'RECTORAT',
    'scrypt:9dbc5a61e553d12ffd1d2f61fc2cecb5:3c3ea261e23092780bf265a95773bcb1ebada9bca50cb29ff8baf3187768dcf5bd74d73db7370a6fa47cf10aa10c6eb3e8c083ef23be385db918f82db7e50878',
    'admin_universite',
    'Pr. Abdelkrim Beniaiche',
    'AB',
    'Recteur / Admin plateforme',
    'a1111111-1111-1111-1111-111111111111',
    NULL,
    NULL,
    TRUE,
    TRUE
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'doyen.shs@univ-bejaia.dz',
    'doyen.shs@univ-bejaia.dz',
    'scrypt:9dbc5a61e553d12ffd1d2f61fc2cecb5:3c3ea261e23092780bf265a95773bcb1ebada9bca50cb29ff8baf3187768dcf5bd74d73db7370a6fa47cf10aa10c6eb3e8c083ef23be385db918f82db7e50878',
    'admin_faculte',
    'Pr. Soualmia Abderrahmane',
    'SA',
    'Doyen de Faculté',
    'a1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    NULL,
    TRUE,
    TRUE
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'sic@univ-bejaia.dz',
    'sic@univ-bejaia.dz',
    'scrypt:9dbc5a61e553d12ffd1d2f61fc2cecb5:3c3ea261e23092780bf265a95773bcb1ebada9bca50cb29ff8baf3187768dcf5bd74d73db7370a6fa47cf10aa10c6eb3e8c083ef23be385db918f82db7e50878',
    'admin_departement',
    'Dr. Ismail Bendbili',
    'IB',
    'Chef du Département SIC',
    'a1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    TRUE,
    TRUE
  ),
  (
    'e4444444-4444-4444-4444-444444444444',
    'doyen.droit@univ-bejaia.dz',
    'doyen.droit@univ-bejaia.dz',
    'scrypt:9dbc5a61e553d12ffd1d2f61fc2cecb5:3c3ea261e23092780bf265a95773bcb1ebada9bca50cb29ff8baf3187768dcf5bd74d73db7370a6fa47cf10aa10c6eb3e8c083ef23be385db918f82db7e50878',
    'admin_faculte',
    'Pr. Karim Belaïdi',
    'FD',
    'Doyen de Faculté',
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    NULL,
    TRUE,
    TRUE
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'droitprive@univ-bejaia.dz',
    'droitprive@univ-bejaia.dz',
    'scrypt:9dbc5a61e553d12ffd1d2f61fc2cecb5:3c3ea261e23092780bf265a95773bcb1ebada9bca50cb29ff8baf3187768dcf5bd74d73db7370a6fa47cf10aa10c6eb3e8c083ef23be385db918f82db7e50878',
    'admin_departement',
    'Dr. Naïma Ouyahia',
    'NO',
    'Responsable stages — Département Droit Privé',
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;
