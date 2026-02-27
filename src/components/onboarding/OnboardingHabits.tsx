import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptic';

const HABITS = [
  { key: 'gym', emoji: '🏋️', label: 'Gym' },
  { key: 'cardio', emoji: '🏃', label: 'Cardio' },
  { key: 'study', emoji: '📚', label: 'Study' },
  { key: 'wake_up_early', emoji: '⏰', label: 'Wake Up Early' },
  { key: 'meditate', emoji: '🧘', label: 'Mindfulness' },
  { key: 'healthy_eating', emoji: '🥗', label: 'Diet' },
  { key: 'drink_water', emoji: '💧', label: 'Hydration' },
  { key: 'journal', emoji: '📝', label: 'Journal' },
  { key: 'creative', emoji: '🎨', label: 'Creative' },
  { key: 'quit_bad_habit', emoji: '🚫', label: 'Quit Bad Habit' },
];

interface Props {
  selectedHabits: string[];
  setSelectedHabits: (habits: string[]) => void;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingHabits = ({ selectedHabits, setSelectedHabits, onNext, onSkip }: Props) => {
  const toggleHabit = (key: string) => {
    triggerHaptic('light');
    if (selectedHabits.includes(key)) {
      setSelectedHabits(selectedHabits.filter((h) => h !== key));
    } else if (selectedHabits.length < 5) {
      setSelectedHabits([...selectedHabits, key]);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
      >
        <h2 className="text-3xl font-heading font-black text-foreground tracking-tight mb-2">
          Pick Your Habits
        </h2>
        <p className="text-muted-foreground mb-8">
          Choose up to 5 habits you want to build. You can always change these later.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {HABITS.map((habit, index) => {
            const selected = selectedHabits.includes(habit.key);
            return (
              <motion.button
                key={habit.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => toggleHabit(habit.key)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 active:scale-[0.97]',
                  selected
                    ? 'bg-gold/15 border-gold text-foreground shadow-glow'
                    : 'bg-card border-border hover:border-muted-foreground/30 text-foreground'
                )}
              >
                <span className="text-2xl">{habit.emoji}</span>
                <span className="font-semibold text-sm">{habit.label}</span>
              </motion.button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {selectedHabits.length}/5 selected
        </p>
      </motion.div>

      <div className="max-w-sm mx-auto w-full space-y-3">
        <Button
          onClick={onNext}
          disabled={selectedHabits.length === 0}
          className="w-full h-14 bg-gold text-gold-foreground font-bold uppercase tracking-wide shadow-glow text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Continue
        </Button>
        <button onClick={onSkip} className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2 text-sm">
          Skip for now
        </button>
      </div>
    </div>
  );
};
