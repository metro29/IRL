-- Phase 3 hardening: canonical RPCs, stricter RLS, revoke direct XP manipulation

-- ─── award_xp_and_points: server-only (not callable from clients) ────────────

REVOKE ALL ON FUNCTION public.award_xp_and_points(UUID, INTEGER, INTEGER, public.xp_source_type, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_xp_and_points(UUID, INTEGER, INTEGER, public.xp_source_type, UUID) FROM authenticated;

-- ─── Canonical challenge completion RPC ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_challenge_completion(
  p_user_id UUID,
  p_challenge_id UUID,
  p_photo_url TEXT,
  p_caption TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_group_id UUID;
  v_xp INTEGER;
  v_points INTEGER;
  v_status public.event_status;
  v_submission_id UUID;
  v_new_xp INTEGER;
  v_new_points INTEGER;
  v_new_level INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: user mismatch';
  END IF;

  IF p_photo_url IS NULL OR trim(p_photo_url) = '' THEN
    RAISE EXCEPTION 'Photo proof is required';
  END IF;

  SELECT c.event_id, c.group_id, c.xp_value, c.points_value, e.status
  INTO v_event_id, v_group_id, v_xp, v_points, v_status
  FROM public.challenges c
  INNER JOIN public.events e ON e.id = c.event_id
  WHERE c.id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Challenges are only available during active events';
  END IF;

  IF NOT public.is_group_member(v_group_id, p_user_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submissions
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You already completed this challenge';
  END IF;

  INSERT INTO public.submissions (
    challenge_id, event_id, group_id, user_id, photo_url, caption
  ) VALUES (
    p_challenge_id, v_event_id, v_group_id, p_user_id, trim(p_photo_url), p_caption
  )
  RETURNING id INTO v_submission_id;

  PERFORM public.award_xp_and_points(
    p_user_id, v_xp, v_points, 'challenge', v_submission_id
  );

  SELECT xp, points, level
  INTO v_new_xp, v_new_points, v_new_level
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'xp_awarded', v_xp,
    'points_awarded', v_points,
    'new_xp', v_new_xp,
    'new_points', v_new_points,
    'new_level', v_new_level
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_challenge_completion(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Backward-compatible alias (frontend must not rely on this long-term)
CREATE OR REPLACE FUNCTION public.submit_challenge(
  p_challenge_id UUID,
  p_photo_url TEXT,
  p_caption TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.award_challenge_completion(
    auth.uid(), p_challenge_id, p_photo_url, p_caption
  );
  RETURN (v_result ->> 'submission_id')::UUID;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) TO authenticated;

-- Attendance RPCs: enforce auth.uid() = user_id on submit ─────────────────────

CREATE OR REPLACE FUNCTION public.submit_event_attendance(
  p_user_id UUID,
  p_event_id UUID,
  p_photo_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_status public.event_status;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: user mismatch';
  END IF;

  SELECT group_id, status INTO v_group_id, v_status
  FROM public.events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT public.is_group_member(v_group_id, p_user_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF v_status NOT IN ('active', 'ended') THEN
    RAISE EXCEPTION 'Attendance is only available for active or ended events';
  END IF;

  IF p_photo_url IS NULL OR trim(p_photo_url) = '' THEN
    RAISE EXCEPTION 'Photo proof is required';
  END IF;

  INSERT INTO public.event_attendance (event_id, group_id, user_id, photo_url, status)
  VALUES (p_event_id, v_group_id, p_user_id, trim(p_photo_url), 'pending')
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'You already submitted attendance for this event';
  END IF;

  RETURN v_id;
END;
$$;

-- Overload for existing callers (event_id, photo_url only)
CREATE OR REPLACE FUNCTION public.submit_event_attendance(
  p_event_id UUID,
  p_photo_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.submit_event_attendance(auth.uid(), p_event_id, p_photo_url);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_event_attendance(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_event_attendance(UUID, TEXT) TO authenticated;

-- ─── Stricter RLS ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "challenges_select_group_member" ON public.challenges;
CREATE POLICY "challenges_select_active_member"
  ON public.challenges FOR SELECT TO authenticated
  USING (
    public.is_group_member(group_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = challenges.event_id
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "submissions_select_group_member" ON public.submissions;
CREATE POLICY "submissions_select_own"
  ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Group admins can view submissions for moderation (attendance panel context)
CREATE POLICY "submissions_select_group_admin"
  ON public.submissions FOR SELECT TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()));

-- Block any client profile stat updates (defense in depth with trigger)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own_display_only"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND xp = (SELECT p.xp FROM public.profiles p WHERE p.id = auth.uid())
    AND points = (SELECT p.points FROM public.profiles p WHERE p.id = auth.uid())
    AND level = (SELECT p.level FROM public.profiles p WHERE p.id = auth.uid())
    AND streak = (SELECT p.streak FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Realtime publication (idempotent — ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendance;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
