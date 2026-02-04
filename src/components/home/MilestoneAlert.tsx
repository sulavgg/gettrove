import { Trophy, Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneAlertProps {
  type: 'milestone' | 'countdown' | 'streak-warning';
  message: string;
  subMessage?: string;
  className?: string;
}

export const MilestoneAlert = ({ type, message, subMessage, className }: MilestoneAlertProps) => {
  const getIcon = () => {
    switch (type) {
      case 'milestone':
        return <Trophy className="w-5 h-5 text-warning" />;
      case 'countdown':
        return <Clock className="w-5 h-5 text-destructive" />;
      case 'streak-warning':
        return <Flame className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getBackground = () => {
    switch (type) {
      case 'milestone':
        return 'bg-gradient-to-r from-warning/20 to-warning/5 border-warning/30';
      case 'countdown':
        return 'bg-gradient-to-r from-destructive/20 to-destructive/5 border-destructive/30';
      case 'streak-warning':
        return 'bg-gradient-to-r from-destructive/20 to-destructive/5 border-destructive/30';
      default:
        return 'bg-card border-border';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border animate-fade-in',
        getBackground(),
        className
      )}
    >
      <div className="p-2 rounded-full bg-background/50">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-foreground">{message}</p>
        {subMessage && (
          <p className="text-xs text-muted-foreground">{subMessage}</p>
        )}
      </div>
    </div>
  );
};
