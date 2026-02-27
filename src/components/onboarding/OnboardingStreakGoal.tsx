import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES: Record<number, string> = {
  3: "3 days? A solid start 💪",
  7: "7 days? That's how champions are built 🔥",
  14: "2 weeks of fire? You're serious 🏆",
  21: "21 days makes a habit — legend move 👑",
  30: "A full month?! Absolute beast mode 🦁",
};

function getMotivation(days: number): string {
  if (days <= 3) return MESSAGES[3];
  if (days <= 7) return MESSAGES[7];
  if (days <= 14) return MESSAGES[14];
  if (days <= 21) return MESSAGES[21];
  return MESSAGES[30];
}

interface Props {
  streakGoal: number;
  setStreakGoal: (goal: number) => void;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingStreakGoal = ({ streakGoal, setStreakGoal, onNext, onSkip }: Props) => {
  return (
    <div className="flex-1 flex flex-col px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
      >
        <h2 className="text-3xl font-heading font-black text-foreground tracking-tight mb-2">
          Set Your First Goal
        </h2>
        <p className="text-muted-foreground mb-10">
          How many days in a row can you commit to?
        </p>

        {/* Big number display */}
        <div className="text-center mb-8">
          <motion.div
            key={streakGoal}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="text-7xl font-heading font-black text-foreground font-tabular">
              {streakGoal}
            </span>
            <p className="text-muted-foreground text-sm mt-1">days</p>
          </motion.div>
        </div>

        {/* Slider */}
        <div className="px-2 mb-6">
          <Slider
            value={[streakGoal]}
            onValueChange={([v]) => setStreakGoal(v)}
            min={3}
            max={30}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>3</span>
            <span>30</span>
          </div>
        </div>

        {/* Motivational message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={getMotivation(streakGoal)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-center p-4 bg-card rounded-xl border border-border"
          >
            <p className="text-foreground font-semibold">{getMotivation(streakGoal)}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="max-w-sm mx-auto w-full space-y-3">
        <Button
          onClick={onNext}
          className="w-full h-14 bg-gold text-gold-foreground font-bold uppercase tracking-wide shadow-glow text-lg hover:opacity-90 active:scale-[0.98] transition-all"
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
