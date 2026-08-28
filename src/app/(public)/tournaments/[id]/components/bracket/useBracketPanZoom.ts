'use client';

import { useRef, useState, useCallback, type PointerEvent, type WheelEvent, type TouchEvent } from 'react';

interface UseBracketPanZoomOptions {
  enabled?: boolean;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  onZoomChange?: (newZoom: number) => void;
}

export function useBracketPanZoom(
  enabledOrOptions: boolean | UseBracketPanZoomOptions = true,
  legacyOnWheelZoom?: (delta: number) => void,
) {
  const options: UseBracketPanZoomOptions =
    typeof enabledOrOptions === 'boolean'
      ? { enabled: enabledOrOptions, minZoom: 0.2, maxZoom: 2.5 }
      : { minZoom: 0.2, maxZoom: 2.5, ...enabledOrOptions };

  const isEnabled = options.enabled ?? true;
  const minZoom = options.minZoom ?? 0.2;
  const maxZoom = options.maxZoom ?? 2.5;

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Drag tracking refs
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  // Multi-touch pinch tracking refs
  const touchPinchRef = useRef<{
    initialDistance: number;
    initialPan: { x: number; y: number };
    lastCenter: { x: number; y: number };
    isPinching: boolean;
    lastTapTime: number;
  }>({
    initialDistance: 0,
    initialPan: { x: 0, y: 0 },
    lastCenter: { x: 0, y: 0 },
    isPinching: false,
    lastTapTime: 0,
  });

  const isInteractiveTarget = (target: HTMLElement | null): boolean => {
    return Boolean(
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [data-no-pan="true"]',
      ),
    );
  };

  // ─── Pointer Events (Mouse drag on desktop / 1-finger pointer) ───
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isEnabled || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (isInteractiveTarget(target)) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isEnabled || !isDragging || event.pointerId !== dragRef.current.pointerId) return;
    setPan({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    });
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  // ─── Touch Events (Mobile Pinch-to-Zoom & Pan) ───
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!isEnabled) return;
    const touches = event.touches;

    if (touches.length === 2) {
      // 2 fingers: Start Pinch-to-Zoom
      event.preventDefault();
      const t1 = touches[0];
      const t2 = touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;

      touchPinchRef.current = {
        initialDistance: Math.max(distance, 10),
        initialPan: { ...pan },
        lastCenter: { x: centerX, y: centerY },
        isPinching: true,
        lastTapTime: touchPinchRef.current.lastTapTime,
      };
      setIsDragging(false);
    } else if (touches.length === 1) {
      // Check for double tap
      const now = Date.now();
      const lastTap = touchPinchRef.current.lastTapTime;
      const target = event.target as HTMLElement | null;

      if (now - lastTap < 300 && !isInteractiveTarget(target)) {
        // Double tap: toggle zoom between auto-fit (0.5) and 1.0
        event.preventDefault();
        legacyOnWheelZoom?.(0); // Trigger reset or custom toggle
        touchPinchRef.current.lastTapTime = 0;
        return;
      }
      touchPinchRef.current.lastTapTime = now;

      if (isInteractiveTarget(target)) return;

      const t = touches[0];
      dragRef.current = {
        pointerId: 1,
        startX: t.clientX,
        startY: t.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      setIsDragging(true);
    }
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isEnabled) return;
    const touches = event.touches;

    if (touches.length === 2 && touchPinchRef.current.isPinching) {
      event.preventDefault();
      const t1 = touches[0];
      const t2 = touches[1];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      const scaleChange = (distance - touchPinchRef.current.initialDistance) / 250;
      if (Math.abs(scaleChange) > 0.01) {
        legacyOnWheelZoom?.(scaleChange);
        touchPinchRef.current.initialDistance = distance;
      }

      // Pan along with 2-finger movement
      const deltaX = currentCenter.x - touchPinchRef.current.lastCenter.x;
      const deltaY = currentCenter.y - touchPinchRef.current.lastCenter.y;
      touchPinchRef.current.lastCenter = currentCenter;

      setPan((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
    } else if (touches.length === 1 && isDragging && !touchPinchRef.current.isPinching) {
      const t = touches[0];
      const deltaX = t.clientX - dragRef.current.startX;
      const deltaY = t.clientY - dragRef.current.startY;

      setPan({
        x: dragRef.current.originX + deltaX,
        y: dragRef.current.originY + deltaY,
      });
    }
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      touchPinchRef.current.isPinching = false;
    }
    if (event.touches.length === 0) {
      setIsDragging(false);
    }
  };

  // ─── Wheel Zoom (Desktop Ctrl+Wheel or Pan canvas wheel) ───
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!isEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    legacyOnWheelZoom?.(delta);
  };

  const resetPan = useCallback(() => setPan({ x: 0, y: 0 }), []);

  return {
    pan,
    setPan,
    isDragging,
    resetPan,
    panHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stopDragging,
      onPointerCancel: stopDragging,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      onWheel,
    },
  };
}
