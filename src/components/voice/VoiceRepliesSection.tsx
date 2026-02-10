import { useState, useCallback } from 'react';
import { Mic, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceReplyPlayer } from './VoiceReplyPlayer';
import { useVoiceReplies } from '@/hooks/useVoiceReplies';
import { triggerHaptic } from '@/hooks/useHaptic';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceRepliesSectionProps {
  checkinId: string;
}

export const VoiceRepliesSection = ({ checkinId }: VoiceRepliesSectionProps) => {
  const { replies, replyCount, loading, uploading, fetchReplies, uploadVoiceReply, deleteVoiceReply } = useVoiceReplies(checkinId);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [speedRate, setSpeedRate] = useState(1);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  const handleOpenRecorder = () => {
    triggerHaptic('light');
    setIsRecorderOpen(true);
  };

  const handleSendVoiceReply = async (blob: Blob, duration: number) => {
    triggerHaptic('medium');
    const success = await uploadVoiceReply(blob, duration);
    if (success) {
      toast.success('Voice reply sent! 🎤');
      setIsRecorderOpen(false);
      setIsExpanded(true);
      setRepliesLoaded(true);
    } else {
      toast.error('Failed to send voice reply');
    }
  };

  const handleExpand = useCallback(() => {
    if (!isExpanded && !repliesLoaded) {
      fetchReplies();
      setRepliesLoaded(true);
    }
    setIsExpanded(!isExpanded);
    triggerHaptic('light');
  }, [isExpanded, repliesLoaded, fetchReplies]);

  const handlePlay = (replyId: string) => {
    setActiveReplyId(replyId);
  };

  const handleEnded = (index: number) => {
    // Auto-play next reply
    if (index < replies.length - 1) {
      setActiveReplyId(replies[index + 1].id);
      // The player will auto-play when it becomes active
    } else {
      setActiveReplyId(null);
    }
  };

  const handleDelete = async (replyId: string) => {
    const success = await deleteVoiceReply(replyId);
    if (success) {
      toast.success('Voice reply deleted');
    } else {
      toast.error('Failed to delete voice reply');
    }
  };

  const cycleSpeed = () => {
    setSpeedRate(prev => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
    triggerHaptic('light');
  };

  return (
    <div className="border-t border-border/50">
      {/* Reply button row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={handleOpenRecorder}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Mic className="w-4 h-4" />
          <span className="text-sm font-medium">Reply</span>
        </button>

        {replyCount > 0 && (
          <button
            onClick={handleExpand}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-sm">
              🎤 {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Recorder */}
      <AnimatePresence>
        {isRecorderOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-4 pb-3"
          >
            <VoiceRecorder
              onSend={handleSendVoiceReply}
              onCancel={() => setIsRecorderOpen(false)}
              uploading={uploading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Speed control */}
                  {replies.length > 0 && (
                    <div className="flex justify-end mb-1">
                      <button
                        onClick={cycleSpeed}
                        className={cn(
                          'text-xs font-mono px-2 py-0.5 rounded-full transition-colors',
                          speedRate !== 1
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {speedRate}x
                      </button>
                    </div>
                  )}

                  {replies.map((reply, index) => (
                    <VoiceReplyPlayer
                      key={reply.id}
                      reply={reply}
                      isActive={activeReplyId === reply.id}
                      onPlay={() => handlePlay(reply.id)}
                      onEnded={() => handleEnded(index)}
                      onDelete={handleDelete}
                      speedRate={speedRate}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
