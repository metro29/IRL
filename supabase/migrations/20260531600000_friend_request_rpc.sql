-- Reliable friend requests (direct INSERT + RLS subquery checks are fragile)

CREATE OR REPLACE FUNCTION public.has_pending_friend_request(
  p_user_a UUID,
  p_user_b UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_requests fr
    WHERE fr.status = 'pending'
      AND (
        (fr.sender_id = p_user_a AND fr.receiver_id = p_user_b)
        OR (fr.sender_id = p_user_b AND fr.receiver_id = p_user_a)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_pending_friend_request(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_friend_request(p_receiver_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'You cannot add yourself as a friend.';
  END IF;

  IF public.are_friends(v_sender_id, p_receiver_id) THEN
    RAISE EXCEPTION 'You are already friends.';
  END IF;

  IF public.has_pending_friend_request(v_sender_id, p_receiver_id) THEN
    IF EXISTS (
      SELECT 1
      FROM public.friend_requests fr
      WHERE fr.status = 'pending'
        AND fr.sender_id = p_receiver_id
        AND fr.receiver_id = v_sender_id
    ) THEN
      RAISE EXCEPTION 'This user already sent you a friend request. Accept it under Requests.';
    END IF;

    RAISE EXCEPTION 'A friend request is already pending.';
  END IF;

  INSERT INTO public.friend_requests (sender_id, receiver_id, status)
  VALUES (v_sender_id, p_receiver_id, 'pending')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
