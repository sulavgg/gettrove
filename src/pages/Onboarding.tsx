import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const slides = [
  {
    emoji: '🔥',
    title: 'Welcome to HABITZ',
    subtitle: 'Compete with friends. Build streaks. Don\'t quit.',
    description: 'Post photo proof daily or lose your streak.',
  },
  {
    emoji: '📋',
    title: 'How It Works',
    steps: [
      { icon: '👥', text: 'Join or create a group (5-10 friends)' },
      { icon: '🎯', text: 'Pick a habit (gym, study, wake up early, etc.)' },
      { icon: '📸', text: 'Post photo proof every day before midnight' },
      { icon: '🔥', text: 'Don\'t break your streak or lose everything' },
    ],
  },
  {
    emoji: '🚀',
    title: 'Get Started',
    subtitle: 'Ready to build your first streak?',
    actions: true,
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleComplete = async (action: 'create' | 'join' | 'skip') => {
    await updateProfile({ onboarding_completed: true });
    
    if (action === 'create') {
      navigate('/create-group');
    } else if (action === 'join') {
      navigate('/');
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
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Emoji */}
        <span className="text-7xl mb-6 animate-scale-in">{slide.emoji}</span>

        {/* Title */}
        <h1 className="text-3xl font-black text-foreground text-center mb-3">
          {slide.title}
        </h1>

        {/* Subtitle */}
        {slide.subtitle && (
          <p className="text-lg text-muted-foreground text-center max-w-xs">
            {slide.subtitle}
          </p>
        )}

        {/* Description */}
        {slide.description && (
          <p className="text-muted-foreground text-center mt-2 max-w-xs">
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
                ? 'w-6 bg-primary'
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
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
