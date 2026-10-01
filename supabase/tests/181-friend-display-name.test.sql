-- What friends see of a learner (migration 055): the sharkname until the
-- learner chooses their Google name, and an initials avatar (no picture)
-- until they switch on their photo. The name reaches accepted friends and the
-- person a learner asked; a stranger who looks the handle up, and the asker
-- looking at their own request, see only the sharkname. The photo reaches
-- accepted friends only.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_ada    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000182';  -- Google name and photo
  v_bo     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000183';  -- email account: no name, no photo
  v_cy     CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000184';  -- a stranger
  v_dee    CONSTANT TEXT := 'aaaaaaaa-0000-4000-8000-000000000185';  -- asks Ada, not yet accepted
  v_photo  CONSTANT TEXT := 'https://lh3.googleusercontent.com/a/ada-181';
  v_row    RECORD;
  v_seen   TEXT;
  v_error  TEXT;
  v_flags  RECORD;
BEGIN
  -- The switches exist and are off for everybody.
  ASSERT (SELECT count(*) FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'user_handles'
             AND column_name IN ('show_real_name', 'show_photo_to_friends')
             AND is_nullable = 'NO' AND column_default = 'false') = 2,
    'show_real_name and show_photo_to_friends are NOT NULL DEFAULT FALSE';

  -- Ada signed in with Google: the stats row holds her name and photo, as
  -- record_verified_quiz_result_v2 writes them. Bo signed up with an email.
  INSERT INTO public.user_stats (user_id, name, picture) VALUES
    (v_ada, 'Ada Lovelace', v_photo),
    (v_bo, NULL, NULL);
  PERFORM public.set_user_handle(v_ada, 'thirsty-sharkie-181');
  PERFORM public.set_user_handle(v_bo, 'el-tiburon-loco-181');
  PERFORM public.set_user_handle(v_cy, 'fin-de-fiesta-181');
  PERFORM public.set_user_handle(v_dee, 'mucho-chomp-shark-181');

  -- Bo and Ada are friends.
  PERFORM public.request_friend(v_bo, 'thirsty-sharkie-181');
  PERFORM public.respond_friend(v_ada, 'el-tiburon-loco-181', TRUE);

  -- Default: Bo sees Ada's sharkname and no picture.
  SELECT * INTO v_row FROM public.friend_list(v_bo, ARRAY['javascript']) WHERE handle = 'thirsty-sharkie-181';
  ASSERT v_row.display_name = 'thirsty-sharkie-181' AND v_row.picture IS NULL,
    format('by default a friend sees the sharkname and no photo, got %s / %s', v_row.display_name, v_row.picture);

  -- Ada chooses her name and her photo.
  SELECT * INTO v_flags FROM public.set_friend_display(v_ada, TRUE, TRUE);
  ASSERT v_flags.show_real_name AND v_flags.show_photo_to_friends, 'set_friend_display answers what it stored';
  SELECT * INTO v_row FROM public.friend_list(v_bo, ARRAY['javascript']) WHERE handle = 'thirsty-sharkie-181';
  ASSERT v_row.display_name = 'Ada Lovelace' AND v_row.picture = v_photo,
    format('with both on, a friend sees the name and the photo, got %s / %s', v_row.display_name, v_row.picture);

  -- NULL leaves a switch alone: the photo goes off, the name stays.
  SELECT * INTO v_flags FROM public.set_friend_display(v_ada, NULL, FALSE);
  ASSERT v_flags.show_real_name AND NOT v_flags.show_photo_to_friends, 'NULL keeps the name switch, FALSE turns the photo off';
  SELECT * INTO v_row FROM public.friend_list(v_bo, ARRAY['javascript']) WHERE handle = 'thirsty-sharkie-181';
  ASSERT v_row.display_name = 'Ada Lovelace' AND v_row.picture IS NULL,
    format('photo off: name, initials; got %s / %s', v_row.display_name, v_row.picture);

  -- Bo has no Google name. Choosing it anyway shows the sharkname, never an
  -- empty label; a blank stored name is no name either.
  PERFORM public.set_friend_display(v_bo, TRUE, TRUE);
  SELECT * INTO v_row FROM public.friend_list(v_ada, ARRAY['javascript']) WHERE handle = 'el-tiburon-loco-181';
  ASSERT v_row.display_name = 'el-tiburon-loco-181' AND v_row.picture IS NULL,
    format('without a Google name or photo, the sharkname and initials; got %s / %s', v_row.display_name, v_row.picture);
  UPDATE public.user_stats SET name = '   ' WHERE user_id = v_ada;
  SELECT display_name INTO v_seen FROM public.friend_list(v_bo, ARRAY['javascript']) WHERE handle = 'thirsty-sharkie-181';
  ASSERT v_seen = 'thirsty-sharkie-181', format('a blank name falls back to the sharkname, got %s', v_seen);
  UPDATE public.user_stats SET name = 'Ada Lovelace' WHERE user_id = v_ada;

  -- A stranger who types Ada's handle sees the handle, not her name.
  SELECT * INTO v_row FROM public.friend_lookup(v_cy, 'thirsty-sharkie-181');
  ASSERT v_row.state = 'none' AND v_row.display_name = 'thirsty-sharkie-181',
    format('a stranger sees the sharkname, got %s / %s', v_row.state, v_row.display_name);
  -- Her friend sees her chosen name.
  SELECT * INTO v_row FROM public.friend_lookup(v_bo, 'thirsty-sharkie-181');
  ASSERT v_row.state = 'accepted' AND v_row.display_name = 'Ada Lovelace',
    format('a friend''s lookup shows the chosen name, got %s / %s', v_row.state, v_row.display_name);

  -- Dee chose her name and asks Ada. Ada's incoming request carries Dee's
  -- name; Dee's own outgoing row carries Ada's sharkname until Ada accepts.
  INSERT INTO public.user_stats (user_id, name) VALUES (v_dee, 'Dee Example');
  PERFORM public.set_friend_display(v_dee, TRUE, FALSE);
  PERFORM public.request_friend(v_dee, 'thirsty-sharkie-181');
  SELECT display_name INTO v_seen FROM public.friend_requests(v_ada) WHERE handle = 'mucho-chomp-shark-181';
  ASSERT v_seen = 'Dee Example', format('an incoming request carries the asker''s chosen name, got %s', v_seen);
  SELECT display_name INTO v_seen FROM public.friend_requests(v_dee) WHERE handle = 'thirsty-sharkie-181';
  ASSERT v_seen = 'thirsty-sharkie-181', format('an outgoing request shows the other side''s sharkname, got %s', v_seen);
  SELECT * INTO v_row FROM public.friend_lookup(v_dee, 'thirsty-sharkie-181');
  ASSERT v_row.state = 'pending_out' AND v_row.display_name = 'thirsty-sharkie-181',
    format('before an answer, a lookup shows the sharkname, got %s / %s', v_row.state, v_row.display_name);
  ASSERT NOT EXISTS (SELECT 1 FROM public.friend_list(v_dee, ARRAY['javascript'])),
    'and nobody is in Dee''s list, so no photo reached her';

  -- Without a handle there is nothing to show anybody: refused.
  BEGIN
    PERFORM public.set_friend_display('aaaaaaaa-0000-4000-8000-000000000186', TRUE, NULL);
    v_error := 'none';
  EXCEPTION WHEN OTHERS THEN v_error := SQLERRM;
  END;
  ASSERT v_error = 'no_handle', format('set_friend_display without a handle is no_handle, got %s', v_error);

  -- The browser cannot call the new routine.
  ASSERT NOT has_function_privilege('authenticated', 'public.set_friend_display(text, boolean, boolean)', 'EXECUTE'),
    'set_friend_display is service-role only';
  ASSERT NOT has_function_privilege('anon', 'public.friend_display_name(text)', 'EXECUTE'),
    'friend_display_name is service-role only';
END;
$$;
