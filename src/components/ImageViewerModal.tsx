import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Move,
  Download,
} from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  description?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  title = 'Pratinjau Foto',
  description,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom, position, and rotation when modal opens with new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  // Keyboard shortcut support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoom]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const nextZoom = Math.max(prev - 0.25, 0.5);
      if (nextZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setZoom((prev) => Math.min(prev + 0.15, 4));
    } else {
      // Zoom out
      setZoom((prev) => {
        const nextZoom = Math.max(prev - 0.15, 0.5);
        if (nextZoom <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return nextZoom;
      });
    }
  };

  // Mouse Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Drag to Pan for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `foto_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/80 border-b border-white/10 text-white z-10">
        <div className="min-w-0 pr-4">
          <h3 className="text-sm sm:text-base font-bold text-white truncate">{title}</h3>
          {description && (
            <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">{description}</p>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            title="Unduh Foto"
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition text-xs flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold text-xs">Unduh</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Tutup (Esc)"
            className="p-2 text-slate-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white rounded-xl transition border border-rose-500/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Zoom & Pan */}
      <div
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-6 ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="transition-transform duration-75 ease-out max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            draggable={false}
            className="max-h-[75vh] max-w-[90vw] sm:max-w-[80vw] object-contain rounded-xl shadow-2xl pointer-events-none ring-1 ring-white/10"
          />
        </div>

        {/* Drag Hint when Zoomed */}
        {zoom > 1 && (
          <div className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur-xs text-white/80 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 pointer-events-none border border-white/10">
            <Move className="w-3.5 h-3.5 text-emerald-400" />
            <span>Klik &amp; geser untuk menggeser foto</span>
          </div>
        )}
      </div>

      {/* Bottom Floating Zoom & Rotate Controls */}
      <div className="p-4 flex items-center justify-center z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/15 px-3 py-2 rounded-2xl shadow-2xl flex items-center space-x-1.5 sm:space-x-2 text-white">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            title="Zoom Out (-)"
            className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-xl transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Current Zoom Percentage Indicator */}
          <button
            type="button"
            onClick={handleReset}
            title="Klik untuk Reset Zoom (100%)"
            className="px-2.5 py-1 text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-emerald-400 rounded-lg min-w-[58px] text-center transition"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            title="Zoom In (+)"
            className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 rounded-xl transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/20 mx-1" />

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            title="Putar 90°"
            className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            title="Reset Posisi &amp; Skala (0)"
            className="p-2 text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
