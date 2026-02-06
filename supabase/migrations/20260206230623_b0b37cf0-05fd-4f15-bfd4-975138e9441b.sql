-- Add theme preference column to profiles
ALTER TABLE public.profiles 
ADD COLUMN theme text NOT NULL DEFAULT 'dark' 
CHECK (theme IN ('dark', 'light'));