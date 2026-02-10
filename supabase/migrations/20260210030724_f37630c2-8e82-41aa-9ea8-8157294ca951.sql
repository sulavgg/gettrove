CREATE POLICY "Users can delete own checkins"
ON public.checkins
FOR DELETE
USING (auth.uid() = user_id);