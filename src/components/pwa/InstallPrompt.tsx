import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallInstructionsModal } from './InstallInstructionsModal';
import { toast } from 'sonner';

export const InstallPrompt = () => {
  const {
    canShowBanner,
    platform,
    triggerInstall,
    dismiss,
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

  if (!canShowBanner) return null;

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gold/15 flex-shrink-0">
              <Smartphone className="w-5 h-5 text-gold" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">Install Trove</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for faster access and an app-like experience.
              </p>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="h-8 text-xs bg-gold text-gold-foreground hover:bg-gold/90"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Install Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismiss}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Maybe Later
                </Button>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Dismiss install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
