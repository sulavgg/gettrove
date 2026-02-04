import { Skeleton } from '@/components/ui/skeleton';

export const MemberItemSkeleton = () => {
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
};

export const MemberListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <MemberItemSkeleton key={i} />
      ))}
    </div>
  );
};
