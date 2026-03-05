import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Don't show again for 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    if (isIOS()) {
      setShowIOSTip(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSTip(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner && !showIOSTip) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xl flex items-start gap-3">
        <div className="p-2 rounded-xl bg-warning/15 flex-shrink-0">
          {showIOSTip ? (
            <Share className="w-5 h-5 text-warning" />
          ) : (
            <Download className="w-5 h-5 text-warning" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">Install Trove</p>
          {showIOSTip ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap <Share className="w-3 h-3 inline -mt-0.5" /> then <strong>"Add to Home Screen"</strong> to install Trove as an app.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Add Trove to your home screen for the best experience.
            </p>
          )}

          {showBanner && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="mt-2 h-8 text-xs bg-warning text-warning-foreground hover:bg-warning/90"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Install App
            </Button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
