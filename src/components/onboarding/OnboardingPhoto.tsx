import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Copy, Check, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { triggerHaptic } from '@/hooks/useHaptic';

interface Props {
  onFinish: () => void;
}

export const OnboardingPhoto = ({ onFinish }: Props) => {
  const { user, profile, updateProfile } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile?.profile_photo_url || null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const referralLink = `${window.location.origin}/join/trove`;

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('checkin-photos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('checkin-photos')
        .getPublicUrl(path);

      await updateProfile({ profile_photo_url: urlData.publicUrl } as any);
      setPhotoUrl(urlData.publicUrl);
      toast.success('Photo uploaded!');
      triggerHaptic('success');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      triggerHaptic('error');
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      triggerHaptic('light');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on TROVE',
          text: 'Build habits with me on TROVE — consistency is currency!',
          url: referralLink,
        });
        triggerHaptic('success');
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
      >
        <h2 className="text-3xl font-heading font-black text-foreground tracking-tight mb-2">
          Almost There
        </h2>
        <p className="text-muted-foreground mb-8">
          Add a profile photo and invite your friends.
        </p>

        {/* Photo Upload */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <Avatar className="w-28 h-28 border-2 border-border">
              <AvatarImage src={photoUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2.5 bg-gold rounded-full text-gold-foreground active:scale-95 transition-transform"
            >
              <Camera className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {uploading ? 'Uploading...' : 'Tap to add a photo'}
          </p>
        </div>

        {/* Invite Friends */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Invite Friends
          </p>
          <p className="text-sm text-foreground">
            Habits stick better with accountability. Share your link!
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2.5 text-sm text-muted-foreground truncate border border-transparent">
              {referralLink}
            </div>
            <button
              onClick={handleCopy}
              className="p-2.5 bg-muted rounded-lg hover:bg-accent transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-foreground" />
              )}
            </button>
          </div>
          <Button
            variant="outline"
            onClick={handleShare}
            className="w-full gap-2"
          >
            <Share2 className="w-4 h-4" strokeWidth={1.5} />
            Share Invite Link
          </Button>
        </div>
      </motion.div>

      <div className="max-w-sm mx-auto w-full">
        <Button
          onClick={onFinish}
          className="w-full h-14 bg-gold text-gold-foreground font-bold uppercase tracking-wide shadow-glow text-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Enter Trove 🚀
        </Button>
      </div>
    </div>
  );
};
