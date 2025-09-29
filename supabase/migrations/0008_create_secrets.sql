CREATE TABLE secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO secrets (key, value)
VALUES ('SUPABASE_SERVICE_ROLE_KEY', 'your-supabase-service-role-key');