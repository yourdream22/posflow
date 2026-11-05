-- Convert databases created from the original three-role demo seed.
UPDATE users
SET email = 'admin@northstar.market',
    role = 'admin',
    password_hash = 'scrypt:32768:8:1$hThna1lyBaC3RVUi$26eb4a66b7e4ab8fe42d284f4bb9b746855fb786d860ce911134692fac933bfc5ed23cc0e75412bbcd1512addcf7b2774932b22ee2fafc40ce69ffb1520c9e82'
WHERE email = 'maya@northstar.market';

UPDATE users
SET email = 'staff@northstar.market',
    role = 'staff',
    password_hash = 'scrypt:32768:8:1$gr26MxOqhHxTIUyQ$b5a8d436c2bd35ad5b27b887c2d657096d0d62aae9ed3007690723e22e5018392c2421cfc0a85d8eac1754f64abe7945ba3ba457567fbd0e2213249998d74fab'
WHERE email IN ('alex@northstar.market', 'jordan@northstar.market');

UPDATE users SET role = 'staff' WHERE role NOT IN ('admin', 'staff');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff'));
  END IF;
END $$;
