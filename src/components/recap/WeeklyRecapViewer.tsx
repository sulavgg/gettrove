import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeeklyRecapSlides, RecapData } from '@/components/recap/WeeklyRecapSlides';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { toast } from 'sonner';

interface WeeklyRecapViewerProps {
  onClose?: () => void;
}

export const WeeklyRecapViewer = ({ onClose }: WeeklyRecapViewerProps) => {
  const navigate = useNavigate();
  const { latestRecap, hasUnviewedRecap, markAsViewed, generateRecapLocally } = useWeeklyRecap();
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

  const handleShare = async () => {
    if (!currentRecap) return;

    const shareText = `My TROVE week: ${currentRecap.daysPosted}/7 days posted, ${currentRecap.currentStreak}-day streak! Think you can beat me? 🔥`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My TROVE Week',
          text: shareText,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success('Copied to clipboard!');
    }
  };

  if (showRecap && currentRecap) {
    return (
      <WeeklyRecapSlides
        data={currentRecap}
        onClose={handleCloseRecap}
        onShare={handleShare}
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
