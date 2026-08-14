"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (initialIndex !== prevInitialIndex || isOpen !== prevIsOpen) {
    setPrevInitialIndex(initialIndex);
    setPrevIsOpen(isOpen);
    setCurrentIndex(initialIndex);
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    },
    [isOpen, images.length, onClose],
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng xem ảnh"
        className="absolute right-5 top-5 z-[10000] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
          }}
          aria-label="Ảnh trước"
          className="absolute left-4 top-1/2 z-[10000] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:left-8"
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
            setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
          }}
          aria-label="Ảnh kế tiếp"
          className="absolute right-4 top-1/2 z-[10000] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 sm:right-8"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {/* Main Image */}
      <div
        className="relative flex max-h-[85vh] max-w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentUrl}
          alt={`Ảnh ${currentIndex + 1}`}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl select-none"
        />
      </div>

      {/* Bottom Counter Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-white/90 backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
