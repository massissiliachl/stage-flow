-- Réinitialise les tables StageFlow (à exécuter avant une nouvelle migration)
DROP TABLE IF EXISTS entreprise_notes CASCADE;
DROP TABLE IF EXISTS company_ratings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS conventions CASCADE;
DROP TABLE IF EXISTS stage_demands CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS entreprises CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;
DROP TABLE IF EXISTS universities CASCADE;
