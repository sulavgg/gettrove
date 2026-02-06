import { Lock, Copy, Share2, Users, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { MIN_GROUP_MEMBERS } from '@/hooks/useGroupUnlock';

interface GroupLockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  inviteCode: string;
  memberCount: number;
}

export const GroupLockedDialog = ({
  open,
  onOpenChange,
  groupName,
  inviteCode,
  memberCount,
}: GroupLockedDialogProps) => {
  const [copied, setCopied] = useState(false);
  const membersNeeded = Math.max(0, MIN_GROUP_MEMBERS - memberCount);
  const inviteLink = `${window.location.origin}/join/${inviteCode}`;
  const progress = (memberCount / MIN_GROUP_MEMBERS) * 100;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Join my HABITZ group',
      text: `Join my HABITZ group: ${groupName}. We need ${membersNeeded} more member${membersNeeded !== 1 ? 's' : ''} to start!`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-warning" />
          </div>
          <DialogTitle className="text-xl font-black">
            Need {membersNeeded} more member{membersNeeded !== 1 ? 's' : ''}!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Groups need at least {MIN_GROUP_MEMBERS} members before anyone can start posting. Invite your friends to unlock!
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Members joined
            </span>
            <span className="font-bold text-foreground">
              {memberCount}/{MIN_GROUP_MEMBERS}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Invite link */}
        <div className="p-3 bg-muted rounded-lg break-all text-sm text-muted-foreground text-center font-mono">
          {inviteLink}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleCopy} variant="outline" className="gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button onClick={handleShare} className="gap-2 gradient-primary">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          💡 Text your friends or share in your group chat
        </p>
      </DialogContent>
    </Dialog>
  );
};
