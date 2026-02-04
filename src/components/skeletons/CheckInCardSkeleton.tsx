import { Skeleton } from '@/components/ui/skeleton';

export const CheckInCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* User header */}
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-12" />
      </div>
      
      {/* Photo */}
      <Skeleton className="w-full aspect-square" />
      
      {/* Caption area */}
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
};

export const CheckInCardSkeletonList = ({ count = 2 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CheckInCardSkeleton key={i} />
      ))}
    </div>
  );
};
