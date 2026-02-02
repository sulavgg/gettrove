import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface JoinByCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinByCodeDialog = ({ open, onOpenChange }: JoinByCodeDialogProps) => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    
    if (trimmedCode.length < 4) return;
    
    setLoading(true);
    // Navigate to the join page with the code
    navigate(`/join/${trimmedCode}`);
    onOpenChange(false);
    setCode('');
    setLoading(false);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric, max 8 characters
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Join a Group
          </DialogTitle>
          <DialogDescription>
            Enter the invite code shared by your friend to join their group
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              INVITE CODE
            </label>
            <Input
              value={code}
              onChange={handleCodeChange}
              placeholder="e.g., ABC123"
              className="h-12 bg-input border-border text-center text-lg font-mono tracking-widest uppercase"
              autoFocus
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-2">
              The code is usually 6 characters, found in the invite link
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                setCode('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary"
              disabled={code.trim().length < 4 || loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Join Group'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
