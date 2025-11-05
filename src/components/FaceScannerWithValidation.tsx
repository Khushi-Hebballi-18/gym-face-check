import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Camera, Check, Video } from "lucide-react";
import { toast } from "sonner";
import { validateFaceDetection } from "@/lib/imageValidation";

interface FaceScannerProps {
  onCapture: (imageData: string, canvas: HTMLCanvasElement) => void;
  isScanning?: boolean;
}

const FaceScannerWithValidation = ({ onCapture, isScanning }: FaceScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Explicitly play the video to ensure it displays
        await videoRef.current.play();
      }
      setIsActive(true);
      toast.success("Camera started");
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsActive(false);
      toast.info("Camera stopped");
    }
  };

  const captureImage = async () => {
    if (!videoRef.current) return;

    setIsCapturing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        toast.error("Failed to create canvas context");
        setIsCapturing(false);
        return;
      }

      // Draw video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Create image from canvas for validation
      const imageData = canvas.toDataURL("image/jpeg");
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageData;
      });

      // Validate face detection on the captured image
      const validation = await validateFaceDetection(img);
      if (!validation.isValid) {
        toast.error(validation.error || "Face validation failed");
        setIsCapturing(false);
        return;
      }

      // If validation passed, send the captured data
      onCapture(imageData, canvas);
      stopCamera();
    } catch (error) {
      console.error("Error capturing image:", error);
      toast.error("Failed to capture image");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-[var(--shadow-card)]">
      <CardContent className="p-6">
        <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
          {isActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="scan-line"></div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Camera className="h-24 w-24" />
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-6">
          {!isActive ? (
            <Button
              onClick={startCamera}
              className="flex-1 bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Video className="mr-2 h-5 w-5" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                onClick={captureImage}
                disabled={isCapturing || isScanning}
                className="flex-1 bg-accent hover:bg-accent/90"
                size="lg"
              >
                {isCapturing ? (
                  "Validating..."
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Capture Face
                  </>
                )}
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                size="lg"
                disabled={isCapturing || isScanning}
              >
                Stop Camera
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <style>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }

        .scan-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            hsl(var(--accent)) 50%,
            transparent
          );
          box-shadow: 0 0 10px hsl(var(--accent));
          animation: scan 2s linear infinite;
        }
      `}</style>
    </Card>
  );
};

export default FaceScannerWithValidation;
