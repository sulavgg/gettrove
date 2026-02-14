
-- Point transactions ledger for the full point system
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id),
  checkin_id UUID REFERENCES public.checkins(id),
  point_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see own points, group members can see each other's
CREATE POLICY "Users and group members can view points"
  ON public.point_transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = point_transactions.group_id
      AND group_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert own points"
  ON public.point_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_point_txn_user_created ON public.point_transactions(user_id, created_at);
CREATE INDEX idx_point_txn_checkin ON public.point_transactions(checkin_id);
CREATE INDEX idx_point_txn_group ON public.point_transactions(group_id);
CREATE INDEX idx_point_txn_type ON public.point_transactions(user_id, point_type);
