import { useState, useCallback } from 'react';
import { Mic, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const { replies, replyCount, loading, uploading, fetchReplies, uploadVoiceReply, deleteVoiceReply, toggleReaction } = useVoiceReplies(checkinId);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [speedRate, setSpeedRate] = useState(1);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const replyingToUser = replyingToId ? replies.find(r => r.id === replyingToId)?.user_name : null;

  const handleOpenRecorder = (parentReplyId?: string) => {
    triggerHaptic('light');
    setReplyingToId(parentReplyId || null);
    setIsRecorderOpen(true);
  };

  const handleSendVoiceReply = async (blob: Blob, duration: number) => {
    triggerHaptic('medium');
    const success = await uploadVoiceReply(blob, duration, replyingToId || undefined);
    if (success) {
      toast.success(replyingToId ? 'Reply sent! 🎤' : 'Voice reply sent! 🎤');
      setIsRecorderOpen(false);
      setReplyingToId(null);
      setIsExpanded(true);
      setRepliesLoaded(true);
    } else {
      toast.error('Failed to send voice reply');
    }
  };

  const handleCancelRecorder = () => {
    setIsRecorderOpen(false);
    setReplyingToId(null);
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
    const topLevel = replies.filter(r => !r.parent_reply_id);
    if (index < topLevel.length - 1) {
      setActiveReplyId(topLevel[index + 1].id);
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

  const handleReplyTo = (replyId: string) => {
    handleOpenRecorder(replyId);
  };

  const cycleSpeed = () => {
    setSpeedRate(prev => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
    triggerHaptic('light');
  };

  // Organize replies: top-level + their children
  const topLevelReplies = replies.filter(r => !r.parent_reply_id);
  const childReplies = (parentId: string) => replies.filter(r => r.parent_reply_id === parentId);

  return (
    <div className="border-t border-border/50">
      {/* Reply button row */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => handleOpenRecorder()}
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
            {replyingToUser && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                <span>Replying to <span className="font-medium text-foreground">{replyingToUser}</span></span>
                <button
                  onClick={() => setReplyingToId(null)}
                  className="hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <VoiceRecorder
              onSend={handleSendVoiceReply}
              onCancel={handleCancelRecorder}
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
                  {topLevelReplies.length > 0 && (
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

                  {topLevelReplies.map((reply, index) => (
                    <div key={reply.id}>
                      <VoiceReplyPlayer
                        reply={reply}
                        isActive={activeReplyId === reply.id}
                        onPlay={() => handlePlay(reply.id)}
                        onEnded={() => handleEnded(index)}
                        onDelete={handleDelete}
                        onReact={toggleReaction}
                        onReplyTo={handleReplyTo}
                        speedRate={speedRate}
                      />
                      {/* Threaded child replies */}
                      {childReplies(reply.id).map((child) => (
                        <VoiceReplyPlayer
                          key={child.id}
                          reply={child}
                          isActive={activeReplyId === child.id}
                          onPlay={() => handlePlay(child.id)}
                          onEnded={() => setActiveReplyId(null)}
                          onDelete={handleDelete}
                          onReact={toggleReaction}
                          speedRate={speedRate}
                          isThreaded
                        />
                      ))}
                    </div>
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
