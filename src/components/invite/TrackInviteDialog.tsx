import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TrackInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrack: (name: string) => Promise<void>;
  method: string;
}

const methodLabels: Record<string, string> = {
  text: 'Text Message',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram DM',
  share: 'Shared Link',
  link: 'Copied Link',
};

export const TrackInviteDialog = ({
  open,
  onOpenChange,
  onTrack,
  method,
}: TrackInviteDialogProps) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    await onTrack(name.trim());
    setName('');
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-lg font-black">
            Who did you invite?
          </DialogTitle>
          <DialogDescription>
            Track who you shared via {methodLabels[method] || method} so you can follow up later
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="e.g., Mike, Sarah..."
            className="h-12 bg-input border-border"
            autoFocus
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 gradient-primary"
            >
              Track Invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
