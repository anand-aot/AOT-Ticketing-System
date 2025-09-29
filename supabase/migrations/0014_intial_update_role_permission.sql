INSERT INTO role_permissions (email, role)
VALUES 
  ('suresh@company.com', 'hr_owner'),
  ('manus@gmail.com', 'admin_owner'),
  ('candtgh@gmail.com', 'accounts_owner'),
  ('divose@gmail.com', 'owner')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;