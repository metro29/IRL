-- Atomic group creation (bypasses RLS chicken-and-egg: owner cannot SELECT group until member row exists)

CREATE OR REPLACE FUNCTION public.user_has_group_membership(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm WHERE gm.user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_group_membership(UUID) TO authenticated;

-- Owners can read their group before membership row exists (bootstrap + invite code UI)
DROP POLICY IF EXISTS "groups_select_owner" ON public.groups;
CREATE POLICY "groups_select_owner"
  ON public.groups FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- Harden insert policy: membership check must not depend on member-visible RLS rows
DROP POLICY IF EXISTS "groups_insert_owner" ON public.groups;
CREATE POLICY "groups_insert_owner"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND NOT public.user_has_group_membership(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_group(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_id UUID;
  v_desc TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.user_has_group_membership(v_user_id) THEN
    RAISE EXCEPTION 'You can only belong to one group at a time';
  END IF;

  IF char_length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Group name must be at least 2 characters';
  END IF;

  v_desc := NULLIF(trim(COALESCE(p_description, '')), '');

  INSERT INTO public.groups (name, description, owner_id, invite_code)
  VALUES (trim(p_name), v_desc, v_user_id, '')
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'admin');

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group(TEXT, TEXT) TO authenticated;
