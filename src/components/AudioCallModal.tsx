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

const CALL_AVATAR_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDBu3k9eACD8ZcV9qI46cCNiojvIB8niwH1JcK9xqTbLis_FhJaVRPtQIOsNXlcs4TyuyEasGfggRUy4WOqj5h2BTUXVlH0eIgcgk4WUxg-HnXjT1FevrX7EjSc0IXXt8_XRJ1LlmGg8y87ng7qje4XREbnCsQgmBiVproq5Oj9nU8ruobifapZ8KXodmEXBT7DKiDS9cmS3z58VnIq0zsAys-tP4cLRsWwO_bAk5F0-w3g1Ta9ZqXK';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState<boolean>(false);

  useEffect(() => {
    if (onBindAudioElement) {
      onBindAudioElement(remoteAudioRef.current);
    }
  }, [onBindAudioElement, callState]);

  // Live Canvas Wave Visualizer
  useEffect(() => {
    if (callState === 'IDLE') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const centerY = h / 2;

      ctx.clearRect(0, 0, w, h);

      const activity = Math.max(localVolume, remoteVolume, 0.08);

      // Primary wave
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < w; i += 2) {
        const noise = Math.sin(i * 0.015 + time * 1.5) * Math.sin(i * 0.005 - time * 0.3);
        const amplitude = Math.sin(Math.PI * (i / w));
        const y = centerY + noise * (40 + activity * 80) * amplitude;
        ctx.lineTo(i, y);
      }
      ctx.strokeStyle = '#c7c6cb';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.stroke();

      // Secondary wave
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      for (let i = 0; i < w; i += 2) {
        const noise = Math.sin(i * 0.01 + time * 0.8) * Math.sin(i * 0.008 + time * 0.5);
        const amplitude = Math.sin(Math.PI * (i / w));
        const y = centerY + noise * (60 + activity * 100) * amplitude;
        ctx.lineTo(i, y);
      }
      ctx.strokeStyle = '#ffb3af';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();

      ctx.globalAlpha = 1.0;
      time += 0.035;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [callState, localVolume, remoteVolume]);

  if (callState === 'IDLE') return null;

  const isIncoming = callState === 'RINGING';
  const isConnected = callState === 'CONNECTED';

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

  const participantLabel =
    otherRole === 'owner' ? 'Host Identity' : otherRole === 'guest' ? 'Guest Identity' : 'Elena Rostova';

  return (
    <div
      id="audio-call-modal-overlay"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#111318] text-[#e2e2e9] animate-fade-in select-none overflow-hidden"
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

      {/* Header */}
      <header className="w-full bg-[#1a1b21]/90 backdrop-blur-xl pt-safe border-b border-white/5">
        <div className="h-20 flex items-center justify-between px-6 max-w-2xl mx-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffb3af] animate-pulse"></span>
              <span className="font-label-md text-xs text-[#ffb3af] uppercase tracking-widest font-semibold">
                Room View
              </span>
            </div>
            <h2 className="font-display-sm text-xl text-[#e2e2e9]">Participant Identity</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerHaptic('light')}
              className="w-10 h-10 rounded-full bg-[#33353a] flex items-center justify-center text-[#e2e2e9] hover:bg-[#282a2f] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">call</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full relative">
        {isMicDenied ? (
          /* Mic Permission Denied View */
          <div className="w-full bg-[#1e2025] rounded-[28px] p-7 flex flex-col items-center text-center shadow-2xl border border-white/10 animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-[#93000a]/20 flex items-center justify-center mb-4 border border-[#ffb4ab]/30">
              <span className="material-symbols-outlined text-[#ffb4ab] text-[32px]">mic_off</span>
            </div>
            <h1 className="font-display-sm text-2xl text-[#e2e2e9] mb-2">Microphone Required</h1>
            <p className="font-body-md text-xs text-[#c7c6cb] mb-6 max-w-xs leading-relaxed">
              Please allow microphone access to participate in end-to-end encrypted audio calls.
            </p>
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleGrantPermission}
                disabled={isRequestingMic}
                className="w-full py-3.5 rounded-full bg-[#c7c6ca] text-[#303034] font-label-md font-bold text-sm hover:bg-[#e3e2e6] transition-all cursor-pointer shadow-md"
              >
                <span>Grant Permission</span>
              </button>
              <button
                onClick={onEndCall}
                className="w-full py-3.5 rounded-full bg-[#33353a] text-[#c7c6cb] hover:text-[#e2e2e9] font-label-md font-semibold text-sm transition-colors border border-white/5 cursor-pointer"
              >
                Return to Chat
              </button>
            </div>
          </div>
        ) : isIncoming ? (
          /* Incoming Call Ringing View */
          <div className="flex flex-col items-center gap-6 text-center animate-scale-up">
            <div className="w-36 h-36 rounded-full relative shadow-2xl overflow-hidden border border-white/10">
              <img
                src={CALL_AVATAR_IMAGE}
                alt="Partner Identity"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-full border-2 border-[#ffb3af]/60 animate-ping opacity-50"></div>
            </div>
            <div>
              <h1 className="font-display-sm text-3xl text-[#e2e2e9] mb-2">{participantLabel}</h1>
              <p className="font-label-sm text-xs text-[#c7c6cb] uppercase tracking-widest">
                Incoming Private Audio Call...
              </p>
            </div>

            {/* Accept / Decline Action Buttons */}
            <div className="flex w-full gap-5 mt-4">
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onReject();
                }}
                className="flex-1 py-4 px-6 rounded-full bg-[#33353a] hover:bg-[#282a2f] text-[#ffb4ab] font-label-md flex items-center justify-center gap-2 border border-white/5 cursor-pointer transition-all active:scale-95 shadow-md font-semibold"
              >
                <span className="material-symbols-outlined text-[20px]">call_end</span>
                <span>Decline</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onAccept();
                }}
                className="flex-1 py-4 px-6 rounded-full bg-[#ffb3af] text-[#230002] font-label-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-lg font-bold hover:bg-[#ffdad7]"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
                <span>Accept</span>
              </button>
            </div>
          </div>
        ) : (
          /* Connected / Outgoing Call View */
          <div className="flex flex-col items-center justify-center w-full">
            {/* Editorial Portrait Avatar with pulse indicator */}
            <div className="w-36 h-36 rounded-full mb-6 relative shadow-2xl border border-white/10 overflow-hidden">
              <img
                src={CALL_AVATAR_IMAGE}
                alt="Partner Identity"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#1e2025] flex items-center justify-center z-20 border-2 border-[#111318] shadow-md">
                <span className="w-3.5 h-3.5 rounded-full bg-[#ffb3af] animate-pulse"></span>
              </div>
            </div>

            <h1 className="font-display-sm text-3xl text-[#e2e2e9] mb-2 tracking-wide">
              {participantLabel}
            </h1>

            <p
              className="font-label-sm text-sm text-[#c7c6cb] tracking-[0.2em] uppercase opacity-80 mb-6 font-mono"
              id="call-duration"
            >
              {isConnected ? formatDuration(callDuration) : 'Connecting...'}
            </p>

            {/* Live Audio Visualizer Canvas */}
            <div className="w-full h-32 relative flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full opacity-80" />
            </div>

            {callError && (
              <div className="mt-2 px-4 py-1.5 bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-xs font-mono rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{callError}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Controls Bar */}
      <div className="w-full pb-10 pt-6 bg-gradient-to-t from-[#111318] via-[#111318] to-transparent z-10">
        <div className="flex items-center justify-center gap-7">
          {/* Mute Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleMute();
            }}
            id="btn-mute"
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer ${
              isMuted
                ? 'bg-[#ffb3af] text-[#230002]'
                : 'bg-[#33353a] text-[#e2e2e9] hover:bg-[#282a2f]'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="material-symbols-outlined text-[26px]">
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
            className="w-20 h-20 rounded-full bg-[#ffb3af] flex items-center justify-center text-[#230002] hover:bg-[#ffdad7] transition-all active:scale-95 shadow-xl hover:shadow-[#ffb3af]/20 cursor-pointer"
            title="End Call"
          >
            <span className="material-symbols-outlined text-4xl">call_end</span>
          </button>

          {/* Speaker Toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onToggleSpeaker();
            }}
            id="btn-speaker"
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md cursor-pointer ${
              isSpeaker
                ? 'bg-[#ffb3af] text-[#230002]'
                : 'bg-[#33353a] text-[#e2e2e9] hover:bg-[#282a2f]'
            }`}
            title={isSpeaker ? 'Speaker On' : 'Speaker Off'}
          >
            <span className="material-symbols-outlined text-[26px]">
              {isSpeaker ? 'volume_up' : 'volume_off'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
