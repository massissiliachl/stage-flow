-- Durée de stage saisie par l'étudiant lors de la candidature
ALTER TABLE stage_demands ADD COLUMN IF NOT EXISTS duree TEXT;
