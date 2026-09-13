'use client';

import React, { useEffect, useRef } from 'react';

export const AyanWaveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Wave parameters
    let step = 0;
    const waves = [
      {
        frequency: 0.002,
        amplitude: 75,
        speed: 0.015,
        colorStart: 'rgba(220, 38, 38, 0.28)',
        colorMid: 'rgba(153, 27, 27, 0.15)',
        colorEnd: 'rgba(0, 0, 0, 0)',
        lineWidth: 2,
        lineGlow: 'rgba(239, 68, 68, 0.6)',
        yOffset: 0.45,
      },
      {
        frequency: 0.003,
        amplitude: 95,
        speed: 0.02,
        colorStart: 'rgba(185, 28, 28, 0.22)',
        colorMid: 'rgba(127, 29, 29, 0.12)',
        colorEnd: 'rgba(0, 0, 0, 0)',
        lineWidth: 1.5,
        lineGlow: 'rgba(248, 113, 113, 0.5)',
        yOffset: 0.55,
      },
      {
        frequency: 0.0018,
        amplitude: 120,
        speed: 0.01,
        colorStart: 'rgba(127, 29, 29, 0.25)',
        colorMid: 'rgba(69, 10, 10, 0.15)',
        colorEnd: 'rgba(0, 0, 0, 0)',
        lineWidth: 2.5,
        lineGlow: 'rgba(220, 38, 38, 0.7)',
        yOffset: 0.65,
      },
      {
        frequency: 0.0035,
        amplitude: 60,
        speed: 0.025,
        colorStart: 'rgba(239, 68, 68, 0.18)',
        colorMid: 'rgba(153, 27, 27, 0.08)',
        colorEnd: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        lineGlow: 'rgba(254, 202, 202, 0.4)',
        yOffset: 0.78,
      },
      {
        frequency: 0.0015,
        amplitude: 140,
        speed: 0.008,
        colorStart: 'rgba(153, 27, 27, 0.2)',
        colorMid: 'rgba(0, 0, 0, 0.05)',
        colorEnd: 'rgba(0, 0, 0, 0)',
        lineWidth: 2,
        lineGlow: 'rgba(239, 68, 68, 0.45)',
        yOffset: 0.35,
      },
    ];

    const render = () => {
      step += 1;
      ctx.clearRect(0, 0, width, height);

      // Render each wavy cyber ribbon
      waves.forEach((w, index) => {
        const baseHeight = height * w.yOffset;
        const phase = step * w.speed + index * 1.8;

        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseHeight);

        for (let x = 0; x <= width; x += 8) {
          const y =
            baseHeight +
            Math.sin(x * w.frequency + phase) * w.amplitude +
            Math.cos(x * w.frequency * 0.5 + phase * 0.7) * (w.amplitude * 0.35);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Wave Fill Gradient
        const gradient = ctx.createLinearGradient(0, baseHeight - w.amplitude, 0, height);
        gradient.addColorStop(0, w.colorStart);
        gradient.addColorStop(0.4, w.colorMid);
        gradient.addColorStop(1, w.colorEnd);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Glowing Crest Line
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const y =
            baseHeight +
            Math.sin(x * w.frequency + phase) * w.amplitude +
            Math.cos(x * w.frequency * 0.5 + phase * 0.7) * (w.amplitude * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = w.lineGlow;
        ctx.lineWidth = w.lineWidth;
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Subtle scanline overlay for true cyberpunk ambiance */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0px, rgba(0, 0, 0, 0.3) 1px, transparent 1px, transparent 3px)',
        }}
      />
    </div>
  );
};
