'use client';

import { useRef, useState, type PointerEvent, type WheelEvent } from 'react';

export function useBracketPanZoom(enabled: boolean, onWheelZoom?: (delta: number) => void) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0 });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !isDragging || event.pointerId !== dragRef.current.pointerId) return;
    setPan({
      x: dragRef.current.originX + event.clientX - dragRef.current.startX,
      y: dragRef.current.originY + event.clientY - dragRef.current.startY,
    });
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!enabled) return;
    event.preventDefault();
    event.stopPropagation();
    onWheelZoom?.(event.deltaY > 0 ? -0.1 : 0.1);
  };

  const resetPan = () => setPan({ x: 0, y: 0 });

  return {
    pan,
    isDragging,
    resetPan,
    panHandlers: { onPointerDown, onPointerMove, onPointerUp: stopDragging, onPointerCancel: stopDragging, onWheel },
  };
}
