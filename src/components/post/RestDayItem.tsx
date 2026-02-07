import { Loader2 } from 'lucide-react';
import { useRestDays } from '@/hooks/useRestDays';
import { RestDayButton } from '@/components/RestDayButton';
import { getHabitDisplay, HabitType } from '@/lib/supabase';

interface RestDayItemProps {
  groupId: string;
  groupName: string;
  habitType: HabitType;
  customHabit: string | null;
}

export const RestDayItem = ({ groupId, groupName, habitType, customHabit }: RestDayItemProps) => {
  const { restDaysRemaining, hasRestedToday, loading, takeRestDay } = useRestDays(groupId);
  const habit = getHabitDisplay(habitType, customHabit);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
      <span className="text-lg">{habit.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{groupName}</p>
      </div>
      <RestDayButton
        groupName={groupName}
        restDaysRemaining={restDaysRemaining}
        hasRestedToday={hasRestedToday}
        alreadyPosted={false}
        onTakeRestDay={takeRestDay}
        variant="compact"
      />
    </div>
  );
};
