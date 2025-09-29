-- Migration to remove NOT NULL constraint from employee_id in users table
ALTER TABLE users
  ALTER COLUMN employee_id DROP NOT NULL;