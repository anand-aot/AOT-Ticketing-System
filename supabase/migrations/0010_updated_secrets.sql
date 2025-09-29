CREATE TABLE IF NOT EXISTS secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO secrets (key, value)
VALUES 
 ('SUPABASE_SERVICE_ROLE_KEY', 'your-supabase-service-role-key'),
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Ensure RLS is enabled and restricted
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE policyname = 'restrict_secrets_access' 
    AND tablename = 'secrets'
  ) THEN
    ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

    CREATE POLICY restrict_secrets_access ON secrets
      FOR ALL
      USING (false); -- Deny all access except via trigger
  END IF;
END $$;