
-- Create table to track pending group invites
CREATE TABLE public.group_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  invited_name text NOT NULL,
  invited_identifier text, -- phone number, email, or display name
  invite_method text NOT NULL DEFAULT 'link', -- 'link', 'text', 'whatsapp', 'instagram', 'other'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'joined', 'reminded'
  joined_user_id uuid, -- populated when they actually join
  reminded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Group members can view invites for their groups
CREATE POLICY "Group members can view invites"
ON public.group_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_invites.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Policy: Group members can create invites
CREATE POLICY "Members can create invites"
ON public.group_invites
FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_invites.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Policy: Invite creator can update their invites
CREATE POLICY "Creators can update own invites"
ON public.group_invites
FOR UPDATE
USING (auth.uid() = invited_by);

-- Policy: Invite creator can delete their invites
CREATE POLICY "Creators can delete own invites"
ON public.group_invites
FOR DELETE
USING (auth.uid() = invited_by);

-- Trigger for updated_at
CREATE TRIGGER update_group_invites_updated_at
BEFORE UPDATE ON public.group_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
