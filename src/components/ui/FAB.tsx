import { Camera, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptic';

interface FABProps {
  className?: string;
  showLabel?: boolean;
  pulse?: boolean;
}

export const FAB = ({ className, showLabel = true, pulse = true }: FABProps) => {
  return (
    <Link
      to="/post"
      onClick={() => triggerHaptic('medium')}
      className={cn(
        'fixed bottom-24 right-4 z-40',
        'flex items-center gap-2',
        'px-5 py-4 rounded-full',
        'gradient-primary shadow-glow',
        'transition-all duration-300',
        'hover:scale-105 active:scale-95',
        pulse && 'animate-glow-pulse',
        className
      )}
    >
      <div className="relative">
        <Camera className="w-6 h-6 text-primary-foreground" />
        <Plus className="w-3 h-3 text-primary-foreground absolute -top-1 -right-1" />
      </div>
      {showLabel && (
        <span className="font-bold text-primary-foreground uppercase tracking-wide text-sm">
          Post Now
        </span>
      )}
    </Link>
  );
};
