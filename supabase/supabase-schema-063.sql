-- Migration 063: one atomic, never-recycled shark number per identity.
-- User handles remain the existing friend address. Legacy/custom choices are
-- preserved; the ten unchanged seed handles alone receive the new format.
BEGIN;
CREATE TABLE IF NOT EXISTS public.shark_name_counter (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  next_number BIGINT NOT NULL DEFAULT 1 CHECK (next_number > 0)
);
INSERT INTO public.shark_name_counter(singleton) VALUES (TRUE) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.shark_name_allocations (
  identity_key TEXT PRIMARY KEY CHECK (length(identity_key) BETWEEN 6 AND 140),
  ordinal BIGINT NOT NULL UNIQUE CHECK (ordinal > 0),
  current_name TEXT NOT NULL CHECK (current_name ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$'),
  name_key TEXT GENERATED ALWAYS AS (lower(current_name)) STORED UNIQUE,
  base TEXT,
  user_id TEXT UNIQUE REFERENCES public.user_handles(user_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL AND identity_key = 'user:' || user_id) OR (user_id IS NULL AND identity_key ~ '^guest:[A-Za-z0-9_-]{16,64}$'))
);
ALTER TABLE public.shark_name_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shark_name_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shark_name_counter, public.shark_name_allocations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shark_name_counter, public.shark_name_allocations TO service_role;

CREATE OR REPLACE FUNCTION public.keep_shark_identity_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.identity_key IS DISTINCT FROM OLD.identity_key OR NEW.ordinal IS DISTINCT FROM OLD.ordinal OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'immutable_shark_number';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.keep_shark_identity_number() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS keep_shark_identity_number ON public.shark_name_allocations;
CREATE TRIGGER keep_shark_identity_number BEFORE UPDATE ON public.shark_name_allocations FOR EACH ROW EXECUTE FUNCTION public.keep_shark_identity_number();

-- Also protects legacy handle writes and their case-insensitive namespace.
-- Every naming mutation takes the counter before allocation/handle rows.
CREATE OR REPLACE FUNCTION public.sync_shark_handle_allocation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_number BIGINT;
BEGIN
  SELECT next_number INTO v_number FROM public.shark_name_counter WHERE singleton FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.shark_name_allocations WHERE identity_key = 'user:' || NEW.user_id) THEN
    UPDATE public.shark_name_allocations SET current_name = NEW.handle WHERE identity_key = 'user:' || NEW.user_id;
  ELSE
    INSERT INTO public.shark_name_allocations(identity_key, ordinal, current_name, user_id)
      VALUES ('user:' || NEW.user_id, v_number, NEW.handle, NEW.user_id);
    UPDATE public.shark_name_counter SET next_number = v_number + 1 WHERE singleton;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_shark_handle_allocation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_shark_handle_allocation ON public.user_handles;
CREATE TRIGGER sync_shark_handle_allocation BEFORE INSERT OR UPDATE OF handle ON public.user_handles
FOR EACH ROW EXECUTE FUNCTION public.sync_shark_handle_allocation();

