-- Empreintes d'intégrité documentaire pour les conventions (SHA-256)

ALTER TABLE conventions
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS final_integrity_hash TEXT,
  ADD COLUMN IF NOT EXISTS hash_algorithm TEXT DEFAULT 'SHA-256';

CREATE INDEX IF NOT EXISTS idx_conventions_document_hash ON conventions(document_hash);
