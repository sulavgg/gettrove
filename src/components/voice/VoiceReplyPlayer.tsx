import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { VoiceReply } from '@/hooks/useVoiceReplies';

interface VoiceReplyPlayerProps {
  reply: VoiceReply;
  isActive: boolean;
  onPlay: () => void;
  onEnded: () => void;
  speedRate?: number;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VoiceReplyPlayer = ({
  reply,
  isActive,
  onPlay,
  onEnded,
  speedRate = 1,
}: VoiceReplyPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const initials = reply.user_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      const pct = audioRef.current.duration
        ? (audioRef.current.currentTime / audioRef.current.duration) * 100
        : 0;
      setProgress(pct);
      setCurrentTime(audioRef.current.currentTime);
    }
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, updateProgress]);

  useEffect(() => {
    if (!isActive && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isActive, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speedRate;
    }
  }, [speedRate]);

  const togglePlay = () => {
    if (!audioRef.current) {
      const audio = new Audio(reply.audio_url);
      audio.playbackRate = speedRate;
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(100);
        onEnded();
      };
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (progress >= 100) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
      onPlay();
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
    setCurrentTime(audioRef.current.currentTime);
  };

  // Clean up audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Generate fake waveform bars based on duration
  const barCount = 28;
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Generate deterministic pseudo-random heights using reply ID
    const seed = reply.id.charCodeAt(i % reply.id.length) + i;
    return 0.2 + (Math.sin(seed * 3.14) * 0.5 + 0.5) * 0.8;
  });

  return (
    <div className="flex items-start gap-2.5 py-2">
      <Avatar className="w-8 h-8 mt-0.5 shrink-0">
        <AvatarImage src={reply.user_photo || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {reply.user_name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2 border border-border/50">
          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
              isPlaying ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
            )}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Waveform seek bar */}
          <div
            className="flex-1 flex items-center gap-px h-8 cursor-pointer"
            onClick={handleSeek}
          >
            {bars.map((height, i) => {
              const barPct = ((i + 1) / barCount) * 100;
              const isPast = barPct <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-150',
                    isPast ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>

          {/* Duration */}
          <span className="text-xs font-mono text-muted-foreground shrink-0 w-8 text-right">
            {isPlaying ? formatDuration(currentTime) : formatDuration(reply.duration_seconds)}
          </span>
        </div>
      </div>
    </div>
  );
};
