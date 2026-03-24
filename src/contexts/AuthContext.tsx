import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  profile_photo_url: string | null;
  onboarding_completed: boolean;
  first_post_completed: boolean;
  notification_daily_time: string;
  notification_friend_activity: boolean;
  notification_milestones: boolean;
  theme: string;
  email_frequency: string;
  campus: string | null;
  show_on_campus_feed: boolean;
  anonymous_on_campus: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  const fetchProfile = async (userId: string, retries = 3): Promise<Profile | null> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) return data as Profile;

      // PGRST116 = no rows found — profile trigger may not have run yet on first signup
      const notFound = error?.code === 'PGRST116';
      if (notFound && attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      if (error) console.error('Error fetching profile:', error);
      return null;
    }
    return null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Initialize from the existing session first, then listen for changes.
    // This avoids the race condition where both getSession() and onAuthStateChange
    // fire on mount and trigger duplicate profile fetches that overwrite each other.
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip the initial INITIAL_SESSION event — we handle that via getSession() below
        // so we have one clear initialization path.
        if (!initialized) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Single initialization path: read the existing session, then mark initialized
    // so the listener above takes over for all subsequent auth events.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }

      setLoading(false);
      initialized = true;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    await refreshProfile();
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      return { error: new Error('No email address found') };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isEmailVerified,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
