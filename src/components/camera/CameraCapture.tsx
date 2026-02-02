import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Image as ImageIcon, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  onGallerySelect: () => void;
}

export const CameraCapture = ({ onCapture, onClose, onGallerySelect }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

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

        // Check for flash/torch capability
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setHasFlash(!!capabilities?.torch);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access or use gallery upload.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please use gallery upload.');
      } else {
        setError('Unable to access camera. Please use gallery upload.');
      }
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

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

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    // Stop the stream while previewing
    stopStream();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const usePhoto = async () => {
    if (!capturedImage) return;

    // Convert data URL to File
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    onCapture(file);
  };

  // Error state - show gallery fallback
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 safe-area-top safe-area-bottom">
        <div className="text-6xl mb-6">📷</div>
        <h2 className="text-xl font-bold text-foreground mb-3 text-center">
          Camera Unavailable
        </h2>
        <p className="text-muted-foreground text-center mb-8 max-w-sm">
          {error}
        </p>
        <div className="space-y-3 w-full max-w-sm">
          <Button
            onClick={onGallerySelect}
            className="w-full h-14 gradient-primary font-bold gap-2"
          >
            <ImageIcon className="w-5 h-5" />
            Upload from Gallery
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Preview captured photo
  if (capturedImage) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-top safe-area-bottom">
        <div className="flex-1 relative">
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-background to-transparent">
          <div className="flex gap-4 max-w-md mx-auto">
            <Button
              variant="outline"
              onClick={retake}
              className="flex-1 h-14 text-lg font-semibold"
            >
              Retake
            </Button>
            <Button
              onClick={usePhoto}
              className="flex-1 h-14 text-lg font-semibold gradient-primary shadow-glow"
            >
              Use Photo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Camera view
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-12 flex justify-between items-center safe-area-top">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/50 text-white"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex gap-3">
          {hasFlash && (
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
          <button
            onClick={flipCamera}
            className="p-3 rounded-full bg-black/50 text-white"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
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
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 px-6 safe-area-bottom">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Gallery button */}
          <button
            onClick={onGallerySelect}
            className="p-4 rounded-full bg-white/10 text-white"
          >
            <ImageIcon className="w-6 h-6" />
          </button>

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

          {/* Spacer for symmetry */}
          <div className="w-14" />
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
