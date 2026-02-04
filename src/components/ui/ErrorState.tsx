import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  type?: 'default' | 'network' | 'server';
  className?: string;
}

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'We couldn\'t load the data. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  type = 'default',
  className,
}: ErrorStateProps) => {
  const Icon = type === 'network' ? WifiOff : AlertCircle;
  
  const getTitle = () => {
    if (title !== 'Something went wrong') return title;
    switch (type) {
      case 'network':
        return 'No Connection';
      case 'server':
        return 'Server Error';
      default:
        return title;
    }
  };

  const getMessage = () => {
    if (message !== 'We couldn\'t load the data. Please try again.') return message;
    switch (type) {
      case 'network':
        return 'Check your internet connection and try again.';
      case 'server':
        return 'Our servers are having issues. Please try again later.';
      default:
        return message;
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-destructive" />
      </div>
      
      <h3 className="text-lg font-bold text-foreground mb-2">{getTitle()}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{getMessage()}</p>
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
