-- The few Supabase objects the migrations rely on. The supabase/postgres image
-- that CI runs already has every one of them, so there this file changes
-- nothing; it only lets the suite run on a bare Postgres too. Each object is
-- created only when missing, so a real definition is never replaced.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regnamespace('auth') IS NULL THEN
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  END IF;
  -- Migration 044 reads auth.users; the suite only needs its id column.
  IF to_regclass('auth.users') IS NULL THEN
    CREATE TABLE auth.users (id UUID PRIMARY KEY);
  END IF;
  -- auth.uid() as Supabase defines it: the `sub` claim of the request's JWT.
  IF to_regprocedure('auth.uid()') IS NULL THEN
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $body$
      SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', TRUE), ''),
        (NULLIF(current_setting('request.jwt.claims', TRUE), '')::JSONB ->> 'sub')
      )::UUID
    $body$;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  END IF;
END;
$$;
