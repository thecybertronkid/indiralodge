'use client';

import React, { useEffect, useState } from 'react';

export const AyanCyberCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trailing, setTrailing] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId: number;

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, select, textarea, [role="button"], tr, .cursor-pointer');
        setIsHovered(!!interactive);
      }
    };

    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth trailing animation loop
    let currentX = -100;
    let currentY = -100;

    const followLoop = () => {
      currentX += (position.x - currentX) * 0.22;
      currentY += (position.y - currentY) * 0.22;
      setTrailing({ x: currentX, y: currentY });
      frameId = requestAnimationFrame(followLoop);
    };

    frameId = requestAnimationFrame(followLoop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(frameId);
    };
  }, [position.x, position.y, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Outer Cyberpunk Trailing Reticle Ring */}
      <div
        className="fixed top-0 left-0 transition-transform duration-75 pointer-events-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: `translate3d(${trailing.x}px, ${trailing.y}px, 0) scale(${isClicked ? 0.75 : isHovered ? 1.45 : 1})`,
        }}
      >
        <div
          className={`rounded-full border transition-all duration-200 ${
            isHovered
              ? 'w-9 h-9 border-red-500 bg-red-600/15 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse'
              : 'w-6 h-6 border-red-600/60 shadow-[0_0_8px_rgba(220,38,38,0.4)]'
          }`}
        >
          {/* Cyberpunk corner ticks */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-red-400" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-red-400" />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-0.5 h-1.5 bg-red-400" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-0.5 h-1.5 bg-red-400" />
        </div>
      </div>

      {/* Center Laser Dot */}
      <div
        className="fixed top-0 left-0 pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      >
        <div
          className={`rounded-full transition-transform duration-100 ${
            isHovered
              ? 'w-2 h-2 bg-white shadow-[0_0_10px_#ff0055]'
              : 'w-1.5 h-1.5 bg-red-500 shadow-[0_0_6px_#ef4444]'
          }`}
        />
      </div>
    </div>
  );
};
