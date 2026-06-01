-- Private DMs between friends only (1:1 conversations)

CREATE TABLE public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dm_conversations_ordered CHECK (user_a < user_b),
  CONSTRAINT dm_conversations_no_self CHECK (user_a <> user_b),
  CONSTRAINT dm_conversations_unique_pair UNIQUE (user_a, user_b)
);

CREATE INDEX idx_dm_conversations_user_a ON public.dm_conversations (user_a);
CREATE INDEX idx_dm_conversations_user_b ON public.dm_conversations (user_b);

CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 1),
  message_type public.message_type NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dm_messages_conversation_created
  ON public.dm_messages (conversation_id, created_at ASC);

-- Open or create a thread with a friend
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_low UUID;
  v_high UUID;
  v_id UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'You cannot message yourself';
  END IF;

  IF NOT public.are_friends(v_me, p_other_user_id) THEN
    RAISE EXCEPTION 'You can only message friends';
  END IF;

  v_low := LEAST(v_me, p_other_user_id);
  v_high := GREATEST(v_me, p_other_user_id);

  INSERT INTO public.dm_conversations (user_a, user_b)
  VALUES (v_low, v_high)
  ON CONFLICT (user_a, user_b) DO NOTHING;

  SELECT id INTO v_id
  FROM public.dm_conversations
  WHERE user_a = v_low AND user_b = v_high;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(UUID) TO authenticated;

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm_conversations_select_participant"
  ON public.dm_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "dm_conversations_insert_friends"
  ON public.dm_conversations FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user_a OR auth.uid() = user_b)
    AND public.are_friends(user_a, user_b)
  );

CREATE POLICY "dm_messages_select_participant"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

CREATE POLICY "dm_messages_insert_friend_sender"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
        AND public.are_friends(c.user_a, c.user_b)
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
