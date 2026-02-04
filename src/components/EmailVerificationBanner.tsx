import { useState } from 'react';
import { AlertTriangle, Mail, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

export const EmailVerificationBanner = ({ email, onDismiss }: EmailVerificationBannerProps) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResendVerification = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success('Verification email sent! Check your inbox.');
      }
    } catch (error) {
      toast.error('Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Verify your email to unlock all features
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Check {email} for the verification link
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sent ? (
            <div className="flex items-center gap-1 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Sent!</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={sending}
              className="text-xs h-7 px-2"
            >
              {sending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Mail className="w-3 h-3 mr-1" />
                  Resend
                </>
              )}
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
