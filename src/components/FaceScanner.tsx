import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface FaceScannerProps {
  onCapture: (imageData: string, canvas: HTMLCanvasElement) => void;
  isScanning?: boolean;
}

const FaceScanner = ({ onCapture, isScanning = false }: FaceScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg");
    onCapture(imageData, canvas);
    setIsCapturing(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden shadow-[var(--shadow-card)]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: isCameraActive ? "block" : "none" }}
        />
        
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-24 h-24 text-muted-foreground/30" />
          </div>
        )}

        {isScanning && isCameraActive && (
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute inset-0 animate-pulse"
              style={{
                background: "var(--gradient-scan)",
                animation: "scan 2s ease-in-out infinite"
              }}
            />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-6 flex gap-4 justify-center">
        {!isCameraActive ? (
          <Button
            onClick={startCamera}
            size="lg"
            className="bg-primary hover:bg-primary/90 shadow-[var(--shadow-glow)]"
          >
            <Camera className="mr-2 h-5 w-5" />
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              onClick={captureImage}
              disabled={isCapturing}
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-[var(--shadow-glow)]"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Capture Face
                </>
              )}
            </Button>
            <Button onClick={stopCamera} variant="secondary" size="lg">
              Stop Camera
            </Button>
          </>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% {
            transform: translateY(-100%);
          }
          50% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default FaceScanner;