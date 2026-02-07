import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  uploading?: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const WaveformVisualizer = ({ data }: { data: Uint8Array | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barCount = 32;
    const barWidth = width / barCount - 2;
    const step = Math.floor(data.length / barCount);

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < barCount; i++) {
      const value = data[i * step] || 128;
      const normalized = Math.abs(value - 128) / 128;
      const barHeight = Math.max(4, normalized * height * 0.9);

      const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
      gradient.addColorStop(0, 'hsl(262, 83%, 58%)');
      gradient.addColorStop(1, 'hsl(330, 81%, 60%)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(
        i * (barWidth + 2),
        height / 2 - barHeight / 2,
        barWidth,
        barHeight,
        2
      );
      ctx.fill();
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={256}
      height={48}
      className="w-full h-12"
    />
  );
};

export const VoiceRecorder = ({ onSend, onCancel, uploading }: VoiceRecorderProps) => {
  const {
    isRecording,
    duration,
    audioBlob,
    analyserData,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  } = useVoiceRecorder();

  const handleSend = () => {
    if (audioBlob && duration > 0.5) {
      onSend(audioBlob, duration);
      reset();
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-card border border-border rounded-2xl p-4 shadow-elevated"
      >
        {/* Waveform / Status */}
        <div className="mb-3">
          {isRecording ? (
            <div className="space-y-2">
              <WaveformVisualizer data={analyserData} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2.5 h-2.5 rounded-full bg-destructive"
                  />
                  <span className="text-sm font-medium text-foreground">Recording</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {formatTime(duration)} / 0:30
                </span>
              </div>
            </div>
          ) : audioBlob ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 py-3">
                <Mic className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Voice note ready ({formatTime(duration)})
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-3">
              <span className="text-sm text-muted-foreground">
                Tap the mic to start recording
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {isRecording && (
          <div className="w-full h-1 bg-muted rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-brand"
              style={{ width: `${(duration / 30) * 100}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="rounded-full w-10 h-10 text-muted-foreground hover:text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>

          {!audioBlob ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={() => {
                if (isRecording) stopRecording();
              }}
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                isRecording
                  ? 'gradient-brand shadow-glow scale-110'
                  : 'bg-primary hover:bg-primary/90'
              )}
            >
              <Mic className="w-7 h-7 text-primary-foreground" />
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <Button
                onClick={handleSend}
                disabled={uploading}
                className="rounded-full w-16 h-16 gradient-brand shadow-glow"
                size="icon"
              >
                <Send className="w-6 h-6 text-primary-foreground" />
              </Button>
            </motion.div>
          )}

          {/* Spacer to balance layout */}
          <div className="w-10 h-10" />
        </div>

        {!isRecording && !audioBlob && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Hold to record, release to preview
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
