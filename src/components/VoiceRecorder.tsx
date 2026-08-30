import React, { useRef, useEffect } from 'react';
import { formatDuration, triggerHaptic } from '../utils/helpers';

interface VoiceRecorderProps {
  isRecording: boolean;
  recordingSeconds: number;
  maxRecordingSeconds?: number;
  liveWaveform: number[];
  freqData?: Uint8Array | null;
  volume?: number;
  voicePreviewData: {
    blob: Blob;
    base64: string;
    duration: number;
  } | null;
  isPreviewPlaying: boolean;
  previewCurrentTime: number;
  onCancelRecording: () => void;
  onStopRecording: () => void;
  onDirectSendRecording: () => void;
  onTogglePreviewPlayback: () => void;
  onSeekPreview: (percent: number) => void;
  onDiscardPreview: () => void;
  onSendVoice: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  recordingSeconds,
  maxRecordingSeconds = 60,
  liveWaveform,
  freqData,
  volume = 0,
  voicePreviewData,
  isPreviewPlaying,
  previewCurrentTime,
  onCancelRecording,
  onStopRecording,
  onDirectSendRecording,
  onTogglePreviewPlayback,
  onSeekPreview,
  onDiscardPreview,
  onSendVoice,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wavePhaseRef = useRef<number>(0);

  const remainingSeconds = Math.max(0, maxRecordingSeconds - recordingSeconds);
  const isTimeCritical = remainingSeconds <= 10 && remainingSeconds > 0;
  const progressPercent = Math.min(100, (recordingSeconds / maxRecordingSeconds) * 100);

  // Auto-stop when reaching max countdown limit
  useEffect(() => {
    if (isRecording && recordingSeconds >= maxRecordingSeconds) {
      triggerHaptic('heavy');
      onStopRecording();
    }
  }, [isRecording, recordingSeconds, maxRecordingSeconds, onStopRecording]);

  // Dynamic visual wave animation rendering on Canvas
  useEffect(() => {
    if (!isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const renderWave = () => {
      if (!isMounted) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width <= 0 || height <= 0) {
        animFrameRef.current = requestAnimationFrame(renderWave);
        return;
      }

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      wavePhaseRef.current += 0.08 + Math.min(0.25, volume * 0.4);

      const centerY = height / 2;
      const activeAmp = Math.max(0.18, Math.min(1.0, volume * 1.8 + 0.15));

      // Draw background ambient flowing wave
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let x = 0; x <= width; x += 4) {
        const norm = x / width;
        const env = Math.sin(norm * Math.PI); // tapering envelope at edges
        const wave1 = Math.sin(norm * 10 + wavePhaseRef.current * 0.8);
        const wave2 = Math.cos(norm * 18 - wavePhaseRef.current * 1.2) * 0.5;
        const y = centerY + (wave1 + wave2) * (height * 0.28) * activeAmp * env;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255, 179, 175, 0.25)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw foreground primary reactive sine wave
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let x = 0; x <= width; x += 3) {
        const norm = x / width;
        const env = Math.sin(norm * Math.PI);
        const wave = Math.sin(norm * 14 + wavePhaseRef.current);
        const harmonic = Math.sin(norm * 28 + wavePhaseRef.current * 1.5) * 0.35;
        const y = centerY + (wave + harmonic) * (height * 0.36) * activeAmp * env;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = isTimeCritical ? '#ffb4ab' : '#ffb3af';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw central high-density pulsing spectrum bars
      const barCount = 32;
      const barSpacing = Math.max(1.5, Math.min(3, width / (barCount * 3.5)));
      const totalSpacing = (barCount - 1) * barSpacing;
      const barWidth = Math.max(2, (width - totalSpacing) / barCount);

      for (let i = 0; i < barCount; i++) {
        const norm = i / (barCount - 1);
        const distFromCenter = 1 - Math.abs(norm - 0.5) * 2;
        const x = i * (barWidth + barSpacing);

        let barLevel = 0.15;
        if (freqData && freqData.length > 0) {
          const sampleIdx = Math.floor((i / barCount) * freqData.length);
          barLevel = Math.max(0.12, (freqData[sampleIdx] / 255) * 1.3);
        } else if (liveWaveform && liveWaveform.length > 0) {
          const sampleIdx = Math.floor((i / barCount) * liveWaveform.length);
          barLevel = liveWaveform[sampleIdx] || 0.15;
        } else {
          barLevel = Math.max(0.15, volume * (0.6 + 0.4 * Math.sin(i * 0.5 + wavePhaseRef.current)));
        }

        const barHeight = Math.max(4, barLevel * (height - 8) * distFromCenter);
        const y = centerY - barHeight / 2;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }

        ctx.fillStyle = isTimeCritical
          ? 'rgba(255, 180, 171, 0.85)'
          : `rgba(255, 179, 175, ${0.4 + barLevel * 0.6})`;
        ctx.fill();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    animFrameRef.current = requestAnimationFrame(renderWave);

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, volume, liveWaveform, freqData, isTimeCritical]);

