CREATE SCHEMA IF NOT EXISTS identity;

CREATE TABLE IF NOT EXISTS identity.accounts (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  roles jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS identity_accounts_email_lower ON identity.accounts (lower(email));

CREATE TABLE IF NOT EXISTS identity.credentials (
  user_id text PRIMARY KEY REFERENCES identity.accounts(id) ON DELETE CASCADE,
  algorithm text NOT NULL CHECK (algorithm = 'argon2id'),
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS identity.tokens (
  token_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('verification', 'recovery')),
  user_id text NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  PRIMARY KEY (purpose, token_hash)
);

CREATE TABLE IF NOT EXISTS identity.sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  csrf_hash text NOT NULL,
  device_name text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS identity_sessions_user ON identity.sessions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS identity.anonymous_claims (
  anonymous_learner_id text PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  user_id text NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS identity.audit (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL,
  evidence jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS identity_audit_user_time ON identity.audit (user_id, occurred_at);
