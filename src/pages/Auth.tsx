import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { validateEmail, validatePassword, validateName } from '@/lib/validation';

type AuthMode = 'login' | 'signup';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false, name: false });

  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const nameValidation = useMemo(() => validateName(name), [name]);

  const isFormValid = useMemo(() => {
    if (mode === 'signup') {
      return emailValidation.valid && passwordValidation.valid && nameValidation.valid;
    }
    return emailValidation.valid && passwordValidation.valid;
  }, [mode, emailValidation.valid, passwordValidation.valid, nameValidation.valid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, name: true });

    if (!emailValidation.valid) { toast.error(emailValidation.error); return; }
    if (!passwordValidation.valid) { toast.error(passwordValidation.error); return; }
    if (mode === 'signup' && !nameValidation.valid) { toast.error(nameValidation.error); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email.trim(), password, name.trim());
        if (error) { toast.error(error.message); }
        else {
          // Send branded verification email via Resend
          try {
            await supabase.functions.invoke('send-verification-email', {
              body: { email: email.trim(), redirectTo: window.location.origin },
            });
          } catch (e) {
            console.warn('Custom verification email failed, falling back to default:', e);
          }
          toast.success('Check your email to confirm your account!');
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            toast.error('Please verify your email before signing in.');
          } else { toast.error(error.message); }
        } else { navigate('/'); }
      }
    } finally { setLoading(false); }
  };

  const handleBlur = (field: 'email' | 'password' | 'name') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error(error.message || `Failed to sign in with ${provider}`);
      }
    } catch (e) {
      toast.error(`Something went wrong. Please try again.`);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />
      
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in flex flex-col items-center">
        <img src="/favicon.png" alt="Trove" className="w-24 h-24 rounded-2xl mb-3" />
        <p className="text-muted-foreground/60 text-sm italic">
          Consistency is Currency
        </p>
      </div>

      <div className="w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="rounded-2xl p-6 bg-card/70 backdrop-blur-xl border border-white/[0.08] shadow-elevated">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-muted/30 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                mode === 'login' ? 'bg-[#F0B429] text-[#1A1A1A] shadow-md' : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                mode === 'signup' ? 'bg-[#F0B429] text-[#1A1A1A] shadow-md' : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    className={`pl-12 bg-muted/50 border-transparent hover:border-border focus:border-primary h-14 rounded-xl text-base transition-all ${
                      touched.name && !nameValidation.valid ? 'border-destructive focus:border-destructive' : ''
                    }`}
                  />
                </div>
                {touched.name && !nameValidation.valid && (
                  <p className="text-xs text-destructive flex items-center gap-1 ml-1">
                    <AlertCircle className="w-3 h-3" />
                    {nameValidation.error}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`pl-12 bg-muted/50 border-transparent hover:border-border focus:border-primary h-14 rounded-xl text-base transition-all ${
                    touched.email && !emailValidation.valid ? 'border-destructive focus:border-destructive' : ''
                  }`}
                />
              </div>
              {touched.email && !emailValidation.valid && (
                <p className="text-xs text-destructive flex items-center gap-1 ml-1">
                  <AlertCircle className="w-3 h-3" />
                  {emailValidation.error}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 transition-colors group-focus-within:text-primary" strokeWidth={1.5} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`pl-12 pr-12 bg-muted/50 border-transparent hover:border-border focus:border-primary h-14 rounded-xl text-base transition-all ${
                    touched.password && !passwordValidation.valid ? 'border-destructive focus:border-destructive' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={1.5} /> : <Eye className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
              {touched.password && !passwordValidation.valid && (
                <p className="text-xs text-destructive flex items-center gap-1 ml-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordValidation.error}
                </p>
              )}
            </div>

            {mode === 'login' && (
              <button
                type="button"
                onClick={async () => {
                  if (!emailValidation.valid) {
                    toast.error('Enter your email address first');
                    return;
                  }
                  setLoading(true);
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    if (error) throw error;
                    toast.success('Password reset email sent! Check your inbox.');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to send reset email');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-xs text-primary hover:underline w-full text-right -mt-1"
              >
                Forgot password?
              </button>
            )}

            <Button
              type="submit"
              className="w-full h-14 bg-[#F0B429] hover:bg-[#E0A520] text-[#1A1A1A] font-semibold text-base rounded-xl shadow-glow hover:shadow-elevated transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'login' ? (
                'Log In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-muted-foreground/50 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading || loading}
              className="w-full h-14 rounded-xl bg-white text-[#1A1A1A] font-medium text-sm flex items-center justify-center gap-3 hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={!!oauthLoading || loading}
              className="w-full h-14 rounded-xl bg-black text-white font-medium text-sm flex items-center justify-center gap-3 border border-white/[0.1] hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </>
              )}
            </button>
          </div>

          {mode === 'signup' && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              You'll receive a verification email to confirm your account
            </p>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
