-- Dates de stage sur les conventions + rapports de fin de stage

ALTER TABLE conventions
  ADD COLUMN IF NOT EXISTS date_debut DATE,
  ADD COLUMN IF NOT EXISTS date_fin DATE;

CREATE TABLE IF NOT EXISTS stage_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convention_id   BIGINT NOT NULL REFERENCES conventions(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name    TEXT NOT NULL,
  entreprise_id   BIGINT REFERENCES entreprises(id) ON DELETE SET NULL,
  entreprise_nom  TEXT,
  title           TEXT NOT NULL,
  summary         TEXT,
  content         TEXT NOT NULL,
  file_name       TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'validated')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (convention_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_reports_entreprise ON stage_reports(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_stage_reports_student ON stage_reports(student_name);

DROP TRIGGER IF EXISTS trg_stage_reports_updated_at ON stage_reports;
CREATE TRIGGER trg_stage_reports_updated_at
  BEFORE UPDATE ON stage_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
