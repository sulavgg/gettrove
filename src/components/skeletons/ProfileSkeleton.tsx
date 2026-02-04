import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const ProfileCardSkeleton = () => {
  return (
    <Card className="p-6 bg-card border-border mb-6">
      <div className="flex flex-col items-center">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    </Card>
  );
};

export const StatsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 bg-card border-border">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <>
      <ProfileCardSkeleton />
      <StatsSkeleton />
    </>
  );
};
