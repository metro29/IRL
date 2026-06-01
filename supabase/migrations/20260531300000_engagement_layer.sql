-- Phase 4: group chat, notifications (server-only inserts), realtime

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE public.message_type AS ENUM ('text', 'image');

CREATE TYPE public.notification_type AS ENUM (
  'friend_request',
  'friend_accept',
  'event_created',
  'event_live',
  'challenge_completed',
  'xp_awarded',
  'attendance_approved'
);

-- ─── group_messages ──────────────────────────────────────────────────────────

CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 1),
  message_type public.message_type NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_messages_group_created
  ON public.group_messages (group_id, created_at DESC);

-- ─── notifications ─────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read = FALSE;

CREATE INDEX idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- ─── Internal notification helper (triggers only — NOT an RPC) ───────────────

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
BEGIN
  IF p_user_id IS NULL OR p_title IS NULL OR trim(p_title) = '' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (p_user_id, p_type, p_title, COALESCE(p_body, ''), COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, public.notification_type, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_notification(UUID, public.notification_type, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.create_notification(UUID, public.notification_type, TEXT, TEXT, JSONB) FROM authenticated;

-- ─── Notification triggers: SOLE insert path for notifications ───────────────

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
      jsonb_build_object('request_id', NEW.id, 'sender_id', NEW.sender_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_friend_request_insert
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_friend_request();

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
      jsonb_build_object('friend_id', NEW.receiver_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_friend_accept_update
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_friend_accept();

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
      jsonb_build_object('event_id', NEW.id, 'group_id', NEW.group_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_event_created_insert
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_event_created();

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
        jsonb_build_object('event_id', NEW.id, 'group_id', NEW.group_id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_event_live_update
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_event_live();

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

CREATE TRIGGER notify_challenge_completed_insert
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_challenge_completed();

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
      WHEN 'attendance' THEN 'Event attendance approved'
      WHEN 'bonus' THEN 'Bonus XP'
      ELSE 'XP earned'
    END,
    jsonb_build_object(
      'amount', NEW.amount,
      'source_type', NEW.source_type,
      'source_id', NEW.source_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_xp_awarded_insert
  AFTER INSERT ON public.xp_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_xp_awarded();

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
      jsonb_build_object('event_id', NEW.event_id, 'attendance_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_attendance_approved_update
  AFTER UPDATE ON public.event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_attendance_approved();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_messages_select_member"
  ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "group_messages_insert_member"
  ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own_read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND type = (SELECT n.type FROM public.notifications n WHERE n.id = notifications.id)
    AND title = (SELECT n.title FROM public.notifications n WHERE n.id = notifications.id)
    AND body = (SELECT n.body FROM public.notifications n WHERE n.id = notifications.id)
    AND metadata = (SELECT n.metadata FROM public.notifications n WHERE n.id = notifications.id)
    AND created_at = (SELECT n.created_at FROM public.notifications n WHERE n.id = notifications.id)
  );

-- Chat storage: dedicated `chat` bucket — see 20260531310000_engagement_hardening.sql

-- ─── Realtime publication ────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
