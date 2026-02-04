import { ReactNode, useCallback, useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/hooks/useHaptic';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  className,
  threshold = 80,
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const container = containerRef.current;
    if (container && container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      const distance = Math.min(diff * 0.4, threshold * 1.5);
      setPullDistance(distance);

      if (distance >= threshold && pullDistance < threshold) {
        triggerHaptic('medium');
      }
    }
  }, [isRefreshing, threshold, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      triggerHaptic('success');
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    startY.current = 0;
    isPulling.current = false;
  }, [isRefreshing, pullDistance, threshold, onRefresh]);

  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorScale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{
          height: pullDistance > 0 || isRefreshing ? Math.max(pullDistance, isRefreshing ? 48 : 0) : 0,
        }}
      >
        <div
          className="transition-transform"
          style={{
            opacity: indicatorOpacity,
            transform: `scale(${indicatorScale})`,
          }}
        >
          <Loader2
            className={cn(
              'w-6 h-6 text-primary',
              isRefreshing && 'animate-spin'
            )}
          />
        </div>
      </div>

      {children}
    </div>
  );
};
