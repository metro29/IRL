-- Phase 3: Events, challenges, submissions, attendance, XP engine

CREATE TYPE public.event_status AS ENUM ('scheduled', 'active', 'ended');
CREATE TYPE public.attendance_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.xp_source_type AS ENUM ('challenge', 'event', 'achievement');
CREATE TYPE public.rsvp_status AS ENUM ('going', 'maybe', 'not_going');

-- Allow server-side XP awards through protect_profile_stats trigger
CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('summerquest.award_xp', true) = 'on' THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;
  IF NEW.points IS DISTINCT FROM OLD.points
    OR NEW.xp IS DISTINCT FROM OLD.xp
    OR NEW.level IS DISTINCT FROM OLD.level
    OR NEW.streak IS DISTINCT FROM OLD.streak
  THEN
    NEW.points := OLD.points;
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
    NEW.streak := OLD.streak;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
      AND gm.role = 'admin'
  );
$$;

-- ─── Events ────────────────────────────────────────────────────────────────────

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 2),
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status public.event_status NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  challenges_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_events_group_id ON public.events (group_id);
CREATE INDEX idx_events_status ON public.events (group_id, status);
CREATE INDEX idx_events_start_time ON public.events (start_time);

-- ─── RSVP (optional, tracked) ──────────────────────────────────────────────

CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_rsvps_unique UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_rsvps_event ON public.event_rsvps (event_id);

-- ─── Attendance (admin approval required) ────────────────────────────────────

CREATE TABLE public.event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT event_attendance_unique_user_event UNIQUE (event_id, user_id)
);

CREATE INDEX idx_event_attendance_event ON public.event_attendance (event_id);
CREATE INDEX idx_event_attendance_pending ON public.event_attendance (event_id, status)
  WHERE status = 'pending';

-- ─── Challenge template pool ─────────────────────────────────────────────────

CREATE TABLE public.challenge_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier INTEGER NOT NULL CHECK (tier IN (1, 3, 5, 10)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── Challenges (generated per active event) ─────────────────────────────────

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 3, 5, 10)),
  xp_value INTEGER NOT NULL,
  points_value INTEGER NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenges_event ON public.challenges (event_id);

-- ─── Submissions (instant completion, no approval) ───────────────────────────

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT submissions_unique_user_challenge UNIQUE (challenge_id, user_id)
);

CREATE INDEX idx_submissions_event ON public.submissions (event_id);
CREATE INDEX idx_submissions_group ON public.submissions (group_id);

-- ─── XP audit log ────────────────────────────────────────────────────────────

CREATE TABLE public.xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  source_type public.xp_source_type NOT NULL,
  source_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_logs_user ON public.xp_logs (user_id, created_at DESC);

