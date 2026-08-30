import React, { useState, useRef, useEffect } from 'react';
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
    generateFallbackWaveform(36, audioSrc || `voice-note-${duration}`)
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioSrc || !isDownloaded) return;

    let isMounted = true;

    extractWaveformData(audioSrc, 36)
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleDownloadAndPlay = () => {
    triggerHaptic('medium');
    setIsDownloaded(true);
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
      className={`p-3.5 rounded-[18px] border transition-all duration-200 min-w-[240px] sm:min-w-[280px] max-w-sm shadow-md select-none ${
        isMe
          ? 'msg-bubble-out bg-[#282a2f] text-[#e2e2e9] border-white/5'
          : 'msg-bubble-in bg-[#1e2025] text-[#e2e2e9] border-white/5'
      }`}
    >
      {/* Waveform & Play Controls */}
      <div className="flex items-center gap-2.5">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          id="voice-play-toggle-btn"
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-[#ffb3af] text-[#230002] hover:bg-[#ffdad7] flex items-center justify-center transition-all active:scale-95 cursor-pointer flex-shrink-0 shadow-sm"
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {!isDownloaded ? (
            <span className="material-symbols-outlined text-[18px]">download</span>
          ) : isPlaying ? (
            <span className="material-symbols-outlined text-[18px]">pause</span>
          ) : (
            <span className="material-symbols-outlined text-[18px] ml-0.5">play_arrow</span>
          )}
        </button>

        {/* Waveform */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <VoiceWaveformCanvas
            waveform={waveform}
            progress={progressPercent}
            isPlaying={isPlaying}
            isMe={isMe}
            onSeek={handleSeekPercent}
            height={26}
            totalDuration={totalDuration}
          />
        </div>

        {/* Playback speed */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="text-[10px] font-mono px-2 py-1 rounded-full border border-white/10 hover:border-[#ffb3af] bg-[#111318] text-[#c7c6cb] hover:text-[#e2e2e9] transition-all cursor-pointer flex items-center justify-center flex-shrink-0"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 mt-1 border-t border-white/5 text-[#909095]">
        <div className="flex items-center gap-1">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>/</span>
          <span>{formatDuration(Math.floor(totalDuration))}</span>
        </div>

        {burnOnRead && (
          <span className="font-semibold flex items-center gap-0.5 text-[#ffb3af]">
            <span className="material-symbols-outlined text-[10px]">local_fire_department</span>
            <span>Burn on read</span>
          </span>
        )}
      </div>
    </div>
  );
};
