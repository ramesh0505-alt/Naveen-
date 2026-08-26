import React, { useRef, useEffect, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Shield,
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
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

  // Check if error is mic permission related
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/95 backdrop-blur-2xl animate-fade-in select-none font-sans overflow-hidden selection:bg-[#4d8eff]/30 selection:text-white"
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

      {/* Ambient Pulsing Background Elements */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div
          className="w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full bg-[#adc6ff]/15 blur-[80px] opacity-60 animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div
          className="absolute w-[60vw] h-[60vw] max-w-[350px] max-h-[350px] rounded-full bg-[#ffb786]/10 blur-[60px] opacity-40 animate-pulse"
          style={{ animationDuration: '4s', animationDelay: '1s' }}
        />
      </div>

      {/* Main Card View */}
      {isMicDenied ? (
        /* Microphone Permission Denied Screen */
        <div className="relative w-full max-w-sm rounded-[2rem] bg-[#222a3d]/80 backdrop-blur-2xl p-7 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 z-10 animate-scale-up">
          {/* Ambient Glow */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#ffb4ab]/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Error Icon Container */}
          <div className="relative w-20 h-20 rounded-full bg-[#93000a]/30 flex items-center justify-center mb-6 border border-[#ffb4ab]/30 shadow-[0_0_30px_rgba(255,180,171,0.15)]">
            <MicOff className="w-9 h-9 text-[#ffb4ab]" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ffb4ab] animate-pulse border-2 border-[#222a3d]"></div>
          </div>

          <h1 className="text-xl font-bold text-[#dae2fd] mb-2 tracking-tight">
            Microphone Access Required
          </h1>
          <p className="text-sm text-[#c2c6d6] mb-8 max-w-[280px] leading-relaxed">
            We need access to your microphone to start the audio call. Please enable permissions in your browser or device settings.
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleGrantPermission}
              disabled={isRequestingMic}
              className="area-tap w-full min-h-[48px] py-4 rounded-2xl bg-[#adc6ff] text-[#002e6a] font-semibold text-sm tracking-wide hover:bg-[#d8e2ff] transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-lg active:scale-95"
            >
              <span>Grant Access</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onEndCall}
              className="area-tap w-full min-h-[48px] py-3.5 rounded-2xl bg-transparent text-[#adc6ff] font-semibold text-sm tracking-wide hover:bg-[#2d3449] transition-colors border border-[#adc6ff]/20 backdrop-blur-md cursor-pointer active:scale-95"
            >
              Return to Chat
            </button>
          </div>
        </div>
      ) : isIncoming ? (
        /* Incoming Audio Call */
        <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm text-center animate-scale-up">
          {/* Caller Icon */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full bg-[#222a3d] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-center items-center mb-2 relative border border-[#adc6ff]/30">
              <div className="absolute inset-0 rounded-full border border-[#adc6ff]/40 animate-ping opacity-40"></div>
              <Phone className="w-14 h-14 text-[#adc6ff]" />
            </div>
            <h1 className="text-2xl font-bold text-[#dae2fd]">
              Incoming Audio Call
            </h1>
            <p className="text-sm text-[#c2c6d6]">
              Secure 2-person voice connection...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full gap-4 mt-4">
            {/* Decline */}
            <button
              onClick={() => {
                triggerHaptic('heavy');
                onReject();
              }}
              id="decline-call-btn"
              className="area-tap flex-1 min-h-[72px] flex flex-col items-center justify-center gap-2 py-4 rounded-3xl bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 active:bg-[#ffb4ab]/30 transition-colors backdrop-blur-xl border border-[#ffb4ab]/20 shadow-sm cursor-pointer"
            >
              <div className="w-14 h-14 min-w-[48px] min-h-[48px] rounded-full bg-[#ffb4ab] text-[#690005] flex items-center justify-center shadow-[0_10px_25px_rgba(255,180,171,0.25)]">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#ffb4ab] font-semibold">Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={() => {
                triggerHaptic('heavy');
                onAccept();
              }}
              id="accept-call-btn"
              className="area-tap flex-1 min-h-[72px] flex flex-col items-center justify-center gap-2 py-4 rounded-3xl bg-[#adc6ff] hover:bg-[#d8e2ff] active:scale-95 transition-all shadow-[0_15px_35px_rgba(173,198,255,0.25)] cursor-pointer"
            >
              <div className="w-14 h-14 min-w-[48px] min-h-[48px] rounded-full bg-[#002e6a] text-[#adc6ff] flex items-center justify-center">
                <Phone className="w-6 h-6 animate-bounce" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#002e6a] font-bold">Accept</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active / Outgoing Connected Audio Call */
        <div className="w-full max-w-sm flex flex-col items-center justify-between min-h-[580px] z-10 animate-scale-up">
          {/* Top Status & Avatar */}
          <div className="flex-1 flex flex-col items-center justify-center text-center pt-6">
            <div className="w-32 h-32 rounded-full bg-[#222a3d] flex items-center justify-center mb-4 shadow-2xl relative border border-white/10">
              {/* Dynamic Sound wave glow */}
              <div
                className="absolute inset-0 rounded-full bg-[#adc6ff]/20 blur-xl transition-all duration-150"
                style={{
                  transform: `scale(${1 + audioActivity * 0.8})`,
                  opacity: 0.3 + audioActivity * 0.7,
                }}
              />
              <span className="text-4xl relative z-10">👤</span>
            </div>

            <h1 className="text-2xl font-bold text-[#dae2fd] mb-1">
              Audio Call
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-[#c2c6d6] mb-4">
              <span className="w-2 h-2 rounded-full bg-[#ffb786] pulsate"></span>
              <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono font-light tracking-widest text-[#adc6ff] tabular-nums" id="call-timer">
              {isConnected ? formatDuration(callDuration) : '00:00'}
            </div>

            {callError && (
              <div className="mt-4 px-3.5 py-1.5 bg-[#93000a]/40 border border-[#ffb4ab]/30 text-[#ffdad6] text-xs font-mono rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#ffb4ab]" />
                <span>{callError}</span>
              </div>
            )}
          </div>

          {/* Floating Rounded Bottom Dock */}
          <div className="w-full pb-safe pt-6 flex justify-center">
            <div className="flex items-center justify-center gap-4 bg-[#131b2e]/90 backdrop-blur-2xl px-5 py-3 rounded-full shadow-2xl border border-white/10">
              {/* Mute Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleMute();
                }}
                id="btn-mute"
                className={`area-tap w-14 h-14 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md cursor-pointer ${
                  isMuted
                    ? 'bg-[#4d8eff] text-[#00285d]'
                    : 'bg-[#171f33] text-[#dae2fd] hover:bg-[#222a3d]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onEndCall();
                }}
                id="btn-end"
                className="area-tap w-18 h-18 min-w-[48px] min-h-[48px] rounded-full bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_4px_24px_rgba(255,180,171,0.35)] shrink-0 cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* Speaker Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleSpeaker();
                }}
                id="btn-speaker"
                className={`area-tap w-14 h-14 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md cursor-pointer ${
                  isSpeaker
                    ? 'bg-[#4d8eff] text-[#00285d]'
                    : 'bg-[#171f33] text-[#dae2fd] hover:bg-[#222a3d]'
                }`}
                title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
              >
                {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
