-- StageFlow — Schéma Supabase (PostgreSQL)
-- Terminologie : entreprise (pas "company")

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════
-- HIÉRARCHIE UNIVERSITAIRE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS universities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  acronym       TEXT,
  wilaya        TEXT,
  email         TEXT UNIQUE,
  phone         TEXT,
  address       TEXT,
  website       TEXT,
  logo          TEXT,
  subscription_plan TEXT DEFAULT 'Gratuit',
  subscription_expiry TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faculties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  dean            JSONB,
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (university_id, name)
);

CREATE TABLE IF NOT EXISTS departments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id         UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  faculty_id            UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  code                  TEXT,
  head_of_department    JSONB,
  stages_coordinator    JSONB,
  encadrante            TEXT,
  description           TEXT,
  max_students          INT DEFAULT 100,
  current_students      INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (faculty_id, code)
);

-- ═══════════════════════════════════════════════════════════════════════
-- ENTREPRISES (Cevital, Sonatrach, etc.)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS entreprises (
  id              BIGSERIAL PRIMARY KEY,
  nom             TEXT NOT NULL,
  domaine         TEXT,
  secteur         TEXT,
  wilaya          TEXT,
  adresse         TEXT,
  phone           TEXT,
  email_contact   TEXT,
  nif             TEXT UNIQUE,
  nrc             TEXT UNIQUE,
  nis             TEXT,
  ai              TEXT,
  offres          INT DEFAULT 0,
  note            NUMERIC(3,1) DEFAULT 0,
  note_base       NUMERIC(3,1),
  tags            TEXT[] DEFAULT '{}',
  logo            JSONB,
  identifiant     TEXT UNIQUE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entreprise_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id   BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  etudiant_id     UUID,
  valeur          NUMERIC(3,1) NOT NULL CHECK (valeur >= 0 AND valeur <= 5),
  commentaire     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entreprise_id, etudiant_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- UTILISATEURS (étudiants, comptes entreprise, admins université)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE,
  login_id        TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN (
    'admin_universite', 'admin_faculte', 'admin_departement',
    'responsable_stages', 'enseignant', 'etudiant', 'entreprise'
  )),
  first_name      TEXT,
  last_name       TEXT,
  display_name    TEXT,
  phone           TEXT,
  avatar          TEXT,
  role_title      TEXT,
  university_id   UUID REFERENCES universities(id) ON DELETE SET NULL,
  faculty_id      UUID REFERENCES faculties(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  entreprise_id   BIGINT REFERENCES entreprises(id) ON DELETE SET NULL,
  student_data    JSONB,
  binome          JSONB,
  theme           TEXT,
  encadrant       TEXT,
  encadrant_ent   TEXT,
  periode         TEXT,
  debut           TEXT,
  fin             TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_university ON users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_entreprise ON users(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ═══════════════════════════════════════════════════════════════════════
-- ÉTUDIANTS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  matricule       TEXT UNIQUE,
  specialty       TEXT,
  promotion       TEXT,
  theme           TEXT,
  entreprise_nom  TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'active', 'archived', 'rejected'
  )),
  faculte         TEXT,
  departement     TEXT,
  faculty_id      UUID REFERENCES faculties(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- DEMANDES DE STAGE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stage_demands (
  id              BIGSERIAL PRIMARY KEY,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name    TEXT,
  entreprise_id   BIGINT REFERENCES entreprises(id) ON DELETE SET NULL,
  entreprise_nom  TEXT NOT NULL,
  theme           TEXT,
  encadrant       TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'cancelled'
  )),
  demand_date     DATE,
  faculte         TEXT,
  departement     TEXT,
  duree           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- CONVENTIONS DE STAGE
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS conventions (
  id                  BIGSERIAL PRIMARY KEY,
  reference           TEXT UNIQUE,
  student_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name        TEXT NOT NULL,
  entreprise_id       BIGINT REFERENCES entreprises(id) ON DELETE SET NULL,
  entreprise_nom      TEXT NOT NULL,
  theme               TEXT,
  periode             TEXT,
  status              TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'signed', 'archived'
  )),
  signed_etudiant     BOOLEAN DEFAULT FALSE,
  signed_entreprise   BOOLEAN DEFAULT FALSE,
  signed_universite   BOOLEAN DEFAULT FALSE,
  signatures          JSONB DEFAULT '{}',
  faculte             TEXT,
  departement         TEXT,
  university_id       UUID REFERENCES universities(id) ON DELETE SET NULL,
  department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_generated        BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conventions_status ON conventions(status);

-- ═══════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS & PRÉFÉRENCES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  role_target     TEXT,
  icon            TEXT,
  color           TEXT,
  message         TEXT NOT NULL,
  payload         JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT FALSE,
  faculte         TEXT,
  departement     TEXT,
  convention_generated BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs           JSONB DEFAULT '{}',
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FK entreprise_notes → users (après création users)
ALTER TABLE entreprise_notes
  DROP CONSTRAINT IF EXISTS entreprise_notes_etudiant_id_fkey;
ALTER TABLE entreprise_notes
  ADD CONSTRAINT entreprise_notes_etudiant_id_fkey
  FOREIGN KEY (etudiant_id) REFERENCES users(id) ON DELETE SET NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'universities', 'faculties', 'departments', 'entreprises', 'users',
    'students', 'stage_demands', 'conventions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;
