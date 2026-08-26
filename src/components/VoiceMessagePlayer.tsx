import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic, Activity, Flame, Download } from 'lucide-react';
import { formatDuration, triggerHaptic } from '../utils/helpers';
import { extractWaveformData, generateFallbackWaveform } from '../utils/waveform';
import { VoiceWaveformCanvas } from './VoiceWaveformCanvas';

interface VoiceMessagePlayerProps {
  audioSrc?: string;
  duration?: number;
  isMe: boolean;
  burnOnRead?: boolean;
  deferAutoDownload?: boolean;
  onPlay?: () => void;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioSrc,
  duration = 0,
  isMe,
  burnOnRead,
  deferAutoDownload = false,
  onPlay,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isDownloaded, setIsDownloaded] = useState(!deferAutoDownload);
  const [waveform, setWaveform] = useState<number[]>(() =>
    generateFallbackWaveform(42, audioSrc || `voice-note-${duration}`)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Extract real waveform and initialize audio only when downloaded/loaded
  useEffect(() => {
    if (!audioSrc || !isDownloaded) return;

    let isMounted = true;

    extractWaveformData(audioSrc, 42)
      .then((peaks) => {
        if (isMounted && peaks && peaks.length > 0) {
          setWaveform(peaks);
        }
      })
      .catch(() => {
        // Fallback already pre-initialized
      });

    const audio = new Audio(audioSrc);
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      isMounted = false;
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioSrc, isDownloaded]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleDownloadAndPlay = () => {
    triggerHaptic('medium');
    setIsDownloaded(true);
    // Slight tick to allow audio to initialize
    setTimeout(() => {
      if (audioRef.current) {
        onPlay?.();
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }, 50);
  };

  const togglePlay = () => {
    if (!isDownloaded) {
      handleDownloadAndPlay();
      return;
    }

    if (!audioRef.current) return;
    triggerHaptic('medium');
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      onPlay?.();
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const handleSeekPercent = (percent: number) => {
    const maxTime = Math.max(totalDuration, 1);
    const targetTime = percent * maxTime;
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const cyclePlaybackRate = () => {
    triggerHaptic('light');
    const nextRates = [1, 1.5, 2];
    const nextIndex = (nextRates.indexOf(playbackRate) + 1) % nextRates.length;
    setPlaybackRate(nextRates[nextIndex]);
  };

  const maxTime = Math.max(totalDuration, 1);
  const progressPercent = Math.min(1, Math.max(0, currentTime / maxTime));

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 min-w-[260px] sm:min-w-[310px] max-w-sm shadow-md select-none ${
        isMe
          ? 'bg-[#181818] border-[#303030] text-white rounded-tr-xs'
          : 'bg-[#121212] border-[#252525] text-[#EDEDED] rounded-tl-xs'
      }`}
    >
      {/* Top Micro-Header */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pb-2 mb-1 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center ${
              isMe ? 'bg-zinc-800 text-white' : 'bg-emerald-950/80 text-emerald-400'
            }`}
          >
            <Mic className="w-2.5 h-2.5" />
          </div>
          <span className="font-semibold tracking-wide text-zinc-300">
            {isMe ? 'Voice Note Sent' : 'Voice Note'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {burnOnRead && (
            <span className="text-amber-400 font-semibold flex items-center gap-0.5 text-[9px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
              <Flame className="w-2.5 h-2.5" />
              <span>Burn</span>
            </span>
          )}
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
            {isPlaying ? 'Playing' : 'Audio 48kHz'}
          </span>
        </div>
      </div>

      {/* Center Waveform & Playback Controls */}
      <div className="flex items-center gap-3">
        {/* Play / Download Button */}
        <button
          onClick={togglePlay}
          id="voice-play-toggle-btn"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer flex-shrink-0 shadow-lg ${
            !isDownloaded
              ? 'bg-amber-400 text-black hover:bg-amber-300 ring-2 ring-amber-400/50'
              : isMe
              ? 'bg-white text-black hover:bg-zinc-200'
              : 'bg-emerald-500 text-black hover:bg-emerald-400'
          } ${isPlaying ? 'ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-black' : ''}`}
          aria-label={
            !isDownloaded
              ? 'Download voice message'
              : isPlaying
              ? 'Pause voice message'
              : 'Play voice message'
          }
          title={!isDownloaded ? 'Tap to download audio (Low Data Mode)' : undefined}
        >
          {!isDownloaded ? (
            <Download className="w-4 h-4 text-black animate-bounce" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Visual Static & Interactive Waveform Canvas */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <VoiceWaveformCanvas
            waveform={waveform}
            progress={progressPercent}
            isPlaying={isPlaying}
            isMe={isMe}
            onSeek={handleSeekPercent}
            height={32}
            totalDuration={totalDuration}
          />
        </div>

        {/* Speed Multiplier Pill */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="text-[10px] font-mono px-2 py-1 rounded-lg border border-zinc-700/80 hover:border-zinc-500 bg-zinc-900 text-zinc-300 hover:text-white transition-all cursor-pointer flex-shrink-0 active:scale-95 shadow-xs"
          title="Toggle playback speed (1x, 1.5x, 2x)"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Timestamp & Progress Metadata Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-2 text-zinc-400 border-t border-white/5 mt-1.5">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-semibold text-white">
            {formatDuration(Math.floor(currentTime))}
          </span>
          <span className="text-zinc-500 font-normal">/ {formatDuration(Math.floor(totalDuration))}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          {!isDownloaded ? (
            <span className="text-amber-400/90 font-medium">Tap to load audio</span>
          ) : (
            <>
              <Activity className={`w-3 h-3 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-zinc-600'}`} />
              <span>{isPlaying ? 'Streaming' : 'Static Waveform'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
