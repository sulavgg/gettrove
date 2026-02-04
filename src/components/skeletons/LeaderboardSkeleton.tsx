import { Skeleton } from '@/components/ui/skeleton';

export const LeaderboardEntrySkeleton = () => {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-5 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
};

export const LeaderboardSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      
      {/* Entries skeleton */}
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <LeaderboardEntrySkeleton key={i} />
        ))}
      </div>
    </>
  );
};
