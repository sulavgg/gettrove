import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share, MoreVertical } from 'lucide-react';
import type { Platform } from '@/hooks/usePWAInstall';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
}

export const InstallInstructionsModal = ({ open, onOpenChange, platform }: Props) => {
  if (platform === 'ios') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto" aria-describedby="ios-install-desc">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">Install Trove on iPhone</DialogTitle>
          </DialogHeader>
          <p id="ios-install-desc" className="sr-only">Steps to install Trove on your iPhone</p>
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">1️⃣</span>
              <p className="text-sm text-muted-foreground">
                Tap the <Share className="w-4 h-4 inline -mt-0.5 text-primary" /> <strong className="text-foreground">Share</strong> button at the bottom of Safari
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">2️⃣</span>
              <p className="text-sm text-muted-foreground">
                Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">3️⃣</span>
              <p className="text-sm text-muted-foreground">
                Tap <strong className="text-foreground">"Add"</strong> in the top right
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            After installing, open Trove from your home screen like any other app.
          </p>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gold text-gold-foreground hover:bg-gold/90 mt-2"
          >
            Got It
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto" aria-describedby="android-install-desc">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg">Install Trove on Android</DialogTitle>
        </DialogHeader>
        <p id="android-install-desc" className="sr-only">Steps to install Trove on your Android device</p>
        <div className="space-y-5 py-2">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">1️⃣</span>
            <p className="text-sm text-muted-foreground">
              Tap the <MoreVertical className="w-4 h-4 inline -mt-0.5 text-primary" /> <strong className="text-foreground">menu</strong> in Chrome (top right corner)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">2️⃣</span>
            <p className="text-sm text-muted-foreground">
              Tap <strong className="text-foreground">"Add to Home screen"</strong> or <strong className="text-foreground">"Install app"</strong>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">3️⃣</span>
            <p className="text-sm text-muted-foreground">
              Tap <strong className="text-foreground">"Add"</strong> or <strong className="text-foreground">"Install"</strong>
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          After installing, open Trove from your home screen or app drawer.
        </p>
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full bg-gold text-gold-foreground hover:bg-gold/90 mt-2"
        >
          Got It
        </Button>
      </DialogContent>
    </Dialog>
  );
};
