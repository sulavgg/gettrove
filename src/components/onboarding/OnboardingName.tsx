import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, AtSign, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  name: string;
  setName: (name: string) => void;
  username: string;
  setUsername: (username: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingName = ({ name, setName, username, setUsername, onNext, onSkip }: Props) => {
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      // Check username availability against profiles name field
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('name', username)
        .limit(1);

      if (error) {
        setUsernameStatus('idle');
        return;
      }
      setUsernameStatus(data && data.length > 0 ? 'taken' : 'available');
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const canContinue = name.trim().length >= 2;

  return (
    <div className="flex-1 flex flex-col px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full"
      >
        <h2 className="text-3xl font-heading font-black text-foreground tracking-tight mb-2">
          What should we call you?
        </h2>
        <p className="text-muted-foreground mb-8">
          Set your display name and pick a unique username.
        </p>

        <div className="space-y-5">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Display Name
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12 bg-muted/50 border-transparent hover:border-border focus:border-primary h-14 rounded-xl text-base transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Username <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <div className="relative group">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
              <Input
                type="text"
                placeholder="Pick a username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="pl-12 pr-12 bg-muted/50 border-transparent hover:border-border focus:border-primary h-14 rounded-xl text-base transition-all"
                maxLength={20}
              />
              {usernameStatus !== 'idle' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  {usernameStatus === 'taken' && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
              )}
            </div>
            {usernameStatus === 'available' && (
              <p className="text-xs text-success ml-1">Username is available!</p>
            )}
            {usernameStatus === 'taken' && (
              <p className="text-xs text-destructive ml-1">Username is taken</p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="max-w-sm mx-auto w-full space-y-3">
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full h-14 bg-gold text-gold-foreground font-bold uppercase tracking-wide shadow-glow text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          Continue
        </Button>
        <button onClick={onSkip} className="w-full text-center text-muted-foreground hover:text-foreground transition-colors py-2 text-sm">
          Skip for now
        </button>
      </div>
    </div>
  );
};
