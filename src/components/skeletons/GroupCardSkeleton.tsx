import { Skeleton } from '@/components/ui/skeleton';

export const GroupCardSkeleton = () => {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-6 w-12 ml-auto" />
          <Skeleton className="h-3 w-8 ml-auto" />
        </div>
      </div>
    </div>
  );
};

export const GroupCardSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <GroupCardSkeleton key={i} />
      ))}
    </div>
  );
};
