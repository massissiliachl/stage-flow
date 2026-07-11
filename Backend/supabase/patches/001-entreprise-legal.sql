-- Colonnes légales entreprise (NIF, RC, etc.) — idempotent
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS email_contact TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS nif TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS nrc TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS ai TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entreprises_nif ON entreprises(nif) WHERE nif IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entreprises_nrc ON entreprises(nrc) WHERE nrc IS NOT NULL;
