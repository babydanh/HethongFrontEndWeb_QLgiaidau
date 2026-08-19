"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Maximize2,
} from "lucide-react";

interface ImageLightboxModalProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightboxModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
}: ImageLightboxModalProps) {
  const translate = useTranslations('ImageLightbox');
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistRef = useRef<number | null>(null);

  if (initialIndex !== prevInitialIndex || isOpen !== prevIsOpen) {
    setPrevInitialIndex(initialIndex);
    setPrevIsOpen(isOpen);
    setCurrentIndex(initialIndex);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    positionRef.current = { x: 0, y: 0 };
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
        positionRef.current = { x: 0, y: 0 };
      }
      return next;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => {
      if (prev > 1) {
        setPosition({ x: 0, y: 0 });
        positionRef.current = { x: 0, y: 0 };
        return 1;
      }
      return 2.0;
    });
  }, []);

  // Wheel handler: Zoom on Ctrl+Wheel or when scale == 1; Scroll Pan when scale > 1
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Ctrl + Wheel: Zoom in / out
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setScale((prev) => {
        const next = Math.min(Math.max(prev + delta, 0.5), 5);
        if (next <= 1) {
          setPosition({ x: 0, y: 0 });
          positionRef.current = { x: 0, y: 0 };
        }
        return next;
      });
    } else if (scale > 1) {
      // Khi đang phóng to: Cuộn chuột cuộn ảnh lên/xuống hoặc qua/lại (Shift)
      if (e.shiftKey) {
        setPosition((prev) => {
          const next = { ...prev, x: prev.x - e.deltaY };
          positionRef.current = next;
          return next;
        });
      } else {
        setPosition((prev) => {
          const next = { ...prev, y: prev.y - e.deltaY * 1.2 };
          positionRef.current = next;
          return next;
        });
      }
    } else {
      // Khi scale == 1: Cuộn chuột lăn lên sẽ tự động phóng to
      if (e.deltaY < 0) {
        setScale(1.6);
      }
    }
  }, [scale]);

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setPosition({ x: newX, y: newY });
    positionRef.current = { x: newX, y: newY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers (Pan & Pinch to zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastTouchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({ x: newX, y: newY });
      positionRef.current = { x: newX, y: newY };
    } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const factor = dist / lastTouchDistRef.current;
      setScale((prev) => Math.min(Math.max(prev * factor, 0.5), 5));
      lastTouchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistRef.current = null;
  };

  // Next / Prev handlers
  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    resetTransform();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length, resetTransform]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    resetTransform();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length, resetTransform]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0" || e.key === "r") resetTransform();
    },
    [isOpen, onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut, resetTransform],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || images.length === 0) return null;

  const currentUrl = images[currentIndex] || images[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      {/* Top Floating Control Bar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-white backdrop-blur-md border border-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label={translate('zoomOut')}
          title={translate('zoomOutTitle')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition"
        >
          <ZoomOut className="h-5 w-5 text-white" />
        </button>

        <button
          type="button"
          onClick={() => (scale !== 1 ? resetTransform() : setScale(2))}
          title={translate('zoomToggleTitle')}
          className="px-2.5 py-1 rounded-md hover:bg-white/10 text-xs font-mono font-bold tracking-wider text-white min-w-[56px] text-center transition"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          aria-label={translate('zoomIn')}
          title={translate('zoomInTitle')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition"
        >
          <ZoomIn className="h-5 w-5 text-white" />
        </button>

        <div className="h-4 w-px bg-white/20 mx-1" />

        <button
          type="button"
          onClick={handleRotate}
          aria-label={translate('rotate')}
          title={translate('rotateTitle')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition"
        >
          <RotateCw className="h-4.5 w-4.5 text-white" />
        </button>

        <button
          type="button"
          onClick={resetTransform}
          aria-label={translate('reset')}
          title={translate('resetTitle')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition"
        >
          <RefreshCw className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        aria-label={translate('close')}
        title={translate('closeTitle')}
        className="absolute right-5 top-4 z-[10000] flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 text-white backdrop-blur-md border border-white/15 hover:bg-white/20 active:scale-95 transition shadow-lg"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label={translate('previous')}
          title={translate('previousTitle')}
          className="absolute left-4 top-1/2 z-[10000] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/90 text-white backdrop-blur-md border border-white/15 transition hover:bg-white/25 active:scale-95 sm:left-8 shadow-xl"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label={translate('next')}
          title={translate('nextTitle')}
          className="absolute right-4 top-1/2 z-[10000] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/90 text-white backdrop-blur-md border border-white/15 transition hover:bg-white/25 active:scale-95 sm:right-8 shadow-xl"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* Main Image Container */}
      <div
        ref={containerRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? "none" : "transform 0.12s ease-out",
          }}
          className="flex items-center justify-center"
        >
          <img
            src={currentUrl}
            alt={translate('imageAlt', { index: currentIndex + 1 })}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl pointer-events-none select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Floating Hint & Counter */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-1.5 pointer-events-none">
        <div className="rounded-full bg-slate-900/90 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md border border-white/15 shadow-xl">
          {scale > 1 ? translate('panHint') : translate('zoomHint')}
        </div>
        {images.length > 1 && (
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-widest text-white/90 backdrop-blur-md">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}
