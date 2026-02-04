import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, habitTypeLabels, HabitType } from '@/lib/supabase';
import { toast } from 'sonner';

const CreateGroup = () => {
  const navigate = useNavigate();
  const { user, isEmailVerified, profile, resendVerificationEmail } = useAuth();

  const [step, setStep] = useState<'form' | 'invite'>('form');
  const [name, setName] = useState('');
  const [habitType, setHabitType] = useState<HabitType | ''>('');
  const [customHabit, setCustomHabit] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResendVerification = async () => {
    setResending(true);
    const { error } = await resendVerificationEmail();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Verification email sent!');
    }
    setResending(false);
  };

  // Show verification required message
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">
            Verify Your Email
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to verify your email address before creating groups. Check your inbox at <strong>{profile?.email}</strong> for the verification link.
          </p>
          <Button
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full h-12 gradient-primary font-semibold"
          >
            {resending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Resend Verification Email'
            )}
          </Button>
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !habitType) return;

    setLoading(true);
    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          habit_type: habitType,
          custom_habit: habitType === 'other' ? customHabit.trim() : null,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          user_id: user.id,
          group_id: group.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      // Initialize streak for creator
      await supabase.from('streaks').insert({
        user_id: user.id,
        group_id: group.id,
      });

      setInviteCode(group.invite_code);
      setGroupId(group.id);
      setStep('invite');
      toast.success('Group created! 🎉');
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const habit = habitTypeLabels[habitType as HabitType];
    const shareData = {
      title: 'Join my HABITZ group',
      text: `Join my HABITZ group: ${name}. Let's compete on ${habit?.label || 'our habit'}!`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopy();
    }
  };

  if (step === 'invite') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <span className="text-6xl mb-4 block animate-confetti">🎉</span>
            <h1 className="text-2xl font-black text-foreground mb-2">
              Group Created!
            </h1>
            <p className="text-muted-foreground">
              Invite your crew to start competing
            </p>
          </div>

          <Card className="p-6 bg-card border-border mb-6">
            <h2 className="font-bold text-foreground mb-4">
              {name}
            </h2>
            
            <div className="p-4 bg-input rounded-lg mb-4 break-all text-sm text-muted-foreground">
              {inviteLink}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                onClick={handleShare}
                className="gap-2 gradient-primary"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/group/${groupId}`)}
              className="w-full h-12 gradient-primary font-bold uppercase tracking-wide shadow-glow"
            >
              Go to Group
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 safe-area-top">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-black text-foreground mb-2">
          Create a Group
        </h1>
        <p className="text-muted-foreground mb-8">
          Start a new habit challenge with friends
        </p>

        <form onSubmit={handleCreate} className="space-y-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              GROUP NAME
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder="e.g., Jake's Gym Crew"
              className="h-12 bg-input border-border"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {name.length}/30 characters
            </p>
          </div>

          {/* Habit Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              HABIT
            </label>
            <Select value={habitType} onValueChange={(v) => setHabitType(v as HabitType)}>
              <SelectTrigger className="h-12 bg-input border-border">
                <SelectValue placeholder="Select a habit" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(habitTypeLabels).map(([key, { emoji, label }]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Habit (if "other" selected) */}
          {habitType === 'other' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                CUSTOM HABIT NAME
              </label>
              <Input
                value={customHabit}
                onChange={(e) => setCustomHabit(e.target.value.slice(0, 30))}
                placeholder="e.g., Practice Piano"
                className="h-12 bg-input border-border"
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow"
            disabled={loading || !name.trim() || !habitType}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Create Group'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
