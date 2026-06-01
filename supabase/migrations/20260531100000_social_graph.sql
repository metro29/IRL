-- SummerQuest: Profiles (Phase 1) + Social graph (Phase 2)
-- Safe to run on a fresh project. Run this entire file in the Supabase SQL Editor.

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1: profiles (required before social tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_username_unique UNIQUE (username),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,24}$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS profiles_protect_stats ON public.profiles;
CREATE TRIGGER profiles_protect_stats
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_stats();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base_username IS NULL OR LENGTH(base_username) < 3 THEN
    base_username := 'user';
  END IF;
  final_username := SUBSTRING(base_username FROM 1 FOR 20);

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := SUBSTRING(base_username FROM 1 FOR 16) || suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', final_username)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for users who signed up before this migration
INSERT INTO public.profiles (id, username, display_name)
SELECT
  u.id,
  SUBSTRING(
    COALESCE(
      NULLIF(LOWER(REGEXP_REPLACE(SPLIT_PART(u.email, '@', 1), '[^a-z0-9_]', '', 'g')), ''),
      'user'
    ) FROM 1 FOR 20
  ) || substr(md5(u.id::text), 1, 4),
  COALESCE(u.raw_user_meta_data ->> 'display_name', SPLIT_PART(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2: Social graph (friends, requests, groups, membership)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE public.friend_request_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.group_member_role AS ENUM ('member', 'admin');

-- ─── Friends (canonical pair: user_id < friend_id) ───────────────────────────

CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friends_ordered_pair CHECK (user_id < friend_id),
  CONSTRAINT friends_no_self CHECK (user_id <> friend_id),
  CONSTRAINT friends_unique_pair UNIQUE (user_id, friend_id)
);

CREATE INDEX idx_friends_user_id ON public.friends (user_id);
CREATE INDEX idx_friends_friend_id ON public.friends (friend_id);

-- ─── Friend requests ─────────────────────────────────────────────────────────

CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.friend_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX idx_friend_requests_pending_pair
  ON public.friend_requests (sender_id, receiver_id)
  WHERE status = 'pending';

CREATE INDEX idx_friend_requests_receiver_pending
  ON public.friend_requests (receiver_id)
  WHERE status = 'pending';

CREATE INDEX idx_friend_requests_sender_pending
  ON public.friend_requests (sender_id)
  WHERE status = 'pending';

-- ─── Groups ──────────────────────────────────────────────────────────────────

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  description TEXT,
  invite_code TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT groups_invite_code_unique UNIQUE (invite_code),
  CONSTRAINT groups_invite_code_format CHECK (invite_code ~ '^[A-Z0-9]{8}$')
);

CREATE INDEX idx_groups_owner_id ON public.groups (owner_id);
CREATE INDEX idx_groups_invite_code ON public.groups (invite_code);

-- ─── Group members ───────────────────────────────────────────────────────────

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.group_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_members_unique_user_per_group UNIQUE (group_id, user_id),
  CONSTRAINT group_members_one_group_per_user UNIQUE (user_id)
);

CREATE INDEX idx_group_members_group_id ON public.group_members (group_id);

-- ─── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    done := NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.invite_code = result);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_group_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER groups_set_invite_code
  BEFORE INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_group_invite_code();

CREATE OR REPLACE FUNCTION public.are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friends f
    WHERE f.user_id = LEAST(p_user_a, p_user_b)
      AND f.friend_id = GREATEST(p_user_a, p_user_b)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_group_member_count(p_group_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.group_members WHERE group_id = p_group_id;
$$;

-- Accept friend request atomically
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender UUID;
  v_receiver UUID;
  v_friendship_id UUID;
  v_low UUID;
  v_high UUID;
BEGIN
  SELECT sender_id, receiver_id
  INTO v_sender, v_receiver
  FROM public.friend_requests
  WHERE id = p_request_id
    AND status = 'pending'
    AND receiver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;

  IF public.are_friends(v_sender, v_receiver) THEN
    UPDATE public.friend_requests
    SET status = 'accepted', updated_at = NOW()
    WHERE id = p_request_id;
    RETURN p_request_id;
  END IF;

  v_low := LEAST(v_sender, v_receiver);
  v_high := GREATEST(v_sender, v_receiver);

  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.friends (user_id, friend_id)
  VALUES (v_low, v_high)
  ON CONFLICT (user_id, friend_id) DO NOTHING
  RETURNING id INTO v_friendship_id;

  RETURN COALESCE(v_friendship_id, p_request_id);
END;
$$;

-- Join group by invite code
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_member_count INT;
  v_max_members CONSTANT INT := 20;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_group_id
  FROM public.groups
  WHERE invite_code = upper(trim(p_invite_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF public.is_group_member(v_group_id, v_user_id) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  IF EXISTS (SELECT 1 FROM public.group_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'You can only belong to one group at a time';
  END IF;

  v_member_count := public.get_group_member_count(v_group_id);
  IF v_member_count >= v_max_members THEN
    RAISE EXCEPTION 'This group is full';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'member');

  RETURN v_group_id;
END;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Friends
CREATE POLICY "friends_select_own"
  ON public.friends FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friends_insert_none"
  ON public.friends FOR INSERT TO authenticated
  WITH CHECK (false);

-- Friend requests
CREATE POLICY "friend_requests_select_participant"
  ON public.friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "friend_requests_insert_sender"
  ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> receiver_id
    AND NOT public.are_friends(sender_id, receiver_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'pending'
        AND (
          (fr.sender_id = sender_id AND fr.receiver_id = receiver_id)
          OR (fr.sender_id = receiver_id AND fr.receiver_id = sender_id)
        )
    )
  );

CREATE POLICY "friend_requests_update_receiver"
  ON public.friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "friend_requests_delete_sender_pending"
  ON public.friend_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id AND status = 'pending');

-- Groups
CREATE POLICY "groups_select_member"
  ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "groups_insert_owner"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.user_id = auth.uid())
  );

CREATE POLICY "groups_update_owner"
  ON public.groups FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "groups_delete_owner"
  ON public.groups FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Group members
CREATE POLICY "group_members_select_same_group"
  ON public.group_members FOR SELECT TO authenticated
  USING (
    public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "group_members_insert_self_via_rpc"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.user_id = auth.uid())
  );

CREATE POLICY "group_members_delete_self_or_owner"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id
        AND g.owner_id = auth.uid()
    )
  );

-- Allow owner to insert themselves when creating a group (bypass one-group check for first insert)
CREATE POLICY "group_members_insert_owner_bootstrap"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_id
        AND g.owner_id = auth.uid()
    )
  );

-- Grant execute on RPCs
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
