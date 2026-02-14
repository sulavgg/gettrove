
-- Add selfie_url and capture_timestamp to checkins for two-step verification
ALTER TABLE public.checkins
ADD COLUMN selfie_url text,
ADD COLUMN capture_timestamp timestamp with time zone;
