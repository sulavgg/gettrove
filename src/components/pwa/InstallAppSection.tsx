import { Smartphone, CheckCircle, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallInstructionsModal } from './InstallInstructionsModal';
import { toast } from 'sonner';

export const InstallAppSection = () => {
  const {
    installed,
    canInstall,
    platform,
    triggerInstall,
    showIOSModal,
    setShowIOSModal,
    showAndroidModal,
    setShowAndroidModal,
  } = usePWAInstall();

  const handleInstall = async () => {
    const accepted = await triggerInstall();
    if (accepted) {
      toast.success('App installed! Open from your home screen.');
    }
  };

  if (installed) {
    return (
      <Card className="p-4 bg-card border border-border">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">App Installed</p>
            <p className="text-xs text-muted-foreground">Trove is installed on your device</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!canInstall) return null;

  return (
    <>
      <Card className="p-4 bg-card border border-border">
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-3 w-full text-left"
        >
          <Smartphone className="w-5 h-5 text-gold flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Install App</p>
            <p className="text-xs text-muted-foreground">
              {platform === 'ios'
                ? 'Add to home screen (iOS)'
                : 'Add to home screen for faster access'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </Card>

      <InstallInstructionsModal
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        platform="ios"
      />
      <InstallInstructionsModal
        open={showAndroidModal}
        onOpenChange={setShowAndroidModal}
        platform="android"
      />
    </>
  );
};
