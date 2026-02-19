import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CameraCaptureProps {
  onCapture: (activityPhoto: File, selfiePhoto: File, captureTimestamp: string) => void;
  onClose: () => void;
}

type CameraStep = 'activity' | 'selfie';

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [cameraStep, setCameraStep] = useState<CameraStep>('activity');
  const [activityPhoto, setActivityPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [captureTimestamp, setCaptureTimestamp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const facingMode = cameraStep === 'activity' ? 'environment' : 'user';

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsReady(false);
    stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setHasFlash(!!capabilities?.torch);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Unable to access camera. Please try again.');
      }
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet]
      });
      setFlashEnabled(!flashEnabled);
    } catch (err) {
      console.error('Flash toggle failed:', err);
    }
  };

  const drawTimestamp = (ctx: CanvasRenderingContext2D, width: number, height: number, timestamp: string) => {
    const fontSize = Math.max(16, Math.floor(width / 30));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Background
    const text = timestamp;
    const metrics = ctx.measureText(text);
    const padding = fontSize * 0.5;
    const bgX = width - metrics.width - padding * 3;
    const bgY = height - fontSize - padding * 3;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.roundRect(bgX, bgY, metrics.width + padding * 2, fontSize + padding * 2, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, width - padding * 2, height - padding * 2);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    // Reset transform before drawing timestamp
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const now = new Date();
    const timestamp = format(now, 'MMM d, yyyy • h:mm:ss a');
    drawTimestamp(ctx, canvas.width, canvas.height, timestamp);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    if (cameraStep === 'activity') {
      setActivityPhoto(imageData);
      setCaptureTimestamp(now.toISOString());
      setSessionStartTime(Date.now());
      stopStream();
    } else {
      // Check 30-second window
      if (sessionStartTime && (Date.now() - sessionStartTime) > 30000) {
        setError('Session expired. Both photos must be taken within 30 seconds. Please start over.');
        setActivityPhoto(null);
        setSelfiePhoto(null);
        setCaptureTimestamp(null);
        setSessionStartTime(null);
        setCameraStep('activity');
        return;
      }
      setSelfiePhoto(imageData);
      stopStream();
    }
  };

  const handleActivityConfirm = () => {
    setCameraStep('selfie');
    setFlashEnabled(false);
  };

  const handleActivityRetake = () => {
    setActivityPhoto(null);
    setCaptureTimestamp(null);
    setSessionStartTime(null);
    startCamera();
  };

  const handleSelfieRetake = () => {
    setSelfiePhoto(null);
    startCamera();
  };

  const handleFinalConfirm = async () => {
    if (!activityPhoto || !selfiePhoto || !captureTimestamp) return;

    // Check 30-second window one final time
    if (sessionStartTime && (Date.now() - sessionStartTime) > 30000) {
      setError('Session expired. Both photos must be taken within 30 seconds. Please start over.');
      setActivityPhoto(null);
      setSelfiePhoto(null);
      setCaptureTimestamp(null);
      setSessionStartTime(null);
      setCameraStep('activity');
      return;
    }

    const toFile = async (dataUrl: string, name: string) => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], name, { type: 'image/jpeg' });
    };

    const [activityFile, selfieFile] = await Promise.all([
      toFile(activityPhoto, `activity-${Date.now()}.jpg`),
      toFile(selfiePhoto, `selfie-${Date.now()}.jpg`),
    ]);

    onCapture(activityFile, selfieFile, captureTimestamp);
  };

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 safe-area-top safe-area-bottom">
        <div className="text-6xl mb-6">📷</div>
        <h2 className="text-xl font-bold text-foreground mb-3 text-center">
          Camera Unavailable
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-sm">{error}</p>
        <Button variant="outline" onClick={onClose} className="w-full max-w-sm">
          Cancel
        </Button>
      </div>
    );
  }

  // Preview activity photo (step 1 done)
  if (activityPhoto && cameraStep === 'activity') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-top safe-area-bottom">
        <div className="flex-1 relative">
          <img src={activityPhoto} alt="Activity proof" className="w-full h-full object-cover" />
          <div className="absolute top-4 left-0 right-0 flex justify-center safe-area-top">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className="text-white text-sm font-semibold">Step 1 of 2 — Activity Proof ✓</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-background to-transparent">
          <div className="flex gap-4 max-w-md mx-auto">
            <Button variant="outline" onClick={handleActivityRetake} className="flex-1 h-14 text-lg font-semibold">
              Retake
            </Button>
            <Button onClick={handleActivityConfirm} className="flex-1 h-14 text-lg font-semibold bg-primary text-primary-foreground shadow-glow hover:bg-primary/90">
              Next: Selfie →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Preview selfie photo (step 2 done)
  if (selfiePhoto && cameraStep === 'selfie') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-top safe-area-bottom">
        {/* Show both photos */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <img src={activityPhoto!} alt="Activity" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
              <p className="text-white text-xs font-semibold">📸 Activity</p>
            </div>
          </div>
          <div className="flex-1 relative">
            <img src={selfiePhoto} alt="Selfie" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
              <p className="text-white text-xs font-semibold">🤳 Selfie</p>
            </div>
          </div>
        </div>
        <div className="absolute top-4 left-0 right-0 flex justify-center safe-area-top z-10">
          <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm font-semibold">Both photos ready ✓</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-background to-transparent">
          <div className="flex gap-4 max-w-md mx-auto">
            <Button variant="outline" onClick={handleSelfieRetake} className="flex-1 h-14 text-lg font-semibold">
              Retake Selfie
            </Button>
            <Button onClick={handleFinalConfirm} className="flex-1 h-14 text-lg font-semibold bg-primary text-primary-foreground shadow-glow hover:bg-primary/90">
              Use Photos ✓
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Camera view (active capture)
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-12 flex justify-between items-center safe-area-top">
        <button onClick={onClose} className="p-3 rounded-full bg-black/50 text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="flex-1 flex justify-center">
          <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm font-semibold">
              {cameraStep === 'activity'
                ? '📸 Step 1: Show your habit in action'
                : '🤳 Step 2: Take a selfie to verify'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {hasFlash && cameraStep === 'activity' && (
            <button
              onClick={toggleFlash}
              className={cn(
                "p-3 rounded-full transition-colors",
                flashEnabled ? "bg-primary text-primary-foreground" : "bg-black/50 text-white"
              )}
            >
              {flashEnabled ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Video feed */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            facingMode === 'user' && "scale-x-[-1]"
          )}
        />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Live timestamp overlay */}
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <p className="text-white text-xs font-mono">{format(new Date(), 'MMM d, yyyy • h:mm:ss a')}</p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 px-6 safe-area-bottom">
        <div className="flex items-center justify-center max-w-md mx-auto">
          {/* Capture button */}
          <button
            onClick={capturePhoto}
            disabled={!isReady}
            className={cn(
              "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
              isReady ? "active:scale-95" : "opacity-50"
            )}
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
