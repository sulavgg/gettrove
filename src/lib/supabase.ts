import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type HabitType = 
  | 'gym'
  | 'study'
  | 'wake_up_early'
  | 'meditate'
  | 'quit_bad_habit'
  | 'journal'
  | 'creative'
  | 'cardio'
  | 'drink_water'
  | 'healthy_eating'
  | 'other';

export const habitTypeLabels: Record<HabitType, { emoji: string; label: string }> = {
  gym: { emoji: '💪', label: 'Gym/Workout' },
  study: { emoji: '📚', label: 'Study/Read' },
  wake_up_early: { emoji: '⏰', label: 'Wake Up Early' },
  meditate: { emoji: '🧘', label: 'Meditate' },
  quit_bad_habit: { emoji: '🚫', label: 'Quit Bad Habit' },
  journal: { emoji: '✍️', label: 'Write/Journal' },
  creative: { emoji: '🎨', label: 'Creative Work' },
  cardio: { emoji: '🏃', label: 'Run/Cardio' },
  drink_water: { emoji: '💧', label: 'Drink Water' },
  healthy_eating: { emoji: '🥗', label: 'Healthy Eating' },
  other: { emoji: '🎯', label: 'Other' },
};

export const getHabitDisplay = (habitType: HabitType, customHabit?: string | null) => {
  if (habitType === 'other' && customHabit) {
    return { emoji: '🎯', label: customHabit };
  }
  return habitTypeLabels[habitType];
};
