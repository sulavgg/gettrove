import { useState } from 'react';
import { Trophy, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChallengeDefinition } from '@/lib/challenges';

interface ChallengeBannerProps {
  challenge: ChallengeDefinition;
  weekEnd: string;
  nextChallenge: ChallengeDefinition | null;
}

export const ChallengeBanner = ({ challenge, weekEnd, nextChallenge }: ChallengeBannerProps) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate countdown
  const endDate = new Date(weekEnd + 'T23:59:59');
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

  const countdownText = daysLeft > 1 ? `${daysLeft} days left` : `${hoursLeft}h left`;

  return (
    <Card
      className={cn(
        'overflow-hidden border-2 border-primary/30',
        'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
      )}
    >
      {/* Main banner */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-2xl">{challenge.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground text-sm">{challenge.name}</h3>
                <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-xs font-bold">
                  <Zap className="w-3 h-3 mr-0.5" strokeWidth={1.5} />
                  {challenge.multiplier}x
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              <span>{countdownText}</span>
            </div>
             {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          {/* Rules */}
          <div className="flex items-start gap-2">
            <Trophy className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground">{challenge.rules}</p>
          </div>

          {/* Verification type */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {challenge.verificationType === 'timestamp' && '⏰ Auto-verified by timestamp'}
              {challenge.verificationType === 'streak' && '📊 Streak-verified'}
              {challenge.verificationType === 'ai_photo' && '🤖 AI photo verification'}
              {challenge.verificationType === 'ai_video' && '🤖 AI video verification'}
            </Badge>
          </div>

          {/* Next week preview */}
          {nextChallenge && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-sm">👀</span>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Next week:</span>{' '}
                {nextChallenge.emoji} {nextChallenge.name} ({nextChallenge.multiplier}x)
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
