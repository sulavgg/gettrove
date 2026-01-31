import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Loader2, LogOut, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { BottomNav } from '@/components/ui/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface UserStats {
  activeStreaks: number;
  totalCheckins: number;
  longestStreak: number;
  groupsJoined: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    activeStreaks: 0,
    totalCheckins: 0,
    longestStreak: 0,
    groupsJoined: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get groups count
      const { count: groupsCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get streaks data
      const { data: streaks } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak, total_checkins')
        .eq('user_id', user.id);

      const activeStreaks = streaks?.filter((s) => s.current_streak > 0).length || 0;
      const totalCheckins = streaks?.reduce((sum, s) => sum + s.total_checkins, 0) || 0;
      const longestStreak = Math.max(...(streaks?.map((s) => s.longest_streak) || [0]));

      setStats({
        activeStreaks,
        totalCheckins,
        longestStreak,
        groupsJoined: groupsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = profile?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-black text-foreground">Profile</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6">
        {/* Profile Card */}
        <Card className="p-6 bg-card border-border mb-6">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile?.profile_photo_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">
              {profile?.name || 'Loading...'}
            </h2>
            <p className="text-muted-foreground text-sm">{profile?.email}</p>
            {profile?.created_at && (
              <p className="text-muted-foreground text-xs mt-1">
                Member since {format(new Date(profile.created_at), 'MMM yyyy')}
              </p>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="p-4 bg-card border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Active Streaks
              </p>
              <p className="text-2xl font-bold text-warning flex items-center gap-1">
                🔥 {stats.activeStreaks}
              </p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Check-ins
              </p>
              <p className="text-2xl font-bold text-primary">
                ✅ {stats.totalCheckins}
              </p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Longest Streak
              </p>
              <p className="text-2xl font-bold text-success">
                🏆 {stats.longestStreak} days
              </p>
            </Card>
            <Card className="p-4 bg-card border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Groups Joined
              </p>
              <p className="text-2xl font-bold text-foreground">
                👥 {stats.groupsJoined}
              </p>
            </Card>
          </div>
        )}

        {/* Badges Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Badges
          </h3>
          <Card className="p-4 bg-card border-border">
            <div className="grid grid-cols-4 gap-4">
              {[
                { emoji: '🔥', name: 'Week Warrior', days: 7, earned: stats.longestStreak >= 7 },
                { emoji: '💪', name: 'Month Master', days: 30, earned: stats.longestStreak >= 30 },
                { emoji: '🏆', name: 'Century Club', days: 100, earned: stats.longestStreak >= 100 },
                { emoji: '👑', name: 'Year Legend', days: 365, earned: stats.longestStreak >= 365 },
              ].map((badge) => (
                <div
                  key={badge.name}
                  className={`flex flex-col items-center ${badge.earned ? '' : 'opacity-30'}`}
                >
                  <span className="text-3xl mb-1">{badge.emoji}</span>
                  <p className="text-xs text-center text-muted-foreground">
                    {badge.days}d
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Earn badges by building streaks
            </p>
          </Card>
        </div>

        {/* Sign Out */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
