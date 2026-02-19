import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Plus, LinkIcon, Flame, Trophy, Target } from 'lucide-react';
import { triggerHaptic } from '@/hooks/useHaptic';

interface HomeEmptyStateProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export const HomeEmptyState = ({ onCreateGroup, onJoinGroup }: HomeEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center px-4 py-8 animate-fade-in">
      {/* Hero Illustration */}
      <div className="relative mb-8">
        {/* Background glow */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        
        {/* Icon composition */}
        <div className="relative flex items-center justify-center w-32 h-32">
          <div className="absolute animate-float" style={{ animationDelay: '0s' }}>
            <div className="w-16 h-16 rounded-2xl bg-primary shadow-glow flex items-center justify-center">
              <Users className="w-8 h-8 text-primary-foreground" strokeWidth={1.5} />
            </div>
          </div>
          <div className="absolute -top-4 -right-4 animate-float" style={{ animationDelay: '0.5s' }}>
            <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-warning" strokeWidth={1.5} />
            </div>
          </div>
          <div className="absolute -bottom-2 -left-4 animate-float" style={{ animationDelay: '1s' }}>
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-success" strokeWidth={1.5} />
            </div>
          </div>
          <div className="absolute -top-2 -left-6 animate-float" style={{ animationDelay: '1.5s' }}>
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-accent" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Headlines */}
      <h2 className="text-2xl font-black text-center text-foreground mb-2">
        Ready to build your first streak?
      </h2>
      <p className="text-center text-muted-foreground mb-8 max-w-xs">
        Invest in yourself daily. Build consistency with friends.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
        <Button
          onClick={() => {
            triggerHaptic('medium');
            onCreateGroup();
          }}
          className="w-full h-14 bg-primary text-primary-foreground shadow-glow font-bold text-lg gap-2 hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          Create My First Group
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            triggerHaptic('light');
            onJoinGroup();
          }}
          className="w-full h-12 border-primary text-primary hover:bg-primary/10 font-semibold gap-2"
        >
          <LinkIcon className="w-4 h-4" strokeWidth={1.5} />
          Join a Friend's Group
        </Button>
      </div>

      {/* Preview Mockup */}
      <div className="w-full max-w-sm">
        <p className="text-xs text-center text-muted-foreground mb-3 uppercase tracking-wider">
          Here's what your home screen will look like
        </p>
        <Card className="p-4 bg-card/50 border-dashed border-2 border-border">
          {/* Mock Group Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20 mb-2">
            <span className="text-2xl">💪</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-foreground">Morning Gym Crew</p>
              <p className="text-xs text-muted-foreground">🔥 12 day streak</p>
            </div>
            <span className="text-xs text-success font-semibold">✓ Done</span>
          </div>
          
          {/* Mock Stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 p-3 rounded-xl bg-primary/5">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">🔥 2</p>
              <p className="text-[10px] text-muted-foreground">Streaks</p>
            </div>
            <div className="text-center border-x border-border/30">
              <p className="text-lg font-bold text-foreground">✅ 1/2</p>
              <p className="text-[10px] text-muted-foreground">Posted</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">📊 30</p>
              <p className="text-[10px] text-muted-foreground">Longest</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
