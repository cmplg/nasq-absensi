import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, RotateCcw } from 'lucide-react';

interface TaskLocationCamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (photoDataUrl: string) => void;
}

export function TaskLocationCamModal({
  isOpen,
  onClose,
  onCapturePhoto,
}: TaskLocationCamModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async (mode: 'environment' | 'user') => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 800, max: 1280 },
          height: { ideal: 600, max: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.warn(`Camera mode ${mode} error, trying fallback mode:`, err);
      // Fallback try opposite mode if environment or user is unavailable
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
      } catch (fallbackErr) {
        setCameraError(
          'Gagal membuka kamera web. Pastikan izin kamera telah disetujui di pengaturan browser Anda.'
        );
      }
    } finally {
      setIsCameraLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    if (videoRef.current && stream && !capturedImage) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Video play error:', err);
      });
    }
  }, [stream, capturedImage]);

  const handleToggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
  };

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const w = video.videoWidth || 800;
    const h = video.videoHeight || 600;

    // Scale down to max 800x600 for web-optimized lightweight resolution
    const maxWidth = 800;
    const maxHeight = 600;
    let targetW = w;
    let targetH = h;

    if (targetW > maxWidth || targetH > maxHeight) {
      if (targetW / targetH > maxWidth / maxHeight) {
        targetH = Math.round((targetH * maxWidth) / targetW);
        targetW = maxWidth;
      } else {
        targetW = Math.round((targetW * maxHeight) / targetH);
        targetH = maxHeight;
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedImage(compressedDataUrl);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapturePhoto(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 px-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Ambil Foto Lokasi Penugasan</h3>
              <p className="text-[11px] text-slate-400">Resolusi Web Terkompresi (~80KB)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-sm font-bold transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-300 flex items-center justify-center shadow-inner">
            {isCameraLoading ? (
              <div className="text-center text-slate-400 text-xs space-y-2 p-4">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Membuka kamera web...</p>
              </div>
            ) : cameraError ? (
              <div className="p-4 text-center text-rose-300 text-xs space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition"
                >
                  🔄 Coba Muat Ulang Kamera
                </button>
              </div>
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Foto Hasil Tangkapan Kamera"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                />

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  title="Ganti Kamera Depan/Belakang"
                  className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2.5 rounded-xl border border-slate-700 backdrop-blur-sm transition text-xs font-bold flex items-center space-x-1.5 shadow-md"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold">
                    {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
                  </span>
                </button>
              </>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Action buttons */}
          {capturedImage ? (
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="w-1/2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition flex items-center justify-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
                <span>Ulangi Foto</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-1/2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Foto Ini</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isCameraLoading || !!cameraError}
                onClick={handleSnap}
                className={`w-2/3 py-3 px-4 font-black rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-2 ${
                  isCameraLoading || !!cameraError
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto Lokasi (800x600)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
