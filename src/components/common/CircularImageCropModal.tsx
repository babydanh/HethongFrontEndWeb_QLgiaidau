'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CircularImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => void;
}

export const CircularImageCropModal: React.FC<CircularImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
}) => {
  const translate = useTranslations('ImageCropModal');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset zoom & pan when image changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setImgLoaded(false);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + deltaX,
      y: panStartRef.current.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartRef.current.x;
    const deltaY = e.touches[0].clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + deltaX,
      y: panStartRef.current.y + deltaY,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCropAndSave = async () => {
    const img = imgRef.current;
    if (!img) return;

    try {
      const canvas = document.createElement('canvas');
      const OUTPUT_SIZE = 512;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Viewport circular container width / height in px
      const VIEWPORT_SIZE = 260;

      // Image natural bounds
      let naturalWidth = img.naturalWidth;
      let naturalHeight = img.naturalHeight;

      if (!naturalWidth || !naturalHeight) {
        // Fallback: draw directly
        naturalWidth = 512;
        naturalHeight = 512;
      }

      // Compute rendered size with object-cover style ratio
      const scaleFactor = Math.max(VIEWPORT_SIZE / naturalWidth, VIEWPORT_SIZE / naturalHeight) * zoom;
      const renderedWidth = naturalWidth * scaleFactor;
      const renderedHeight = naturalHeight * scaleFactor;

      // Center offsets with pan
      const imgCenterX = VIEWPORT_SIZE / 2 + pan.x;
      const imgCenterY = VIEWPORT_SIZE / 2 + pan.y;

      const imgTopLeftX = imgCenterX - renderedWidth / 2;
      const imgTopLeftY = imgCenterY - renderedHeight / 2;

      // Map viewport (260x260) onto canvas (512x512)
      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;

      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(
        img,
        imgTopLeftX * ratio,
        imgTopLeftY * ratio,
        renderedWidth * ratio,
        renderedHeight * ratio
      );

      // Convert canvas to Blob (with toBlob or toDataURL fallback)
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              onConfirm(blob);
            } else {
              // Fallback to dataURL
              const dataUrl = canvas.toDataURL('image/png');
              fetch(dataUrl)
                .then((r) => r.blob())
                .then((b) => onConfirm(b))
                .catch((e) => console.error('DataURL blob fallback error:', e));
            }
          },
          'image/png',
          0.95
        );
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const r = await fetch(dataUrl);
        const b = await r.blob();
        onConfirm(b);
      }
    } catch (err) {
      console.error('Canvas export error:', err);
      // Fallback in case of CORS tainted canvas on external URL
      try {
        const response = await fetch(imageSrc);
        const fallbackBlob = await response.blob();
        onConfirm(fallbackBlob);
      } catch (fetchErr) {
        console.error('Fallback fetch blob error:', fetchErr);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{translate('modalTitle')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{translate('modalSubtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular Crop Viewport Area */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative w-[260px] h-[260px] rounded-full overflow-hidden border-2 border-dashed border-blue-500 bg-slate-900 select-none cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Image Layer */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              crossOrigin="anonymous"
              onLoad={() => setImgLoaded(true)}
              draggable={false}
              className="max-w-none pointer-events-none select-none transition-transform duration-75"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />

            {/* Subtle Crosshair Guide */}
            <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white/40 shadow-xs" />
            </div>

            {/* Hint overlay */}
            <div className="absolute bottom-2.5 bg-black/60 text-white/90 text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none flex items-center gap-1">
              <Move className="w-3 h-3" />
              <span>{translate('dragHint')}</span>
            </div>
          </div>
        </div>

        {/* Zoom Controls Slider */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              {translate('zoomLabel')}
            </span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title={translate('zoomOut')}
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <button
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title={translate('zoomIn')}
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title={translate('reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {translate('cancel')}
          </button>
          <button
            type="button"
            onClick={handleCropAndSave}
            disabled={!imgLoaded}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {translate('confirmSave')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircularImageCropModal;
