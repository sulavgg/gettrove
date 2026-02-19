import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {emoji && (
        <span className="text-6xl mb-4">{emoji}</span>
      )}
      {icon && (
        <div className="mb-4 text-muted-foreground">{icon}</div>
      )}
      
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}

      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {actionLabel && (
            actionHref ? (
              <Button asChild className="bg-primary text-primary-foreground shadow-glow font-bold uppercase tracking-wide hover:bg-primary/90">
                <a href={actionHref}>{actionLabel}</a>
              </Button>
            ) : (
              <Button 
                onClick={onAction} 
                className="bg-primary text-primary-foreground shadow-glow font-bold uppercase tracking-wide hover:bg-primary/90"
              >
                {actionLabel}
              </Button>
            )
          )}
          
          {secondaryLabel && (
            <Button 
              variant="ghost" 
              onClick={onSecondaryAction}
              className="text-muted-foreground hover:text-foreground"
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
