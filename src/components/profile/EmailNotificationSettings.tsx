import { useState } from 'react';
import { Mail, Bell, BellOff, Zap, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { triggerHaptic } from '@/hooks/useHaptic';

const EMAIL_OPTIONS = [
  {
    value: 'all',
    label: 'All Updates',
    description: 'Daily digest + streak alerts + weekly recap + challenge results',
    icon: Bell,
  },
  {
    value: 'daily',
    label: 'Daily Digest Only',
    description: 'One email per day with your status, rank, and group activity',
    icon: Mail,
  },
  {
    value: 'critical',
    label: 'Critical Moments Only',
    description: 'Streak at risk, major rank changes, milestones',
    icon: Zap,
  },
  {
    value: 'weekly',
    label: 'Weekly Summary Only',
    description: 'One recap email every Sunday evening',
    icon: Calendar,
  },
  {
    value: 'none',
    label: 'No Emails',
    description: 'Opt out of all email notifications',
    icon: BellOff,
  },
] as const;

export const EmailNotificationSettings = () => {
  const { profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const currentFrequency = (profile as any)?.email_frequency || 'daily';

  const handleChange = async (value: string) => {
    triggerHaptic('light');
    setSaving(true);
    try {
      await updateProfile({ email_frequency: value } as any);
      toast.success('Email preferences updated');
      triggerHaptic('success');
    } catch {
      toast.error('Failed to update preferences');
      triggerHaptic('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Email Notifications
      </h3>
      <Card className="p-4 bg-card border-border">
        <RadioGroup
          value={currentFrequency}
          onValueChange={handleChange}
          disabled={saving}
          className="space-y-3"
        >
          {EMAIL_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                htmlFor={`email-freq-${option.value}`}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  currentFrequency === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                } ${saving ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`email-freq-${option.value}`}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </Card>
    </div>
  );
};
