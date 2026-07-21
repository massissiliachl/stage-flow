-- Attestations de stage (modèle pré-rempli, complété en fin de stage)

CREATE TABLE IF NOT EXISTS stage_attestations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convention_id   BIGINT NOT NULL REFERENCES conventions(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name    TEXT NOT NULL,
  entreprise_id   BIGINT REFERENCES entreprises(id) ON DELETE SET NULL,
  entreprise_nom  TEXT,
  prefilled       JSONB NOT NULL DEFAULT '{}',
  missions        TEXT NOT NULL,
  competences     TEXT NOT NULL,
  commentaire     TEXT,
  file_name       TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'validated')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (convention_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_attestations_entreprise ON stage_attestations(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_stage_attestations_student ON stage_attestations(student_name);

DROP TRIGGER IF EXISTS trg_stage_attestations_updated_at ON stage_attestations;
CREATE TRIGGER trg_stage_attestations_updated_at
  BEFORE UPDATE ON stage_attestations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
