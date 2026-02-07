
-- Add email notification frequency preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_frequency text NOT NULL DEFAULT 'daily';

-- Valid values: 'all', 'daily', 'critical', 'weekly', 'none'
COMMENT ON COLUMN public.profiles.email_frequency IS 'Email notification frequency: all, daily, critical, weekly, none';
