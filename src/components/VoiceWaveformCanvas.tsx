import React, { useRef, useEffect, useState, useMemo } from 'react';
import { formatDuration, triggerHaptic } from '../utils/helpers';

interface VoiceWaveformCanvasProps {
  waveform: number[];
  progress: number; // 0 to 1
  isPlaying: boolean;
  isMe: boolean;
  onSeek: (percent: number) => void;
  height?: number;
  totalDuration?: number;
}

export const VoiceWaveformCanvas: React.FC<VoiceWaveformCanvasProps> = ({
  waveform,
  progress,
  isPlaying,
  isMe,
  onSeek,
  height = 36,
  totalDuration = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const animOffsetRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Default bars if waveform is empty: generate a natural conversational speech curve
  const bars = useMemo(() => {
    if (waveform && waveform.length >= 10) return waveform;
    const barCount = 42;
    const result: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const norm = i / (barCount - 1);
      // Organic speech pattern envelope
      const envelope = Math.sin(norm * Math.PI) * 0.4 + 0.3;
      const noise = ((Math.sin(i * 12.34) + 1) / 2) * 0.4 + 0.2;
      result.push(Math.max(0.15, Math.min(1.0, envelope * noise * 1.5)));
    }
    return result;
  }, [waveform]);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const draw = () => {
      if (!isMounted) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const h = height;

      if (width <= 0 || h <= 0) return;

      // Adjust internal canvas resolution for sharp retina display
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, h);

      const totalBars = bars.length;
      const barSpacing = Math.max(1.5, Math.min(3, width / (totalBars * 3)));
      const totalSpacing = (totalBars - 1) * barSpacing;
      const barWidth = Math.max(2, (width - totalSpacing) / totalBars);
      const centerY = h / 2;

      // Advance dynamic micro-oscillation if playing
      if (isPlaying) {
        animOffsetRef.current += 0.15;
      }

      for (let i = 0; i < totalBars; i++) {
        const x = i * (barWidth + barSpacing);
        const barNormalizedPos = (i + 0.5) / totalBars;
        const isPast = barNormalizedPos <= progress;
        const isNearPlayhead = isPlaying && Math.abs(barNormalizedPos - progress) < 0.14;

        // Base peak height
        let baseMagnitude = bars[i];

        // Micro-bounce when near active playback needle
        if (isPlaying && isNearPlayhead) {
          const wavePhase = animOffsetRef.current + i * 0.45;
          const bounce = Math.sin(wavePhase) * 0.22;
          baseMagnitude = Math.min(1.0, Math.max(0.12, baseMagnitude + bounce));
        }

        const barHeight = Math.max(4, baseMagnitude * (h - 8));
        const yTop = centerY - barHeight / 2;

        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 2.5);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, yTop, barWidth, barHeight, radius);
        } else {
          ctx.rect(x, yTop, barWidth, barHeight);
        }

        if (isPast) {
          // Active played segment color with subtle gradient
          if (isMe) {
            const grad = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(1, '#E2E8F0');
            ctx.fillStyle = grad;
          } else {
            const grad = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
            grad.addColorStop(0, '#34D399'); // Emerald 400
            grad.addColorStop(1, '#059669'); // Emerald 600
            ctx.fillStyle = grad;
          }
        } else {
          // Unplayed static segment color
          if (isMe) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          }
        }

        ctx.fill();
      }

      // Draw active playhead needle / glow beacon
      if (progress > 0 && progress <= 1) {
        const playheadX = Math.min(width - 2, Math.max(2, progress * width));
        
        // Needle line
        ctx.beginPath();
        ctx.moveTo(playheadX, 1);
        ctx.lineTo(playheadX, h - 1);
        ctx.strokeStyle = isMe ? '#FFFFFF' : '#34D399';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Glowing center dot
        ctx.beginPath();
        ctx.arc(playheadX, centerY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isMe ? '#FFFFFF' : '#10B981';
        ctx.shadowColor = isMe ? 'rgba(255,255,255,0.9)' : 'rgba(52,211,153,0.9)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Draw scrub hover line and preview indicator
      if (isHovered && hoverPercent !== null) {
        const hoverX = hoverPercent * width;
        ctx.beginPath();
        ctx.moveTo(hoverX, 0);
        ctx.lineTo(hoverX, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bars, progress, isPlaying, isMe, hoverPercent, isHovered, height]);

  // Click & scrub interactions
  const handlePointerAction = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    triggerHaptic('light');
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clampedPercent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clampedPercent);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, moveX / rect.width));
    setHoverPercent(percent);
  };

  const hoverTime = hoverPercent !== null && totalDuration > 0
    ? Math.round(hoverPercent * totalDuration)
    : null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerAction}
      onPointerMove={handlePointerMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoverPercent(null);
      }}
      className="w-full relative cursor-pointer select-none py-1 group touch-none"
      style={{ height: `${height + 6}px` }}
      title="Click or drag to seek in voice note"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ height: `${height}px` }}
      />

      {/* Scrub tooltip badge */}
      {isHovered && hoverPercent !== null && hoverTime !== null && (
        <div
          className="absolute -top-6 px-1.5 py-0.5 rounded bg-black/90 text-white font-mono text-[9px] border border-white/20 pointer-events-none transform -translate-x-1/2 z-10 whitespace-nowrap shadow-md"
          style={{ left: `${Math.min(92, Math.max(8, hoverPercent * 100))}%` }}
        >
          {formatDuration(hoverTime)}
        </div>
      )}
    </div>
  );
};