  // ACTIVE RECORDING HUD
  if (isRecording) {
    return (
      <div
        id="voice-recording-hud"
        className="w-full px-3 sm:px-4 py-3 bg-[#1e2025] border-t border-white/5 z-40 shadow-2xl animate-fade-in select-none font-sans"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
          {/* Top Control, Status & Clear Countdown Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onCancelRecording}
              id="cancel-recording-btn"
              className="w-11 h-11 rounded-full bg-[#111318] border border-white/5 hover:bg-[#93000a]/20 text-[#ffb4ab] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Cancel Recording"
              aria-label="Cancel Voice Recording"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Status & Countdown Badges */}
            <div className="flex items-center gap-2">
              {/* Active Recording Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111318] border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab] animate-ping inline-block" />
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#ffb4ab] font-mono">
                  Recording
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-[#e2e2e9] ml-1">
                  {formatDuration(recordingSeconds)}
                </span>
              </div>

              {/* Clear Countdown Timer Badge */}
              <div
                id="recording-countdown-timer"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                  isTimeCritical
                    ? 'bg-[#93000a]/20 border-[#ffb4ab] text-[#ffb4ab] animate-pulse'
                    : 'bg-[#111318] border-white/5 text-[#ffb3af]'
                }`}
                title="Max Recording Countdown Limit"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isTimeCritical ? 'timer_3' : 'hourglass_bottom'}
                </span>
                <div className="flex items-baseline gap-1 font-mono text-xs">
                  <span className="font-bold">{formatDuration(remainingSeconds)}</span>
                  <span className="text-[10px] opacity-75 hidden sm:inline">left</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Preview & Direct Send */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onStopRecording}
                id="preview-recording-btn"
                className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-full bg-[#111318] hover:bg-[#282a2f] text-[#e2e2e9] text-xs font-label-md font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 border border-white/5"
                title="Stop & Review Preview"
              >
                <span className="material-symbols-outlined text-[16px] text-[#ffb3af]">stop</span>
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={onDirectSendRecording}
                id="direct-send-recording-btn"
                className="w-11 h-11 rounded-full bg-[#ffb3af] hover:bg-[#ffdad6] text-[#561e1d] flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-lg shrink-0"
                title="Send Recording Immediately"
                aria-label="Send Voice Message Immediately"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
          </div>

          {/* Active Visual Wave Animation Canvas Container */}
          <div className="relative w-full h-12 bg-[#111318] rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
            {/* Live Visual Waveform & Oscilloscope Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full block relative z-10"
              style={{ height: '48px' }}
            />

            {/* Progress line bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#282a2f] z-20">
              <div
                className={`h-full transition-all duration-300 ${
                  isTimeCritical ? 'bg-[#ffb4ab]' : 'bg-[#ffb3af]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VOICE PREVIEW HUD (POST-RECORDING PLAYBACK & SCRUBBING)
  if (voicePreviewData && !isRecording) {
    return (
      <div
        id="voice-preview-hud"
        className="w-full px-3 sm:px-4 py-3 bg-[#1e2025] border-t border-white/5 z-40 shadow-2xl animate-fade-in select-none font-sans"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Discard / Delete Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onDiscardPreview();
            }}
            id="discard-voice-preview-btn"
            className="w-11 h-11 rounded-full bg-[#111318] border border-white/5 hover:bg-[#93000a]/20 text-[#ffb4ab] flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95"
            title="Delete Voice Note"
            aria-label="Delete voice note"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePreviewPlayback}
            id="toggle-voice-preview-play-btn"
            className="w-11 h-11 rounded-full bg-[#ffb3af] text-[#561e1d] flex items-center justify-center shrink-0 hover:bg-[#ffdad6] transition-all cursor-pointer active:scale-90 shadow-md"
            title={isPreviewPlaying ? 'Pause Preview' : 'Play Preview'}
            aria-label={isPreviewPlaying ? 'Pause Voice Preview' : 'Play Voice Preview'}
          >
            {isPreviewPlaying ? (
              <span className="material-symbols-outlined text-[22px]">pause</span>
            ) : (
              <span className="material-symbols-outlined text-[22px] ml-0.5">play_arrow</span>
            )}
          </button>

          {/* Interactive Progress Scrubber & Duration */}
          <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
            <div
              className="w-full min-h-[32px] flex items-center cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeekPreview(percent);
              }}
            >
              <div className="w-full h-2 bg-[#111318] rounded-full relative flex items-center">
                {/* Progress fill */}
                <div
                  className="h-full bg-[#ffb3af] rounded-full"
                  style={{
                    width: `${
                      voicePreviewData.duration > 0
                        ? (previewCurrentTime / voicePreviewData.duration) * 100
                        : 0
                    }%`,
                  }}
                />
                {/* Playhead Dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full bg-white shadow-md absolute -ml-1.5 transition-transform group-hover:scale-125"
                  style={{
                    left: `${
                      voicePreviewData.duration > 0
                        ? (previewCurrentTime / voicePreviewData.duration) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Timestamp Indicator */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#c7c6cb] px-0.5">
              <span>{formatDuration(Math.floor(previewCurrentTime))}</span>
              <span>{formatDuration(voicePreviewData.duration)}</span>
            </div>
          </div>

          {/* Send Voice Button */}
          <button
            type="button"
            onClick={onSendVoice}
            id="send-voice-preview-btn"
            className="min-h-[44px] px-5 py-2 rounded-full bg-[#ffb3af] text-[#561e1d] text-xs font-label-md font-bold flex items-center gap-2 shrink-0 hover:bg-[#ffdad6] active:scale-95 transition-all shadow-md cursor-pointer"
            title="Send Voice Note"
            aria-label="Send Voice Note"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
