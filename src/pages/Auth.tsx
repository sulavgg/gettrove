import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
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
  const [touched, setTouched] = useState({ email: false, password: false, name: false });

  // Validation states
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
    
    // Mark all fields as touched
    setTouched({ email: true, password: true, name: true });

    // Validate before submission
    if (!emailValidation.valid) {
      toast.error(emailValidation.error);
      return;
    }
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.error);
      return;
    }
    if (mode === 'signup' && !nameValidation.valid) {
      toast.error(nameValidation.error);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email.trim(), password, name.trim());
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Check your email to confirm your account!');
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          // Check for email not confirmed error
          if (error.message.includes('Email not confirmed')) {
            toast.error('Please verify your email before signing in. Check your inbox for the verification link.');
          } else {
            toast.error(error.message);
          }
        } else {
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = (field: 'email' | 'password' | 'name') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-500/15 rounded-full blur-[100px] -z-10" />
      
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center shadow-glow">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-heading font-bold text-gradient-brand mb-3 tracking-tight">
          HABITZ
        </h1>
        <p className="text-muted-foreground text-lg">
          Compete with friends. Build streaks. Don't quit.
        </p>
      </div>

      <div className="w-full max-w-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {/* Glass card */}
        <div className="glass-card rounded-2xl p-6 shadow-elevated">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-xl">
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                mode === 'login'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                mode === 'signup'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
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
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
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
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
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
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.password && !passwordValidation.valid && (
                <p className="text-xs text-destructive flex items-center gap-1 ml-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordValidation.error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 gradient-brand font-semibold text-base rounded-xl shadow-glow hover:shadow-elevated transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
