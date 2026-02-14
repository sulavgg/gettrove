import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VoiceRepliesSection } from '@/components/voice/VoiceRepliesSection';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CheckInCardProps {
  id: string;
  userName: string;
  userPhoto?: string | null;
  photoUrl: string;
  selfieUrl?: string | null;
  captureTimestamp?: string | null;
  caption?: string | null;
  createdAt: string;
  currentStreak: number;
  reactionCount: number;
  hasReacted: boolean;
  onReactionChange: () => void;
}

export const CheckInCard = ({
  id,
  userName,
  userPhoto,
  photoUrl,
  selfieUrl,
  captureTimestamp,
  caption,
  createdAt,
  currentStreak,
  reactionCount,
  hasReacted,
  onReactionChange,
}: CheckInCardProps) => {
  const { user } = useAuth();
  const [isReacting, setIsReacting] = useState(false);
  const [localHasReacted, setLocalHasReacted] = useState(hasReacted);
  const [localReactionCount, setLocalReactionCount] = useState(reactionCount);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selfieLoaded, setSelfieLoaded] = useState(false);

  const handleReaction = async () => {
    if (!user || isReacting) return;

    setIsReacting(true);
    try {
      if (localHasReacted) {
        await supabase
          .from('reactions')
          .delete()
          .eq('checkin_id', id)
          .eq('user_id', user.id);
        setLocalHasReacted(false);
        setLocalReactionCount((c) => c - 1);
      } else {
        await supabase.from('reactions').insert({
          checkin_id: id,
          user_id: user.id,
          reaction_type: '💪',
        });
        setLocalHasReacted(true);
        setLocalReactionCount((c) => c + 1);
      }
      onReactionChange();
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasDualPhotos = !!selfieUrl;

  return (
    <Card className="overflow-hidden bg-card border-border shadow-card animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={userPhoto || undefined} alt={userName} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{userName}</p>
          <p className="text-xs text-muted-foreground">
            Posted at {format(new Date(createdAt), 'h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10">
          <span className="text-sm animate-pulse-fire">🔥</span>
          <span className="text-sm font-bold text-warning">{currentStreak}-day streak</span>
        </div>
      </div>

      {/* Photos */}
      {hasDualPhotos ? (
        <div className="relative">
          <div className="grid grid-cols-2 gap-0.5 bg-border">
            <div className="relative aspect-[3/4] bg-secondary">
              {!imageLoaded && <div className="absolute inset-0 bg-secondary animate-pulse" />}
              <img
                src={photoUrl}
                alt="Activity proof"
                className={cn('w-full h-full object-cover transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                <p className="text-white text-[10px] font-semibold">📸 Activity</p>
              </div>
            </div>
            <div className="relative aspect-[3/4] bg-secondary">
              {!selfieLoaded && <div className="absolute inset-0 bg-secondary animate-pulse" />}
              <img
                src={selfieUrl}
                alt="Selfie verification"
                className={cn('w-full h-full object-cover transition-opacity duration-300', selfieLoaded ? 'opacity-100' : 'opacity-0')}
                onLoad={() => setSelfieLoaded(true)}
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                <p className="text-white text-[10px] font-semibold">🤳 Selfie</p>
              </div>
            </div>
          </div>
          {captureTimestamp && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
              <p className="text-white text-[10px] font-mono">
                🕐 {format(new Date(captureTimestamp), 'h:mm:ss a')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-square bg-secondary">
          {!imageLoaded && <div className="absolute inset-0 bg-secondary animate-pulse" />}
          <img
            src={photoUrl}
            alt="Check-in proof"
            className={cn('w-full h-full object-cover transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}

      {/* Caption & Actions */}
      <div className="p-4">
        {caption && <p className="text-foreground mb-3">{caption}</p>}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReaction}
            disabled={isReacting}
            className={cn('gap-2 transition-all duration-200', localHasReacted && 'text-primary')}
          >
            <span className={cn('text-xl', localHasReacted && 'animate-scale-in')}>💪</span>
            <span className="font-semibold">{localReactionCount}</span>
          </Button>

          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Voice Replies */}
      <VoiceRepliesSection checkinId={id} />
    </Card>
  );
};
