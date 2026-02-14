import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { JoinByCodeDialog } from '@/components/JoinByCodeDialog';

const slides = [
  {
    icon: '📸',
    title: 'Welcome to TROVE',
    subtitle: 'Build Your Treasure Through Consistent Action',
    description: 'Consistency is Currency. Small daily investments compound into something valuable.',
  },
  {
    title: 'How Trove Works',
    steps: [
      { icon: '📸', text: 'Post daily proof — document your habits with photos' },
      { icon: '📊', text: 'Earn points — stack points through consistency and engagement' },
      { icon: '🏆', text: 'Compete weekly — join challenges and win rewards' },
    ],
  },
  {
    title: 'Your Momentum Matters',
    subtitle: 'Build your treasure, one day at a time.',
    details: [
      'Base: 25 pts per post',
      'Bonuses for timing (optional)',
      'Streak multipliers up to 1.5×',
      'Engagement rewards',
    ],
    actions: true,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const handleComplete = async (action: 'create' | 'join' | 'skip') => {
    await updateProfile({ onboarding_completed: true });
    
    if (action === 'create') {
      navigate('/create-group');
    } else if (action === 'join') {
      setShowJoinDialog(true);
    } else {
      navigate('/');
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Icon / Brand */}
        {slide.icon && (
          <span className="text-6xl mb-6 animate-scale-in">{slide.icon}</span>
        )}

        <h1 className="text-3xl font-black text-foreground text-center mb-3 font-heading tracking-tight">
          {slide.title}
        </h1>

        {slide.subtitle && (
          <p className="text-lg text-muted-foreground text-center max-w-xs">
            {slide.subtitle}
          </p>
        )}

        {slide.description && (
          <p className="text-muted-foreground text-center mt-2 max-w-xs italic">
            {slide.description}
          </p>
        )}

        {/* Steps */}
        {slide.steps && (
          <div className="mt-8 space-y-4 w-full max-w-sm">
            {slide.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-2xl">{step.icon}</span>
                <p className="text-foreground font-medium">{step.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Points details */}
        {slide.details && (
          <div className="mt-6 w-full max-w-sm bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Points System</p>
            {slide.details.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions for last slide */}
        {slide.actions && (
          <div className="mt-8 w-full max-w-sm space-y-3">
            <Button
              onClick={() => handleComplete('create')}
              className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow text-lg"
            >
              Create My First Group
            </Button>
            <Button
              onClick={() => handleComplete('join')}
              variant="outline"
              className="w-full h-14 font-bold uppercase tracking-wide"
            >
              Join a Friend's Group
            </Button>
            <button
              onClick={() => handleComplete('skip')}
              className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              I'll do this later
            </button>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 py-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              index === currentSlide
                ? 'w-6 bg-gold'
                : 'bg-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Next button (except last slide) */}
      {!slide.actions && (
        <div className="px-6 pb-8 safe-area-bottom">
          <Button
            onClick={handleNext}
            className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow"
          >
            Continue
          </Button>
        </div>
      )}

      <JoinByCodeDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
    </div>
  );
};

export default Onboarding;
