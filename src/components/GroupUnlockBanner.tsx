import { Lock, Users, Copy, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { MIN_GROUP_MEMBERS } from '@/hooks/useGroupUnlock';

interface MemberPreview {
  name: string;
  photo: string | null;
}

interface GroupUnlockBannerProps {
  groupName: string;
  inviteCode: string;
  memberCount: number;
  members?: MemberPreview[];
}

export const GroupUnlockBanner = ({
  groupName,
  inviteCode,
  memberCount,
  members = [],
}: GroupUnlockBannerProps) => {
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
        // cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="p-5 border-warning/30 bg-warning/5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Posting Locked</h3>
          <p className="text-sm text-muted-foreground">
            Invite {membersNeeded} more friend{membersNeeded !== 1 ? 's' : ''} to start competing
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Members
          </span>
          <span className="font-bold text-foreground">
            {memberCount}/{MIN_GROUP_MEMBERS}
            <span className="text-muted-foreground font-normal ml-1">
              (Need {membersNeeded} more)
            </span>
          </span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      {/* Current members */}
      {members.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member, i) => (
              <Avatar key={i} className="w-8 h-8 border-2 border-card">
                <AvatarImage src={member.photo || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {member.name[0]}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {members.map(m => m.name.split(' ')[0]).join(', ')}
          </span>
        </div>
      )}

      {/* Share actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
        <Button onClick={handleShare} size="sm" className="gap-1.5 gradient-primary">
          <Share2 className="w-3.5 h-3.5" />
          Share Invite
        </Button>
      </div>
    </Card>
  );
};
