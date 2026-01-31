import { Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FABProps {
  className?: string;
}

export const FAB = ({ className }: FABProps) => {
  return (
    <Link
      to="/post"
      className={cn(
        'fixed bottom-24 right-4 z-40',
        'flex items-center justify-center',
        'w-16 h-16 rounded-full',
        'gradient-primary shadow-glow',
        'transition-all duration-300',
        'hover:scale-110 active:scale-95',
        className
      )}
    >
      <Camera className="w-7 h-7 text-primary-foreground" />
    </Link>
  );
};
