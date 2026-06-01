-- Stability: idempotent XP, notification dedupe, revoke legacy submit_challenge

-- ─── XP: one award per (user, source_type, source_id) ────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_logs_user_source_unique
  ON public.xp_logs (user_id, source_type, source_id);

CREATE OR REPLACE FUNCTION public.award_xp_and_points(
  p_user_id UUID,
  p_xp INTEGER,
  p_points INTEGER,
  p_source_type public.xp_source_type,
  p_source_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp INTEGER;
BEGIN
  IF p_xp <= 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.xp_logs
    WHERE user_id = p_user_id
      AND source_type = p_source_type
      AND source_id = p_source_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.xp_logs (user_id, amount, source_type, source_id)
  VALUES (p_user_id, p_xp, p_source_type, p_source_id);

  PERFORM set_config('summerquest.award_xp', 'on', true);

  SELECT xp + p_xp INTO v_new_xp FROM public.profiles WHERE id = p_user_id;

  UPDATE public.profiles
  SET
    xp = v_new_xp,
    points = points + p_points,
    level = public.xp_to_level(v_new_xp)
  WHERE id = p_user_id;
END;
$$;

-- ─── Notifications: idempotent via metadata.dedupe_key ───────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe_key
  ON public.notifications (user_id, ((metadata ->> 'dedupe_key')))
  WHERE (metadata ->> 'dedupe_key') IS NOT NULL
    AND (metadata ->> 'dedupe_key') <> '';

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_dedupe TEXT;
BEGIN
  IF p_user_id IS NULL OR p_title IS NULL OR trim(p_title) = '' THEN
    RETURN NULL;
  END IF;

  v_dedupe := NULLIF(trim(p_metadata ->> 'dedupe_key'), '');

  IF v_dedupe IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND n.metadata ->> 'dedupe_key' = v_dedupe
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, COALESCE(p_body, ''), COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── Triggers: pass stable dedupe_key per logical event ──────────────────────

CREATE OR REPLACE FUNCTION public.trg_notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE id = NEW.sender_id;
    PERFORM public.create_notification(
      NEW.receiver_id,
      'friend_request',
      'New friend request',
      COALESCE(v_name, 'Someone') || ' sent you a friend request',
      jsonb_build_object(
        'dedupe_key', 'friend_request:' || NEW.id::text,
        'request_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_friend_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT display_name INTO v_name FROM public.profiles WHERE id = NEW.receiver_id;
    PERFORM public.create_notification(
      NEW.sender_id,
      'friend_accept',
      'Friend request accepted',
      COALESCE(v_name, 'Someone') || ' accepted your friend request',
      jsonb_build_object(
        'dedupe_key', 'friend_accept:' || NEW.id::text,
        'friend_id', NEW.receiver_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_event_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member UUID;
BEGIN
  FOR v_member IN
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id
      AND gm.user_id <> NEW.created_by
  LOOP
    PERFORM public.create_notification(
      v_member,
      'event_created',
      'New event scheduled',
      NEW.title,
      jsonb_build_object(
        'dedupe_key', 'event_created:' || NEW.id::text || ':' || v_member::text,
        'event_id', NEW.id,
        'group_id', NEW.group_id
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_event_live()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'active' AND NEW.status = 'active' THEN
    FOR v_member IN
      SELECT gm.user_id
      FROM public.group_members gm
      WHERE gm.group_id = NEW.group_id
    LOOP
      PERFORM public.create_notification(
        v_member,
        'event_live',
        'Event is live!',
        NEW.title || ' is now active — challenges unlocked',
        jsonb_build_object(
          'dedupe_key', 'event_live:' || NEW.id::text || ':' || v_member::text,
          'event_id', NEW.id,
          'group_id', NEW.group_id
        )
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_challenge_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member UUID;
  v_name TEXT;
  v_title TEXT;
BEGIN
  SELECT display_name INTO v_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO v_title FROM public.challenges WHERE id = NEW.challenge_id;

  FOR v_member IN
    SELECT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = NEW.group_id
      AND gm.user_id <> NEW.user_id
  LOOP
    PERFORM public.create_notification(
      v_member,
      'challenge_completed',
      'Challenge completed',
      COALESCE(v_name, 'A teammate') || ' completed "' || COALESCE(v_title, 'a challenge') || '"',
      jsonb_build_object(
        'dedupe_key', 'challenge_completed:' || NEW.id::text || ':' || v_member::text,
        'submission_id', NEW.id,
        'event_id', NEW.event_id,
        'group_id', NEW.group_id,
        'user_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_xp_awarded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'xp_awarded',
    '+' || NEW.amount::TEXT || ' XP',
    CASE NEW.source_type
      WHEN 'challenge' THEN 'Challenge completed'
      WHEN 'event' THEN 'Event attendance approved'
      WHEN 'achievement' THEN 'Bonus XP'
      ELSE 'XP earned'
    END,
    jsonb_build_object(
      'dedupe_key', 'xp_awarded:' || NEW.id::text,
      'amount', NEW.amount,
      'source_type', NEW.source_type,
      'source_id', NEW.source_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_attendance_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved' THEN
    SELECT title INTO v_title FROM public.events WHERE id = NEW.event_id;
    PERFORM public.create_notification(
      NEW.user_id,
      'attendance_approved',
      'Attendance approved',
      'You earned attendance XP for ' || COALESCE(v_title, 'the event'),
      jsonb_build_object(
        'dedupe_key', 'attendance_approved:' || NEW.id::text,
        'event_id', NEW.event_id,
        'attendance_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Legacy alias — not a client entrypoint (use award_challenge_completion)
REVOKE ALL ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) FROM authenticated;

COMMENT ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) IS
  'DEPRECATED internal wrapper around award_challenge_completion. Do not call from clients.';
