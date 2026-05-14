import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, X, RotateCcw, Loader2 } from 'lucide-react';

export interface PhotoCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  /** Default camera. 'environment' = back (recommended for clinical photos). */
  defaultFacing?: 'user' | 'environment';
}

type FacingMode = 'user' | 'environment';

export function PhotoCaptureModal({
  isOpen,
  onClose,
  onCapture,
  defaultFacing = 'environment',
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facing, setFacing] = useState<FacingMode>(defaultFacing);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [starting, setStarting] = useState(false);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    setCameraError('');
    setStarting(true);
    setVideoReady(false);
    // Stop any existing stream before requesting a new one
    stopStream();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      setCameraActive(true);
      // The video element is rendered conditionally on `cameraActive`.
      // Assign srcObject inside an effect (below) once the element is mounted.
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setCameraError(
        msg.includes('Permission')
          ? 'Camera access denied. Allow camera in your browser settings or upload a file instead.'
          : 'Camera not available on this device. Try uploading a file instead.',
      );
      setCameraActive(false);
    } finally {
      setStarting(false);
    }
  }, [stopStream]);

  // Wire the stream to the <video> element once both stream and element exist.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraActive || !video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    const onLoaded = () => {
      setVideoReady(true);
      // Some browsers require an explicit play() after metadata load.
      video.play().catch(() => { /* ignored — autoplay should handle it */ });
    };
    video.addEventListener('loadedmetadata', onLoaded);
    if (video.readyState >= 2) onLoaded();
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [cameraActive]);

  // Detect whether the device exposes more than one camera (so we know to show the flip button).
  useEffect(() => {
    if (!isOpen) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const cams = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(cams.length > 1);
      })
      .catch(() => setHasMultipleCameras(false));
  }, [isOpen]);

  // Cleanup on close / unmount
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCameraActive(false);
      setCameraError('');
    }
    return () => {
      stopStream();
    };
  }, [isOpen, stopStream]);

  const flipCamera = () => {
    const next: FacingMode = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    if (cameraActive) startCamera(next);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoReady) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror only the user-facing capture so it matches the on-screen preview.
    if (facing === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopStream();
    setCameraActive(false);
    onCapture(dataUrl);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCameraError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCameraError('Image must be under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onCapture(reader.result as string);
      onClose();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClose = () => {
    stopStream();
    setCameraActive(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2" onClick={handleClose}>
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Take or Upload Photo</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {cameraActive ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
                />
                {!videoReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
                {hasMultipleCameras && videoReady && (
                  <button
                    onClick={flipCamera}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                    title="Switch camera"
                    aria-label="Switch camera"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  onClick={takePhoto}
                  disabled={!videoReady}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Camera className="h-4 w-4" />
                  Capture
                </button>
                <button
                  onClick={() => { stopStream(); setCameraActive(false); }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cameraError && (
                <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{cameraError}</p>
              )}
              <button
                onClick={() => startCamera(facing)}
                disabled={starting}
                className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-wait disabled:opacity-60"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Starting camera…
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6" />
                    Take Photo
                  </>
                )}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
              >
                <Upload className="h-6 w-6" />
                Upload from Device
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
