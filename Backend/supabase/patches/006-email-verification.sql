-- Vérification d'adresse email à l'inscription
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;

-- Comptes déjà existants : considérés comme vérifiés
UPDATE users SET email_verified = TRUE WHERE email_verification_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token
  ON users(email_verification_token)
  WHERE email_verification_token IS NOT NULL;