CREATE OR REPLACE FUNCTION public.allocate_shark_name(
  p_identity_key TEXT, p_base TEXT, p_user_id TEXT DEFAULT NULL, p_replace BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_allocation public.shark_name_allocations%ROWTYPE;
  v_handle public.user_handles%ROWTYPE;
  v_number BIGINT;
  v_name TEXT;
  v_base TEXT := btrim(p_base);
  v_available INTEGER;
BEGIN
  IF v_base !~ '^[a-z][A-Za-z]{2,30}$' OR lower(v_base) IN ('admin','administrator','moderator','mod','support','help','staff','team','shark','studyshark','devshark','sharkira','learner','anonymous','me','you','system','root','null','undefined')
    OR (p_user_id IS NOT NULL AND p_identity_key <> 'user:' || p_user_id)
    OR (p_user_id IS NULL AND (p_replace OR p_identity_key !~ '^guest:[A-Za-z0-9_-]{16,64}$')) THEN RAISE EXCEPTION 'invalid_handle'; END IF;
  SELECT next_number INTO v_number FROM public.shark_name_counter WHERE singleton FOR UPDATE;
  SELECT * INTO v_allocation FROM public.shark_name_allocations WHERE identity_key = p_identity_key FOR UPDATE;
  IF FOUND AND NOT p_replace THEN
    RETURN jsonb_build_object('handle', v_allocation.current_name, 'ordinal', v_allocation.ordinal::TEXT, 'base', v_allocation.base);
  END IF;
  IF v_allocation.ordinal IS NOT NULL THEN v_number := v_allocation.ordinal; END IF;
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_handle FROM public.user_handles WHERE user_id = p_user_id FOR UPDATE;
    IF FOUND AND p_replace AND v_allocation.base IS DISTINCT FROM v_base
      AND v_handle.handle_set_at > NOW() - INTERVAL '30 days' THEN RAISE EXCEPTION 'handle_cooldown'; END IF;
  END IF;
  v_available := 32 - length(v_number::TEXT);
  v_name := CASE WHEN length(v_base) <= v_available THEN v_base
    ELSE left('shark' || upper(left(v_base, 1)) || substr(v_base, 2), v_available) END || v_number::TEXT;
  -- Historical guest/manual names are not rewritten, nor claimed by a new identity.
  IF EXISTS (SELECT 1 FROM public.challenge_scores c WHERE lower(c.name) = lower(v_name)
    AND NOT (COALESCE(c.user_id = p_user_id AND p_user_id IS NOT NULL, FALSE)
      OR COALESCE(c.run_id = substr(p_identity_key, 7) AND p_user_id IS NULL, FALSE))) THEN RAISE EXCEPTION 'handle_taken'; END IF;
  IF v_allocation.ordinal IS NULL THEN
    INSERT INTO public.shark_name_allocations(identity_key, ordinal, current_name, base, user_id)
      VALUES (p_identity_key, v_number, v_name, v_base, p_user_id);
    UPDATE public.shark_name_counter SET next_number = v_number + 1 WHERE singleton;
  ELSE
    UPDATE public.shark_name_allocations SET current_name = v_name, base = v_base WHERE identity_key = p_identity_key;
  END IF;
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.user_handles(user_id, handle, discoverable, handle_set_at)
      VALUES (p_user_id, v_name, FALSE, CASE WHEN p_replace THEN NOW() ELSE NOW() - INTERVAL '31 days' END)
    ON CONFLICT (user_id) DO UPDATE SET handle = EXCLUDED.handle,
      handle_set_at = CASE WHEN v_allocation.base IS NOT DISTINCT FROM v_base THEN public.user_handles.handle_set_at ELSE NOW() END,
      updated_at = NOW();
  END IF;
  RETURN jsonb_build_object('handle', v_name, 'ordinal', v_number::TEXT, 'base', v_base);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'handle_taken';
END;
$$;
REVOKE ALL ON FUNCTION public.allocate_shark_name(TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_shark_name(TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- Keep legacy custom-handle calls compatible, but acquire their global naming
-- lock first too. Their handle trigger synchronizes the unique name registry.
CREATE OR REPLACE FUNCTION public.set_user_handle(p_user_id TEXT, p_handle TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_clean TEXT := btrim(p_handle); v_existing public.user_handles;
BEGIN
  IF v_clean !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$' THEN RAISE EXCEPTION 'invalid_handle'; END IF;
  PERFORM 1 FROM public.shark_name_counter WHERE singleton FOR UPDATE;
  SELECT * INTO v_existing FROM public.user_handles WHERE user_id = p_user_id FOR UPDATE;
  IF FOUND THEN
    IF lower(v_existing.handle) = lower(v_clean) THEN
      UPDATE public.user_handles SET handle = v_clean, updated_at = NOW() WHERE user_id = p_user_id; RETURN v_clean;
    END IF;
    IF v_existing.handle_set_at > NOW() - INTERVAL '30 days' THEN RAISE EXCEPTION 'handle_cooldown'; END IF;
  END IF;
  INSERT INTO public.user_handles(user_id, handle, handle_set_at) VALUES (p_user_id, v_clean, NOW())
    ON CONFLICT (user_id) DO UPDATE SET handle = EXCLUDED.handle, handle_set_at = NOW(), updated_at = NOW();
  RETURN v_clean;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'handle_taken'; WHEN check_violation THEN RAISE EXCEPTION 'invalid_handle';
END;
$$;
REVOKE ALL ON FUNCTION public.set_user_handle(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_handle(TEXT, TEXT) TO service_role;

-- Give existing custom handles numbers without changing their names or choices.
DO $$ DECLARE one RECORD; BEGIN
  FOR one IN SELECT user_id FROM public.user_handles ORDER BY created_at, user_id LOOP
    UPDATE public.user_handles SET handle = handle WHERE user_id = one.user_id;
  END LOOP;
END; $$;

-- Only the original unchanged seed names are converted. Custom/real choices survive.
DO $$ DECLARE one RECORD; candidate TEXT; chosen TEXT; BEGIN
  FOR one IN SELECT h.user_id, h.handle, a.ordinal::TEXT AS ordinal, v.base
    FROM (VALUES
      ('seed-friend-amara-o','el-tiburon-tremendo','elTiburonTremendo'),
      ('seed-friend-jonas-b','sharky-mc-burritoface','sharkyMcBurritoface'),
      ('seed-friend-lena-k','muy-thirsty-sharkie','muyThirstySharkie'),
      ('seed-friend-mia-dev','fin-de-siesta','finDeSiesta'),
      ('seed-friend-nina-v','mucho-drama-fin','muchoDramaFin'),
      ('seed-friend-pablo-r','kale-no-bueno-tiburon','kaleNoBuenoTiburon'),
      ('seed-friend-ravi-p','deployed-lantern-shark','deployedLanternShark'),
      ('seed-friend-sofia-m','gracias-sharkie','graciasSharkie'),
      ('seed-friend-tomas-h','stealthy-cat-shark','stealthyCatShark'),
      ('seed-friend-yuki-t','mucho-nap-chomper','muchoNapChomper')
    ) AS v(user_id, old_name, base)
    JOIN public.user_handles h ON h.user_id = v.user_id AND h.handle = v.old_name
    JOIN public.shark_name_allocations a ON a.user_id = h.user_id
  LOOP
    chosen := NULL;
    FOREACH candidate IN ARRAY ARRAY[one.base, 'sharkNoBueno', 'sleepySharkie', 'elTiburonLoco', 'thirstySharky', 'hungryFin', 'saltyShark'] LOOP
      IF NOT EXISTS (SELECT 1 FROM public.shark_name_allocations WHERE name_key = lower(candidate || one.ordinal) AND user_id IS DISTINCT FROM one.user_id) THEN chosen := candidate; EXIT; END IF;
    END LOOP;
    IF chosen IS NULL THEN RAISE EXCEPTION 'handle_taken'; END IF;
    UPDATE public.shark_name_allocations SET base = chosen WHERE user_id = one.user_id;
    UPDATE public.user_handles SET handle = chosen || one.ordinal WHERE user_id = one.user_id;
  END LOOP;
END; $$;

DROP FUNCTION IF EXISTS public.get_user_handle(TEXT);
CREATE FUNCTION public.get_user_handle(p_user_id TEXT)
RETURNS TABLE(handle TEXT, discoverable BOOLEAN, country TEXT, can_change_at TIMESTAMPTZ, ordinal TEXT, base TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT h.handle, h.discoverable, h.country, h.handle_set_at + INTERVAL '30 days', a.ordinal::TEXT, a.base
    FROM public.user_handles h LEFT JOIN public.shark_name_allocations a ON a.user_id = h.user_id WHERE h.user_id = p_user_id
$$;
REVOKE ALL ON FUNCTION public.get_user_handle(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_handle(TEXT) TO service_role;
COMMIT;
