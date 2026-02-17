-- Enable the http extension for the auth hook to call the edge function
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Note: The auth email hook must be configured via the Supabase dashboard/config
-- to point to the send-auth-email edge function.
-- This migration ensures the extension is available.
