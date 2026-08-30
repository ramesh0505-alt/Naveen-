import React, { useRef, useEffect, useState } from 'react';
import type { CallState, MemberRole } from '../types';
import { formatDuration, triggerHaptic } from '../utils/helpers';

interface AudioCallModalProps {
  callState: CallState;
  otherRole: MemberRole | null;
  callDuration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  localVolume: number;
  remoteVolume: number;
  callError?: string | null;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onBindAudioElement?: (el: HTMLAudioElement | null) => void;
}

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  callState,
  otherRole,
  callDuration,
  isMuted,
  isSpeaker,
  localVolume,
  remoteVolume,
  callError,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onBindAudioElement,
}) => {
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState<boolean>(false);

  useEffect(() => {
    if (onBindAudioElement) {
      onBindAudioElement(remoteAudioRef.current);
    }
  }, [onBindAudioElement, callState]);

  if (callState === 'IDLE') return null;

  const isIncoming = callState === 'RINGING';
  const isOutgoing = callState === 'CALLING';
  const isConnected = callState === 'CONNECTED';
  const audioActivity = Math.max(localVolume, remoteVolume);

  const isMicDenied =
    callError &&
    (callError.toLowerCase().includes('permission') ||
      callError.toLowerCase().includes('microphone') ||
      callError.toLowerCase().includes('notallowederror'));

  const handleGrantPermission = async () => {
    setIsRequestingMic(true);
    triggerHaptic('medium');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequestingMic(false);
    }
  };

  return (
    <div
      id="audio-call-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/95 backdrop-blur-2xl animate-fade-in select-none overflow-hidden"
    >
      {/* Mounted audio element for remote WebRTC stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      />

      {/* Main Card View */}
      {isMicDenied ? (
        /* Microphone Permission Denied Screen */
        <div className="relative w-full max-w-sm rounded-[28px] bg-[#121419] p-7 flex flex-col items-center text-center shadow-2xl border border-[#272A31] z-10 animate-scale-up">
          {/* Error Icon Container */}
          <div className="w-16 h-16 rounded-2xl bg-[#FF5C5C]/10 flex items-center justify-center mb-5 border border-[#FF5C5C]/30">
            <span className="material-symbols-outlined text-[#FF5C5C] text-[32px]">mic_off</span>
          </div>

          <h1 className="font-editorial text-2xl text-[#F5F3EE] mb-2 tracking-tight">
            Microphone Required
          </h1>
          <p className="font-body-sm text-xs text-[#9B9DA3] mb-6 max-w-[260px] leading-relaxed">
            Please allow microphone access to participate in end-to-end encrypted audio calls.
          </p>

          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={handleGrantPermission}
              disabled={isRequestingMic}
              className="w-full py-3 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold text-xs hover:bg-[#F0E3C8] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <span>Grant Permission</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
            <button
              onClick={onEndCall}
              className="w-full py-3 rounded-full bg-[#181B21] text-[#9B9DA3] hover:text-[#F5F3EE] font-label-md font-semibold text-xs transition-colors border border-[#272A31] cursor-pointer active:scale-95"
            >
              Return to Chat
            </button>
          </div>
        </div>
      ) : isIncoming ? (
        /* Incoming Audio Call */
        <div className="relative z-10 flex flex-col items-center gap-7 w-full max-w-sm text-center animate-scale-up">
          {/* Caller Icon */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full bg-[#181B21] shadow-2xl flex justify-center items-center mb-2 relative border border-[#E8D8B8]/30">
              <div className="absolute inset-0 rounded-full border border-[#E8D8B8]/40 animate-ping opacity-40"></div>
              <span className="material-symbols-outlined text-[#E8D8B8] text-[40px]">call</span>
            </div>
            <h1 className="font-editorial text-2xl text-[#F5F3EE]">
              Incoming Audio Call
            </h1>
            <p className="font-body-sm text-xs text-[#9B9DA3]">
              Encrypted 2-person voice session...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full gap-4 mt-2">
            {/* Decline */}
            <button
              onClick={() => {
                triggerHaptic('heavy');
                onReject();
              }}
              id="decline-call-btn"
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#FF5C5C]/10 hover:bg-[#FF5C5C]/20 active:scale-95 transition-all border border-[#FF5C5C]/20 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF5C5C] text-white flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[22px]">call_end</span>
              </div>
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#FF5C5C] font-semibold">Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={() => {
                triggerHaptic('heavy');
                onAccept();
              }}
              id="accept-call-btn"
              className="flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-[#7ED6A5]/10 hover:bg-[#7ED6A5]/20 active:scale-95 transition-all border border-[#7ED6A5]/30 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-[#7ED6A5] text-[#0B0C0F] flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[22px]">call</span>
              </div>
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-[#7ED6A5] font-bold">Accept</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active / Outgoing Connected Audio Call */
        <div className="w-full max-w-sm flex flex-col items-center justify-between min-h-[520px] z-10 animate-scale-up">
          {/* Top Status & Avatar */}
          <div className="flex-1 flex flex-col items-center justify-center text-center pt-4">
            <div className="w-28 h-28 rounded-full bg-[#181B21] flex items-center justify-center mb-4 shadow-2xl relative border border-[#272A31]">
              {/* Dynamic Sound wave glow */}
              <div
                className="absolute inset-0 rounded-full bg-[#E8D8B8]/20 blur-xl transition-all duration-150"
                style={{
                  transform: `scale(${1 + audioActivity * 0.8})`,
                  opacity: 0.2 + audioActivity * 0.8,
                }}
              />
              <span className="material-symbols-outlined text-[#E8D8B8] text-[40px] relative z-10">person</span>
            </div>

            <h1 className="font-editorial text-2xl text-[#F5F3EE] mb-1">
              Encrypted Voice Call
            </h1>
            <div className="flex items-center gap-2 font-mono text-xs text-[#9B9DA3] mb-4">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#7ED6A5]' : 'bg-[#E8D8B8]'} animate-pulse`}></span>
              <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>

            {/* Timer */}
            <div className="font-mono text-3xl font-light tracking-widest text-[#E8D8B8] tabular-nums" id="call-timer">
              {isConnected ? formatDuration(callDuration) : '00:00'}
            </div>

            {callError && (
              <div className="mt-4 px-3.5 py-1.5 bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-[#FF5C5C] text-xs font-mono rounded-xl flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>{callError}</span>
              </div>
            )}
          </div>

          {/* Floating Rounded Bottom Dock */}
          <div className="w-full pb-safe pt-6 flex justify-center">
            <div className="flex items-center justify-center gap-4 bg-[#121419] px-6 py-3 rounded-full shadow-2xl border border-[#272A31]">
              {/* Mute Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleMute();
                }}
                id="btn-mute"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer ${
                  isMuted
                    ? 'bg-[#E8D8B8] text-[#121419]'
                    : 'bg-[#181B21] text-[#F5F3EE] hover:bg-[#272A31]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isMuted ? 'mic_off' : 'mic'}
                </span>
              </button>

              {/* End Call Button */}
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onEndCall();
                }}
                id="btn-end"
                className="w-14 h-14 rounded-full bg-[#FF5C5C] text-white hover:bg-[#FF7070] flex items-center justify-center transition-all active:scale-90 shadow-xl shrink-0 cursor-pointer"
                title="End Call"
              >
                <span className="material-symbols-outlined text-[26px]">call_end</span>
              </button>

              {/* Speaker Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleSpeaker();
                }}
                id="btn-speaker"
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer ${
                  isSpeaker
                    ? 'bg-[#E8D8B8] text-[#121419]'
                    : 'bg-[#181B21] text-[#F5F3EE] hover:bg-[#272A31]'
                }`}
                title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isSpeaker ? 'volume_up' : 'volume_off'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
