import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  groupId: string;
  groupName: string;
  photoUrl: string;
  caption?: string | null;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  className?: string;
}

export const ActivityFeed = ({ activities, isLoading, className }: ActivityFeedProps) => {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card animate-pulse">
            <div className="w-12 h-12 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={cn('p-6 text-center bg-card/50', className)}>
        <p className="text-muted-foreground text-sm">
          No activity yet today. Be the first to post! 🚀
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {activities.slice(0, 5).map((activity) => (
        <Link key={activity.id} to={`/group/${activity.groupId}`}>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card transition-colors">
            {/* Photo Thumbnail */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img
                src={activity.photoUrl}
                alt="Check-in"
                className="w-full h-full object-cover"
              />
            </div>

            {/* User & Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 min-w-0">
                <Avatar className="w-5 h-5 flex-shrink-0">
                  <AvatarImage src={activity.userAvatar || undefined} />
                  <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                    {activity.userName?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm text-foreground truncate min-w-0">
                  {activity.userName}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-shrink-0 max-w-[40%]">
                  in {activity.groupName}
                </span>
              </div>
              {activity.caption && (
                <p className="text-xs text-muted-foreground truncate">
                  "{activity.caption}"
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </Link>
      ))}

      {activities.length > 5 && (
        <Link
          to="/leaderboard"
          className="block text-center py-2 text-sm text-primary hover:underline"
        >
          View all activity →
        </Link>
      )}
    </div>
  );
};
