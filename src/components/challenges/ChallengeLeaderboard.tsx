import { Trophy, Medal, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChallengeScore } from '@/hooks/useWeeklyChallenge';
import type { ChallengeDefinition } from '@/lib/challenges';

interface ChallengeLeaderboardProps {
  scores: ChallengeScore[];
  challenge: ChallengeDefinition;
  currentUserId?: string;
}

const RANK_ICONS = [
  { icon: Trophy, color: 'text-warning' },
  { icon: Medal, color: 'text-muted-foreground' },
  { icon: Award, color: 'text-orange-400' },
];

export const ChallengeLeaderboard = ({
  scores,
  challenge,
  currentUserId,
}: ChallengeLeaderboardProps) => {
  if (scores.length === 0) {
    return (
      <Card className="p-6 text-center">
        <span className="text-4xl mb-3 block">{challenge.emoji}</span>
        <h3 className="font-bold text-foreground mb-1">No qualifying posts yet</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to earn {challenge.multiplier}x points!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        Challenge Leaderboard
      </h3>

      {scores.map((score, index) => {
        const RankIcon = index < 3 ? RANK_ICONS[index] : null;
        const isCurrentUser = score.user_id === currentUserId;

        return (
          <Card
            key={score.user_id}
            className={cn(
              'flex items-center gap-3 p-3',
              isCurrentUser && 'border-primary/30 bg-primary/5',
              index === 0 && 'border-warning/30 bg-warning/5'
            )}
          >
            {/* Rank */}
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {RankIcon ? (
                <RankIcon.icon className={cn('w-5 h-5', RankIcon.color)} />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className="w-9 h-9">
              <AvatarImage src={score.user_photo || undefined} />
              <AvatarFallback className={cn(
                'text-sm',
                isCurrentUser ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {score.user_name[0]}
              </AvatarFallback>
            </Avatar>

            {/* Name & stats */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium text-sm truncate',
                isCurrentUser ? 'text-primary' : 'text-foreground'
              )}>
                {score.user_name}
                {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {score.qualified_posts} qualifying post{score.qualified_posts !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <p className="font-black text-lg text-warning">{score.total_points}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">pts</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
