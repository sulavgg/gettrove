import { Camera, Image, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHabitDisplay, HabitType } from '@/lib/supabase';
import { GroupSelectionItem } from './GroupSelectionItem';
import { RestDayItem } from './RestDayItem';

interface GroupOption {
  id: string;
  name: string;
  habit_type: HabitType;
  custom_habit: string | null;
  already_posted: boolean;
  member_count: number;
  invite_code: string;
  is_unlocked: boolean;
}

interface PostGroupSelectionProps {
  availableGroups: GroupOption[];
  selectedGroups: string[];
  toggleGroup: (id: string) => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
}

export const PostGroupSelection = ({
  availableGroups,
  selectedGroups,
  toggleGroup,
  onOpenCamera,
  onOpenGallery,
}: PostGroupSelectionProps) => {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Select groups to post to
      </h2>

      <div className="space-y-3 mb-8">
        {availableGroups.map((group) => {
          const habit = getHabitDisplay(group.habit_type, group.custom_habit);
          const isSelected = selectedGroups.includes(group.id);

          return (
            <GroupSelectionItem
              key={group.id}
              name={group.name}
              emoji={habit.emoji}
              habitLabel={habit.label}
              memberCount={group.member_count}
              isUnlocked={group.is_unlocked}
              isSelected={isSelected}
              onToggle={() => toggleGroup(group.id)}
            />
          );
        })}
      </div>

      {selectedGroups.length > 0 && (
        <div className="space-y-3">
          <Button
            onClick={onOpenCamera}
            className="w-full h-14 gradient-primary font-bold uppercase tracking-wide shadow-glow gap-2"
          >
            <Camera className="w-5 h-5" />
            Take Photo
          </Button>
          <Button
            variant="outline"
            onClick={onOpenGallery}
            className="w-full h-12 gap-2"
          >
            <Image className="w-5 h-5" />
            Upload from Gallery
          </Button>
        </div>
      )}

      {/* Rest day section */}
      {selectedGroups.length === 0 && availableGroups.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Or take a rest day
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Need a break? Use a rest day to preserve your streak without posting. You get 2 rest days per week per group.
          </p>
          <div className="space-y-2">
            {availableGroups.map((group) => (
              <RestDayItem
                key={group.id}
                groupId={group.id}
                groupName={group.name}
                habitType={group.habit_type}
                customHabit={group.custom_habit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
