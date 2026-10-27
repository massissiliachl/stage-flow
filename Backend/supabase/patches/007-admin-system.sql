-- StageFlow — Administration plateforme (vérification entreprises / étudiants)

ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS admin_verification_status TEXT DEFAULT 'approved';
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS nif_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS nis_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS nrc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMPTZ;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS admin_verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE students ADD COLUMN IF NOT EXISTS matricule_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admin_verification_status TEXT DEFAULT 'approved';
ALTER TABLE students ADD COLUMN IF NOT EXISTS admin_verified_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admin_verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  admin_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entreprises_admin_verification ON entreprises(admin_verification_status);
CREATE INDEX IF NOT EXISTS idx_students_admin_verification ON students(admin_verification_status);

DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
    'admin_universite', 'admin_faculte', 'admin_departement',
    'responsable_stages', 'enseignant', 'etudiant', 'entreprise', 'platform_admin'
  ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'users_role_check: %', SQLERRM;
END $$;
