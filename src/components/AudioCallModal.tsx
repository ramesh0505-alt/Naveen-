import React, { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, AlertCircle } from 'lucide-react';
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

  return (
    <div
      id="audio-call-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/90 backdrop-blur-2xl animate-fade-in select-none font-sans overflow-hidden"
    >
      {/* Mounted audio element for remote WebRTC stream playback */}
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

      <div
        id="audio-call-modal-card"
        className="w-full max-w-sm bg-[#131b2e]/90 border border-white/10 rounded-[36px] shadow-2xl p-8 text-center flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Background Pulses */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div
            className="absolute w-[300px] h-[300px] rounded-full bg-[#adc6ff]/20 blur-3xl transition-transform duration-300"
            style={{
              transform: `scale(${1 + audioActivity * 1.5})`,
            }}
          />
          <div className="absolute w-[360px] h-[360px] rounded-full bg-[#ffb786]/10 blur-3xl" />
        </div>

        {/* Top Header Information: Status & Duration */}
        <div className="flex flex-col items-center justify-center pt-2 z-10 space-y-1">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171f33] border border-white/5 text-[11px] font-mono text-[#adc6ff]">
            <Shield className="w-3.5 h-3.5" />
            <span className="tracking-widest uppercase">
              {isConnected ? 'Connected' : isIncoming ? 'Incoming Call' : 'Connecting...'}
            </span>
          </div>

          <span id="call-timer" className="text-3xl font-light tracking-widest tabular-nums text-[#dae2fd] pt-1">
            {isConnected ? formatDuration(callDuration) : '--:--'}
          </span>
        </div>

        {/* Central Visualizer with Orbiting Particle Rings */}
        <div className="flex-1 flex items-center justify-center z-10 relative px-4 my-6">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full bg-[#171f33] shadow-[0_0_40px_rgba(173,198,255,0.05)] border border-white/5 flex items-center justify-center">
              {/* Inner Circle */}
              <div className="w-3/4 h-3/4 rounded-full bg-[#222a3d] shadow-[0_0_60px_rgba(173,198,255,0.1)] border border-white/10 flex items-center justify-center relative overflow-hidden">
                {/* Dynamic Inner Glow based on speech */}
                <div
                  className="absolute inset-0 bg-[#adc6ff]/20 mix-blend-screen transition-all duration-150 ease-out"
                  style={{
                    transform: `scale(${1 + audioActivity * 0.4})`,
                    opacity: 0.2 + audioActivity * 0.6,
                  }}
                />
                <Mic className="w-10 h-10 text-[#adc6ff] relative z-10 drop-shadow-[0_0_10px_rgba(173,198,255,0.5)]" />
              </div>
            </div>

            {/* Orbital SVG Circles */}
            <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
              <circle className="text-white/10" cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3"></circle>
              <g className="origin-center animate-[spin_8s_linear_infinite]">
                <circle className="text-[#adc6ff]" cx="50" cy="2" fill="currentColor" r="2.5"></circle>
              </g>
              <g className="origin-center animate-[spin_12s_linear_infinite_reverse]">
                <circle className="text-[#ffb786]" cx="98" cy="50" fill="currentColor" r="2"></circle>
              </g>
            </svg>
          </div>
        </div>

        {/* Error Notice if any */}
        {callError && (
          <div className="mb-4 px-3 py-2 bg-[#93000a]/50 border border-[#ffb4ab]/30 text-[#ffdad6] text-xs font-mono rounded-xl flex items-center gap-2 max-w-xs text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#ffb4ab]" />
            <span>{callError}</span>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="w-full z-10 pt-2">
          {isIncoming ? (
            /* Incoming Call: Decline or Accept */
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onReject();
                }}
                id="reject-call-btn"
                className="w-16 h-16 rounded-full bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] flex items-center justify-center transition-transform active:scale-90 shadow-xl cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onAccept();
                }}
                id="accept-call-btn"
                className="w-16 h-16 rounded-full bg-[#adc6ff] text-[#002e6a] hover:bg-[#4d8eff] flex items-center justify-center transition-transform active:scale-90 animate-bounce shadow-xl cursor-pointer"
                title="Accept"
              >
                <Phone className="w-7 h-7" />
              </button>
            </div>
          ) : isConnected ? (
            /* Connected Call Controls: Speaker, End Call, Mute */
            <div className="flex items-center justify-center gap-6">
              {/* Speaker Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleSpeaker();
                }}
                id="call-speaker-toggle-btn"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md cursor-pointer ${
                  isSpeaker
                    ? 'bg-[#4d8eff] text-[#00285d]'
                    : 'bg-[#171f33] text-[#c2c6d6] hover:bg-[#222a3d]'
                }`}
                title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
              >
                {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onEndCall();
                }}
                id="hangup-call-btn"
                className="w-18 h-18 rounded-full bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] flex items-center justify-center active:scale-90 transition-all duration-300 shadow-[0_8px_32px_rgba(255,180,171,0.3)] cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              {/* Mute Toggle */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleMute();
                }}
                id="call-mute-toggle-btn"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md cursor-pointer ${
                  isMuted
                    ? 'bg-[#93000a] text-[#ffdad6]'
                    : 'bg-[#171f33] text-[#c2c6d6] hover:bg-[#222a3d]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
          ) : isOutgoing ? (
            /* Outgoing Calling */
            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onEndCall();
                }}
                id="cancel-outgoing-call-btn"
                className="w-16 h-16 rounded-full bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] flex items-center justify-center transition-transform active:scale-90 shadow-xl cursor-pointer"
                title="Cancel Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          ) : (
            /* Call Ended / Dismiss */
            <button
              onClick={onEndCall}
              id="dismiss-call-btn"
              className="w-full py-3.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border border-white/5"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
