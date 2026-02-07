import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { subDays, startOfWeek, eachWeekOfInterval, addDays, format } from 'date-fns';
import { Download, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { PostingHistoryStats, ViewRange, DayData } from '@/hooks/usePostingHistory';

interface ShareableCalendarCardProps {
  stats: PostingHistoryStats;
  viewRange: ViewRange;
  calendarDays: DayData[];
  userName: string;
}

function getCellInlineColor(day: DayData): string {
  if (day.postCount === 0) return '#2d2d35';
  if (day.postCount === 1) return '#5b3d99';
  if (day.postCount === 2) return '#7c5cc7';
  return '#8b5cf6';
}

function buildShareableGrid(calendarDays: DayData[], viewRange: ViewRange): (DayData | null)[][] {
  const today = new Date();
  const startDate = subDays(today, viewRange);
  const firstMonday = startOfWeek(startDate, { weekStartsOn: 1 });
  const weekStarts = eachWeekOfInterval(
    { start: firstMonday, end: today },
    { weekStartsOn: 1 }
  );

  const dayMap = new Map(calendarDays.map(d => [d.date, d]));
  const rows: (DayData | null)[][] = Array.from({ length: 7 }, () => []);

  weekStarts.forEach(weekStart => {
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dateStr = format(day, 'yyyy-MM-dd');
      if (day < startDate || day > today) {
        rows[i].push(null);
      } else {
        rows[i].push(dayMap.get(dateStr) || null);
      }
    }
  });

  return rows;
}

export const ShareableCalendarCard = ({
  stats,
  viewRange,
  calendarDays,
  userName,
}: ShareableCalendarCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    const el = cardRef.current;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    el.style.display = 'block';
    el.style.opacity = '1';
    el.style.pointerEvents = 'none';

    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#0f1117',
      });

      const res = await fetch(dataUrl);
      return await res.blob();
    } finally {
      el.style.display = 'none';
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.opacity = '';
      el.style.pointerEvents = '';
    }
  }, []);

  const handleDownload = useCallback(async () => {
    triggerHaptic('medium');
    setExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posting-history-${viewRange}d.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Calendar image downloaded!');
      triggerHaptic('success');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download image');
      triggerHaptic('error');
    } finally {
      setExporting(false);
    }
  }, [generateImage, viewRange]);

  const handleShare = useCallback(async () => {
    triggerHaptic('medium');
    setExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');

      const file = new File([blob], `posting-history-${viewRange}d.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'My Posting History',
          text: `🔥 ${stats.currentStreak} day streak! ${stats.activeDays} days active in the last ${viewRange} days.`,
          files: [file],
        });
        triggerHaptic('success');
      } else {
        await handleDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast.error('Failed to share. Try downloading instead.');
        triggerHaptic('error');
      }
    } finally {
      setExporting(false);
    }
  }, [generateImage, viewRange, stats, handleDownload]);

  const gridRows = buildShareableGrid(calendarDays, viewRange);

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5"
          onClick={handleDownload}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5"
          onClick={handleShare}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
          Share
        </Button>
      </div>

      {/* Hidden shareable card for image capture */}
      <div
        ref={cardRef}
        style={{
          display: 'none',
          width: '480px',
          padding: '28px',
          background: 'linear-gradient(145deg, #0f1117 0%, #1a1b2e 50%, #0f1117 100%)',
          borderRadius: '20px',
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
          color: '#ededed',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {userName}'s Posting History
            </span>
            <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>
              Last {viewRange} days
            </span>
          </div>
          <div style={{ height: '2px', background: 'linear-gradient(90deg, #8b5cf6, #ec4899, transparent)', borderRadius: '2px' }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, background: '#1e1f2e', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6' }}>{stats.activeDays}</div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Days Active</div>
          </div>
          <div style={{ flex: 1, background: '#1e1f2e', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>🔥 {stats.currentStreak}</div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Current Streak</div>
          </div>
          <div style={{ flex: 1, background: '#1e1f2e', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#eab308' }}>🏆 {stats.longestStreak}</div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Longest Streak</div>
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ width: '14px', fontSize: '8px', color: '#666', textAlign: 'right' as const, flexShrink: 0 }}>
                  {rowIdx % 2 === 0 ? label : ''}
                </span>
                {gridRows[rowIdx]?.map((cell, colIdx) => (
                  <div
                    key={colIdx}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      backgroundColor: cell ? getCellInlineColor(cell) : 'transparent',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '9px', color: '#666' }}>Less</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {['#2d2d35', '#5b3d99', '#7c5cc7', '#8b5cf6'].map((color, i) => (
              <div key={i} style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color }} />
            ))}
          </div>
          <span style={{ fontSize: '9px', color: '#666' }}>More</span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '16px', textAlign: 'center' as const }}>
          <span style={{ fontSize: '10px', color: '#555' }}>
            Built with consistency 💪
          </span>
        </div>
      </div>
    </>
  );
};