-- ─── Tier → XP / points mapping ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tier_xp(p_tier INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 1 THEN 20
    WHEN 3 THEN 50
    WHEN 5 THEN 100
    WHEN 10 THEN 200
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.tier_points(p_tier INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 1 THEN 1
    WHEN 3 THEN 3
    WHEN 5 THEN 5
    WHEN 10 THEN 10
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.xp_to_level(p_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, (p_xp / 100) + 1);
$$;

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
BEGIN
  IF p_xp <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.xp_logs (user_id, amount, source_type, source_id)
  VALUES (p_user_id, p_xp, p_source_type, p_source_id);

  PERFORM set_config('summerquest.award_xp', 'on', true);

  UPDATE public.profiles
  SET
    xp = xp + p_xp,
    points = points + p_points,
    level = public.xp_to_level(xp + p_xp)
  WHERE id = p_user_id;
END;
$$;

-- ─── Generate challenges when event goes active ──────────────────────────────

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
  v_tier INTEGER;
  v_row RECORD;
  v_order SMALLINT := 0;
  v_tiers INTEGER[] := ARRAY[1, 1, 1, 3, 3, 3, 5, 5, 10];
BEGIN
  SELECT group_id, status, challenges_generated
  INTO v_group_id, v_status, v_generated
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND OR v_status <> 'active' OR v_generated THEN
    RETURN;
  END IF;

  IF (SELECT COUNT(*) FROM public.challenges WHERE event_id = p_event_id) >= 9 THEN
    UPDATE public.events SET challenges_generated = TRUE WHERE id = p_event_id;
    RETURN;
  END IF;

  FOREACH v_tier IN ARRAY v_tiers LOOP
    v_order := v_order + 1;
    SELECT id, title, description, tier
    INTO v_row
    FROM public.challenge_pool
    WHERE tier = v_tier AND is_active = TRUE
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

  UPDATE public.events SET challenges_generated = TRUE WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT group_id INTO v_group_id FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  IF NOT public.is_group_admin(v_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can activate events';
  END IF;

  UPDATE public.events
  SET status = 'active'
  WHERE id = p_event_id AND status = 'scheduled';

  PERFORM public.generate_event_challenges(p_event_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT group_id INTO v_group_id FROM public.events WHERE id = p_event_id;
  IF NOT public.is_group_admin(v_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can end events';
  END IF;
  UPDATE public.events SET status = 'ended' WHERE id = p_event_id AND status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_group_event_statuses(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
BEGIN
  IF NOT public.is_group_member(p_group_id, auth.uid()) THEN
    RETURN;
  END IF;

  FOR v_event IN
    SELECT id FROM public.events
    WHERE group_id = p_group_id
      AND status = 'scheduled'
      AND start_time <= NOW()
  LOOP
    UPDATE public.events SET status = 'active' WHERE id = v_event.id;
    PERFORM public.generate_event_challenges(v_event.id);
  END LOOP;

  UPDATE public.events
  SET status = 'ended'
  WHERE group_id = p_group_id
    AND status = 'active'
    AND end_time < NOW();
END;
$$;

-- Submit challenge (instant XP + points)
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
  v_user_id UUID := auth.uid();
  v_event_id UUID;
  v_group_id UUID;
  v_tier INTEGER;
  v_xp INTEGER;
  v_points INTEGER;
  v_status public.event_status;
  v_submission_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.event_id, c.group_id, c.tier, c.xp_value, c.points_value, e.status
  INTO v_event_id, v_group_id, v_tier, v_xp, v_points, v_status
  FROM public.challenges c
  JOIN public.events e ON e.id = c.event_id
  WHERE c.id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Challenges are only available during active events';
  END IF;

  IF NOT public.is_group_member(v_group_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submissions
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You already completed this challenge';
  END IF;

  INSERT INTO public.submissions (
    challenge_id, event_id, group_id, user_id, photo_url, caption
  ) VALUES (
    p_challenge_id, v_event_id, v_group_id, v_user_id, p_photo_url, p_caption
  )
  RETURNING id INTO v_submission_id;

  PERFORM public.award_xp_and_points(
    v_user_id, v_xp, v_points, 'challenge', v_submission_id
  );

  RETURN v_submission_id;
END;
$$;

-- Submit attendance (pending)
CREATE OR REPLACE FUNCTION public.submit_event_attendance(
  p_event_id UUID,
  p_photo_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_id UUID;
  v_status public.event_status;
  v_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT group_id, status INTO v_group_id, v_status
  FROM public.events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT public.is_group_member(v_group_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF v_status NOT IN ('active', 'ended') THEN
    RAISE EXCEPTION 'Attendance is only available for active or ended events';
  END IF;

  IF p_photo_url IS NULL OR trim(p_photo_url) = '' THEN
    RAISE EXCEPTION 'Photo proof is required';
  END IF;

  INSERT INTO public.event_attendance (event_id, group_id, user_id, photo_url, status)
  VALUES (p_event_id, v_group_id, v_user_id, p_photo_url, 'pending')
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'You already submitted attendance for this event';
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_event_attendance(
  p_attendance_id UUID,
  p_approve BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id UUID;
  v_status public.attendance_status;
  v_event_id UUID;
BEGIN
  SELECT ea.group_id, ea.user_id, ea.status, ea.event_id
  INTO v_group_id, v_user_id, v_status, v_event_id
  FROM public.event_attendance ea
  WHERE ea.id = p_attendance_id;

  IF NOT FOUND OR v_status <> 'pending' THEN
    RAISE EXCEPTION 'Attendance record not found or already reviewed';
  END IF;

  IF NOT public.is_group_admin(v_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group admins can review attendance';
  END IF;

  IF p_approve THEN
    UPDATE public.event_attendance
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW()
    WHERE id = p_attendance_id;

    PERFORM public.award_xp_and_points(
      v_user_id, 25, 0, 'event', p_attendance_id
    );
  ELSE
    UPDATE public.event_attendance
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW()
    WHERE id = p_attendance_id;
  END IF;
END;
$$;

-- ─── Seed challenge pool ───────────────────────────────────────────────────────

INSERT INTO public.challenge_pool (tier, title, description) VALUES
(1, 'Group Selfie', 'Take a photo with at least 3 group members.'),
(1, 'High Five Chain', 'Get a chain of 5 high-fives on camera.'),
(1, 'Stranger Compliment', 'Give a genuine compliment to someone new (keep it kind).'),
(1, 'Jump Shot', 'Capture everyone mid-jump in one photo.'),
(1, 'Local Landmark', 'Photo in front of a local landmark or sign.'),
(1, 'Funny Pose', 'Strike the silliest pose your group agrees on.'),
(3, 'Team TikTok', 'Record a 10-second group clip doing a trending move.'),
(3, 'Food Share', 'Share a snack with someone outside your usual circle.'),
(3, 'Mini Scavenger', 'Find 3 items on a quick scavenger list and photo them.'),
(3, 'Talent Flash', 'Someone shows a 15-second hidden talent on video.'),
(3, 'Public Cheer', 'Lead a short positive cheer with your group.'),
(3, 'Photo Bomb Kindness', 'Ask a stranger to join your group photo politely.'),
(5, 'Quest Interview', 'Interview a stranger about their best summer memory (with consent).'),
(5, 'Flash Mob Lite', 'Organize a 30-second harmless group dance in a public space.'),
(5, 'Creative Chalk', 'Leave positive chalk art in an allowed public spot.'),
(5, 'Pay It Forward', 'Document a small kind act for someone in public.'),
(10, 'Legendary Group Stunt', 'Plan and execute a memorable but safe group moment everyone agrees on.'),
(10, 'SummerQuest Documentary', 'Create a 60-second recap video of today''s event highlights.');

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;

-- Events
CREATE POLICY "events_select_group_member"
  ON public.events FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "events_insert_admin"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
    AND auth.uid() = created_by
  );

CREATE POLICY "events_update_admin"
  ON public.events FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "events_delete_admin"
  ON public.events FOR DELETE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()));

-- RSVPs
CREATE POLICY "event_rsvps_select_group_member"
  ON public.event_rsvps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_rsvps.event_id
        AND public.is_group_member(e.group_id, auth.uid())
    )
  );

CREATE POLICY "event_rsvps_upsert_own"
  ON public.event_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.is_group_member(e.group_id, auth.uid())
    )
  );

CREATE POLICY "event_rsvps_update_own"
  ON public.event_rsvps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Attendance
CREATE POLICY "event_attendance_select_group_member"
  ON public.event_attendance FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "event_attendance_insert_none"
  ON public.event_attendance FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "event_attendance_update_admin"
  ON public.event_attendance FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()));

-- Challenge pool (read only)
CREATE POLICY "challenge_pool_select_authenticated"
  ON public.challenge_pool FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Challenges
CREATE POLICY "challenges_select_group_member"
  ON public.challenges FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "challenges_insert_none"
  ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (false);

-- Submissions
CREATE POLICY "submissions_select_group_member"
  ON public.submissions FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "submissions_insert_none"
  ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (false);

-- XP logs
CREATE POLICY "xp_logs_select_own"
  ON public.xp_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "xp_logs_insert_none"
  ON public.xp_logs FOR INSERT TO authenticated
  WITH CHECK (false);

GRANT EXECUTE ON FUNCTION public.sync_group_event_statuses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_challenge(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_event_attendance(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_event_attendance(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;

-- Realtime (run in dashboard or via publication if needed):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.events, public.submissions, public.event_attendance, public.profiles;
