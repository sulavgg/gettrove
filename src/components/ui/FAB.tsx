import { Camera, Plus, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptic';

interface FABProps {
  className?: string;
  showLabel?: boolean;
  pulse?: boolean;
  locked?: boolean;
}

export const FAB = ({ className, showLabel = true, pulse = true, locked = false }: FABProps) => {
  if (locked) {
    return (
      <div
        className={cn(
          'fixed bottom-24 right-4 z-40',
          'flex items-center gap-2',
          'px-5 py-4 rounded-full',
          'bg-muted border border-border',
          'opacity-60 cursor-not-allowed',
          className
        )}
      >
        <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        {showLabel && (
          <span className="font-bold text-muted-foreground uppercase tracking-wide text-sm">
            Locked
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      to="/post"
      onClick={() => triggerHaptic('medium')}
      className={cn(
        'fixed bottom-24 right-4 z-40',
        'flex items-center gap-2',
        'px-5 py-4 rounded-full',
        'bg-primary shadow-glow',
        'transition-all duration-300',
        'hover:scale-105 active:scale-95',
        pulse && 'animate-glow-pulse',
        className
      )}
    >
      <div className="relative">
        <Camera className="w-6 h-6 text-primary-foreground" strokeWidth={1.5} />
        <Plus className="w-3 h-3 text-primary-foreground absolute -top-1 -right-1" strokeWidth={2} />
      </div>
      {showLabel && (
        <span className="font-bold text-primary-foreground uppercase tracking-wide text-sm">
          Post Now
        </span>
      )}
    </Link>
  );
};
