-- Temporary script to initialize staging database
-- Run this with: gcloud sql connect ai-square-db-staging --user=postgres --database=ai_square_staging

-- First, drop and recreate the database
\c postgres
DROP DATABASE IF EXISTS ai_square_staging;
CREATE DATABASE ai_square_staging;
\c ai_square_staging

-- Now run the schema
\i src/lib/repositories/postgresql/schema-v3.sql