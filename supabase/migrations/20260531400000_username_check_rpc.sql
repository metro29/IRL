-- Allow signup to check username availability without an existing session.

CREATE OR REPLACE FUNCTION public.is_username_taken(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = LOWER(TRIM(check_username))
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_taken(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_taken(TEXT) TO anon, authenticated;
