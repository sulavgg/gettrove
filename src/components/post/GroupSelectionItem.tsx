import { Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { MIN_GROUP_MEMBERS } from '@/hooks/useGroupUnlock';

interface GroupSelectionItemProps {
  name: string;
  emoji: string;
  habitLabel: string;
  memberCount: number;
  isUnlocked: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

export const GroupSelectionItem = ({
  name,
  emoji,
  habitLabel,
  memberCount,
  isUnlocked,
  isSelected,
  onToggle,
}: GroupSelectionItemProps) => {
  const isLocked = !isUnlocked;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-xl border transition-all',
        isLocked
          ? 'bg-muted/50 border-muted opacity-75'
          : isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border hover:border-primary/50'
      )}
    >
      {isLocked ? (
        <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      ) : (
        <Checkbox
          checked={isSelected}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      )}
      <span className="text-xl">{emoji}</span>
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">
          {isLocked
            ? `🔒 ${memberCount}/${MIN_GROUP_MEMBERS} members — Need ${MIN_GROUP_MEMBERS - memberCount} more`
            : habitLabel}
        </p>
      </div>
    </button>
  );
};
