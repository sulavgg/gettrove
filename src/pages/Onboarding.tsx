import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome';
import { OnboardingName } from '@/components/onboarding/OnboardingName';
import { OnboardingHabits } from '@/components/onboarding/OnboardingHabits';
import { OnboardingStreakGoal } from '@/components/onboarding/OnboardingStreakGoal';
import { OnboardingPoints } from '@/components/onboarding/OnboardingPoints';
import { OnboardingPhoto } from '@/components/onboarding/OnboardingPhoto';

const TOTAL_STEPS = 6;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { updateProfile, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step data
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [streakGoal, setStreakGoal] = useState(7);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => goNext();

  const handleFinish = async () => {
    const updates: Record<string, any> = { onboarding_completed: true };
    if (name.trim()) updates.name = name.trim();
    await updateProfile(updates);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Top bar: back + progress */}
      {step > 0 && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg safe-area-top">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={goBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Progress bar */}
            <div className="flex-1 flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-500',
                    i <= step ? 'bg-gold' : 'bg-muted'
                  )}
                />
              ))}
            </div>

            <span className="text-xs text-muted-foreground font-tabular ml-2">
              {step + 1}/{TOTAL_STEPS}
            </span>
          </div>
        </div>
      )}

      {/* Animated step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
          className="flex-1 flex flex-col"
        >
          {step === 0 && <OnboardingWelcome onNext={goNext} />}
          {step === 1 && (
            <OnboardingName
              name={name}
              setName={setName}
              username={username}
              setUsername={setUsername}
              onNext={goNext}
              onSkip={handleSkip}
            />
          )}
          {step === 2 && (
            <OnboardingHabits
              selectedHabits={selectedHabits}
              setSelectedHabits={setSelectedHabits}
              onNext={goNext}
              onSkip={handleSkip}
            />
          )}
          {step === 3 && (
            <OnboardingStreakGoal
              streakGoal={streakGoal}
              setStreakGoal={setStreakGoal}
              onNext={goNext}
              onSkip={handleSkip}
            />
          )}
          {step === 4 && (
            <OnboardingPoints
              onNext={goNext}
              onSkip={handleSkip}
            />
          )}
          {step === 5 && <OnboardingPhoto onFinish={handleFinish} />}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots (welcome screen only) */}
      {step === 0 && (
        <div className="flex items-center justify-center gap-2 py-6 safe-area-bottom">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-gold' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Onboarding;
