import React, { useRef, useEffect } from 'react';

interface LiveAudioVisualizerProps {
  freqData?: Uint8Array | null;
  volume: number;
  barCount?: number;
  height?: number;
}

export const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  freqData,
  volume,
  barCount = 24,
  height = 24,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const h = height;

    if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
      canvas.width = width * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, h);

    const barSpacing = 2;
    const totalSpacing = (barCount - 1) * barSpacing;
    const barWidth = Math.max(2, (width - totalSpacing) / barCount);
    const centerY = h / 2;

    for (let i = 0; i < barCount; i++) {
      let amp = 0.15;
      if (freqData && freqData.length > 0) {
        const dataIndex = Math.floor((i / barCount) * freqData.length);
        amp = Math.max(0.12, freqData[dataIndex] / 255);
      } else {
        // Fallback reactive to overall volume
        const phase = i * 0.4 + Date.now() * 0.006;
        amp = Math.max(0.15, volume * (0.6 + 0.4 * Math.sin(phase)));
      }

      const barHeight = Math.max(3, amp * (h - 4));
      const x = i * (barWidth + barSpacing);
      const y = centerY - barHeight / 2;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fillStyle = amp > 0.4 ? '#EF4444' : '#F87171'; // Red pulse for active recording
      ctx.fill();
    }

    ctx.restore();
  }, [freqData, volume, barCount, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ height: `${height}px` }}
    />
  );
};
