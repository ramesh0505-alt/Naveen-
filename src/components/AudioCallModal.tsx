import React, { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, AlertCircle } from 'lucide-react';
import type { CallState, MemberRole } from '../types';
import { formatDuration } from '../utils/helpers';

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
  const isEnded = ['ENDED', 'REJECTED', 'BUSY', 'TIMEOUT', 'DISCONNECTED', 'FAILED'].includes(callState);

  const callerTitle = otherRole === 'owner' ? 'Room Owner' : 'Room Guest';

  return (
    <div
      id="audio-call-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none font-sans"
    >
      {/* Mounted audio element for remote audio stream playback (avoid display:none so browsers render WebRTC audio) */}
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
        className="w-full max-w-sm bg-[#141414] border border-[#2A2A2A] shadow-2xl p-7 text-center flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Activity Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div
            className={`w-64 h-64 rounded-full absolute -top-10 -left-10 filter blur-3xl transition-transform duration-300 ${
              isConnected ? 'bg-emerald-500' : isIncoming ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{
              transform: `scale(${1 + Math.max(localVolume, remoteVolume) * 2.5})`,
            }}
          />
        </div>

        {/* Top Header Information */}
        <div className="w-full flex items-center justify-between text-xs font-mono text-[#888] relative z-10">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1A1A] border border-[#333] text-[#CCC]">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>P2P ENCRYPTED</span>
          </span>
          {isConnected && (
            <span className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
              <span className="w-2 h-2 bg-emerald-400 animate-ping"></span>
              {formatDuration(callDuration)}
            </span>
          )}
        </div>

        {/* Center Visual Call State */}
        <div className="my-auto py-4 flex flex-col items-center relative z-10 w-full">
          <div className="relative mb-5">
            {/* Dynamic volume pulse rings */}
            {isConnected && (
              <>
                <div
                  className="absolute -inset-4 border border-emerald-500/30 transition-transform duration-75"
                  style={{ transform: `scale(${1 + remoteVolume * 1.6})` }}
                />
                <div
                  className="absolute -inset-8 border border-emerald-500/15 transition-transform duration-75"
                  style={{ transform: `scale(${1 + remoteVolume * 2.2})` }}
                />
              </>
            )}

            {isIncoming && (
              <div className="absolute -inset-4 bg-emerald-500/20 animate-ping" />
            )}

            {isOutgoing && (
              <div className="absolute -inset-4 bg-white/10 animate-pulse" />
            )}

            <div className="w-20 h-20 bg-[#1C1C1C] border border-[#333] flex items-center justify-center text-white shadow-xl relative z-10">
              <Phone
                className={`w-8 h-8 ${
                  isConnected
                    ? 'text-emerald-400'
                    : isIncoming
                    ? 'text-emerald-400 animate-bounce'
                    : 'text-[#DDD]'
                }`}
              />
            </div>
          </div>

          <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-1">
            {callerTitle}
          </h2>

          <p className="text-xs font-mono tracking-wide text-[#999] uppercase">
            {isIncoming && 'Incoming Audio Call...'}
            {isOutgoing && 'Calling Peer...'}
            {isConnected && 'Live Call Connected'}
            {callState === 'REJECTED' && 'Call Declined'}
            {callState === 'BUSY' && 'Peer Busy'}
            {callState === 'TIMEOUT' && 'No Answer'}
            {callState === 'DISCONNECTED' && 'Call Disconnected'}
            {callState === 'ENDED' && 'Call Ended'}
            {callState === 'FAILED' && 'Connection Failed'}
          </p>

          {/* Error Message Display */}
          {callError && (
            <div className="mt-3 px-3 py-2 bg-red-950/60 border border-red-800 text-red-300 text-[11px] font-mono flex items-center gap-2 max-w-xs text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{callError}</span>
            </div>
          )}

          {/* Voice Spectrum Indicator */}
          {isConnected && (
            <div className="mt-5 w-full max-w-[200px] flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-1.5 h-6 w-full">
                {[0.2, 0.4, 0.8, 1.0, 0.7, 0.5, 0.9, 0.6, 0.3, 0.7, 0.4].map((factor, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-emerald-400 transition-all duration-75"
                    style={{
                      height: `${Math.max(4, remoteVolume * factor * 22 + 4)}px`,
                    }}
                  />
                ))}
              </div>
              <div className="text-[10px] font-mono text-[#666] flex items-center justify-between w-full px-1">
                <span>Mic: {isMuted ? 'Muted' : Math.round(localVolume * 100) + '%'}</span>
                <span>Peer: {Math.round(remoteVolume * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full relative z-10 pt-2">
          {isIncoming ? (
            /* Incoming Call: Decline or Accept */
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={onReject}
                id="reject-call-btn"
                className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={onAccept}
                id="accept-call-btn"
                className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition-transform active:scale-90 animate-bounce cursor-pointer shadow-lg"
                title="Accept"
              >
                <Phone className="w-6 h-6" />
              </button>
            </div>
          ) : isConnected ? (
            /* Connected Call Controls: Mute, Hang Up, Speaker */
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={onToggleMute}
                id="call-mute-toggle-btn"
                className={`w-12 h-12 flex items-center justify-center transition-all cursor-pointer border ${
                  isMuted
                    ? 'bg-amber-950/60 text-amber-400 border-amber-600'
                    : 'bg-[#1C1C1C] text-[#CCC] border-[#333] hover:border-[#555] hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={onEndCall}
                id="hangup-call-btn"
                className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={onToggleSpeaker}
                id="call-speaker-toggle-btn"
                className={`w-12 h-12 flex items-center justify-center transition-all cursor-pointer border ${
                  isSpeaker
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600'
                    : 'bg-[#1C1C1C] text-[#CCC] border-[#333] hover:border-[#555] hover:text-white'
                }`}
                title={isSpeaker ? 'Switch to earpiece' : 'Speaker mode'}
              >
                {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          ) : isOutgoing ? (
            /* Outgoing Calling */
            <div className="flex items-center justify-center">
              <button
                onClick={onEndCall}
                id="cancel-outgoing-call-btn"
                className="w-14 h-14 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-lg"
                title="Cancel Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          ) : (
            /* Call Ended / Dismiss */
            <button
              onClick={onEndCall}
              id="dismiss-call-btn"
              className="w-full py-3 bg-[#222] hover:bg-[#333] text-white text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer border border-[#333]"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

