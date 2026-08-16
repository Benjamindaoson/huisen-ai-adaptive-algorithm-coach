CREATE SCHEMA IF NOT EXISTS learning;
CREATE TABLE IF NOT EXISTS learning.profiles (learner_id text PRIMARY KEY, updated_at timestamptz NOT NULL, payload jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS learning.events (sequence bigserial PRIMARY KEY, learner_id text NOT NULL, event_id text NOT NULL, created_at timestamptz NOT NULL, payload jsonb NOT NULL, UNIQUE (learner_id, event_id));
CREATE INDEX IF NOT EXISTS learning_events_learner_sequence ON learning.events (learner_id, sequence);
CREATE TABLE IF NOT EXISTS learning.states (learner_id text NOT NULL, kind text NOT NULL CHECK (kind IN ('drafts','progress','practice','exam','mastery','delayed-reviews')), version integer NOT NULL CHECK (version > 0), updated_at timestamptz NOT NULL, payload jsonb NOT NULL, PRIMARY KEY (learner_id, kind));
CREATE TABLE IF NOT EXISTS learning.attempts (id text PRIMARY KEY, learner_id text NOT NULL, problem_id text NOT NULL, language text NOT NULL, outcome text NOT NULL, assisted boolean NOT NULL, source_hash text NOT NULL, created_at timestamptz NOT NULL, payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS learning_attempts_learner_created ON learning.attempts (learner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS learning.claims (idempotency_key text PRIMARY KEY, source_learner_id text NOT NULL UNIQUE, target_learner_id text NOT NULL, claimed_at timestamptz NOT NULL, receipt jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS learning.audit (id bigserial PRIMARY KEY, learner_id text NOT NULL, action text NOT NULL, occurred_at timestamptz NOT NULL, evidence jsonb NOT NULL);
