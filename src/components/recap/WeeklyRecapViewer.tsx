import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeeklyRecapSlides, RecapData } from '@/components/recap/WeeklyRecapSlides';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WeeklyRecapViewerProps {
  onClose?: () => void;
}

export const WeeklyRecapViewer = ({ onClose }: WeeklyRecapViewerProps) => {
  const { profile } = useAuth();
  const { latestRecap, hasUnviewedRecap, markAsViewed, generateRecapLocally, saveShareableImageUrl } = useWeeklyRecap();
  const [showRecap, setShowRecap] = useState(false);
  const [currentRecap, setCurrentRecap] = useState<RecapData | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleViewRecap = async () => {
    if (latestRecap) {
      setCurrentRecap(latestRecap);
      setShowRecap(true);
      if (hasUnviewedRecap) {
        markAsViewed(latestRecap.id);
      }
    } else {
      // Generate a local preview
      setGenerating(true);
      const generated = await generateRecapLocally();
      setGenerating(false);
      
      if (generated) {
        setCurrentRecap(generated);
        setShowRecap(true);
      } else {
        toast.error('Unable to generate recap');
      }
    }
  };

  const handleCloseRecap = () => {
    setShowRecap(false);
    setCurrentRecap(null);
    onClose?.();
  };

  if (showRecap && currentRecap) {
    return (
      <WeeklyRecapSlides
        data={currentRecap}
        userName={profile?.name || 'Trove User'}
        onClose={handleCloseRecap}
        onSaveShareUrl={saveShareableImageUrl}
      />
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleViewRecap}
      disabled={generating}
      className="w-full gap-2 relative"
    >
      <BarChart3 className="w-4 h-4" />
      {generating ? 'Generating...' : 'View Weekly Recap'}
      {hasUnviewedRecap && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
      )}
    </Button>
  );
};
