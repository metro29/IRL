-- Consistency fixes: single activation path, idempotent challenge generation, RPC lockdown

-- ─── 1. Canonical activate_event (only path that may generate challenges) ─────

CREATE OR REPLACE FUNCTION public.activate_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_status public.event_status;
  v_start_time TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT group_id, status, start_time
  INTO v_group_id, v_status, v_start_time
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Idempotent: already activated or finished
  IF v_status <> 'scheduled' THEN
    RETURN;
  END IF;

  -- Manual admin activation OR auto-activation when start time reached (via sync)
  IF NOT (
    public.is_group_admin(v_group_id, auth.uid())
    OR (
      v_start_time <= NOW()
      AND public.is_group_member(v_group_id, auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to activate this event';
  END IF;

  UPDATE public.events
  SET status = 'active'
  WHERE id = p_event_id
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM public.generate_event_challenges(p_event_id);
END;
$$;

-- ─── 2. sync_group_event_statuses: only calls activate_event (no direct generation) ─

CREATE OR REPLACE FUNCTION public.sync_group_event_statuses(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_group_member(p_group_id, auth.uid()) THEN
    RETURN;
  END IF;

  FOR v_event_id IN
    SELECT e.id
    FROM public.events e
    WHERE e.group_id = p_group_id
      AND e.status = 'scheduled'
      AND e.start_time <= NOW()
  LOOP
    PERFORM public.activate_event(v_event_id);
  END LOOP;

  UPDATE public.events
  SET status = 'ended'
  WHERE group_id = p_group_id
    AND status = 'active'
    AND end_time < NOW();
END;
$$;

-- ─── 3. generate_event_challenges: idempotent, exactly 9, internal only ───────

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS challenges_event_sort_unique;

ALTER TABLE public.challenges
  ADD CONSTRAINT challenges_event_sort_unique UNIQUE (event_id, sort_order);

CREATE OR REPLACE FUNCTION public.generate_event_challenges(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_status public.event_status;
  v_generated BOOLEAN;
  v_existing_count INTEGER;
  v_tier INTEGER;
  v_row RECORD;
  v_order SMALLINT := 0;
  v_tiers INTEGER[] := ARRAY[1, 1, 1, 3, 3, 3, 5, 5, 10];
BEGIN
  SELECT e.group_id, e.status, e.challenges_generated
  INTO v_group_id, v_status, v_generated
  FROM public.events e
  WHERE e.id = p_event_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'active' THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_existing_count
  FROM public.challenges
  WHERE event_id = p_event_id;

  IF v_generated OR v_existing_count >= 9 THEN
    IF v_existing_count > 0 AND v_existing_count <> 9 THEN
      RAISE EXCEPTION 'Event % has invalid challenge count (%)', p_event_id, v_existing_count;
    END IF;
    UPDATE public.events SET challenges_generated = TRUE WHERE id = p_event_id;
    RETURN;
  END IF;

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Partial challenge set exists for event %; generation blocked', p_event_id;
  END IF;

  FOREACH v_tier IN ARRAY v_tiers LOOP
    v_order := v_order + 1;
    SELECT cp.title, cp.description, cp.tier
    INTO v_row
    FROM public.challenge_pool cp
    WHERE cp.tier = v_tier AND cp.is_active = TRUE
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Challenge pool missing templates for tier %', v_tier;
    END IF;

    INSERT INTO public.challenges (
      event_id, group_id, title, description, tier, xp_value, points_value, sort_order
    ) VALUES (
      p_event_id,
      v_group_id,
      v_row.title,
      v_row.description,
      v_tier,
      public.tier_xp(v_tier),
      public.tier_points(v_tier),
      v_order
    );
  END LOOP;

  IF (SELECT COUNT(*) FROM public.challenges WHERE event_id = p_event_id) <> 9 THEN
    RAISE EXCEPTION 'Challenge generation failed: expected 9 challenges';
  END IF;

  UPDATE public.events SET challenges_generated = TRUE WHERE id = p_event_id;
END;
$$;

-- ─── 4. Level computed ONLY in award_xp_and_points (document + enforce) ───────

COMMENT ON FUNCTION public.xp_to_level(INTEGER) IS
  'INTERNAL: level formula used only by award_xp_and_points. Clients must not replicate.';

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

-- ─── 5. RPC access control: revoke internal functions from clients ────────────

REVOKE ALL ON FUNCTION public.award_xp_and_points(UUID, INTEGER, INTEGER, public.xp_source_type, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_xp_and_points(UUID, INTEGER, INTEGER, public.xp_source_type, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.award_xp_and_points(UUID, INTEGER, INTEGER, public.xp_source_type, UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.generate_event_challenges(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_event_challenges(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.generate_event_challenges(UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) FROM authenticated;

-- Client + admin game RPCs (explicit allow list)
GRANT EXECUTE ON FUNCTION public.award_challenge_completion(UUID, UUID, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_event_attendance(UUID, UUID, TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.submit_event_attendance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_event_attendance(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_group_event_statuses(UUID) TO authenticated;
