import React, { useState } from 'react';
import {
  KeyRound,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  Share2,
  LogIn,
  Loader2,
  X,
  Lock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { copyToClipboard, getRoomFullUrl, triggerHaptic } from '../utils/helpers';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (data: {
    roomCode: string;
    pin: string;
    sessionToken: string;
    role: 'owner';
    expiresAt: number;
  }) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [createdData, setCreatedData] = useState<{
    roomCode: string;
    pin: string;
    sessionToken: string;
    expiresAt: number;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreate = async () => {
    setIsGenerating(true);
    setError(null);
    triggerHaptic('medium');

    try {
      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationHours: 24,
          defaultMessageExpiration: 0,
        }),
      });

      setCreatedData({
        roomCode: data.roomCode,
        pin: data.pin,
        sessionToken: data.sessionToken,
        expiresAt: data.expiresAt,
      });
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || 'Failed to establish room.');
      triggerHaptic('warning');
    } finally {
      setIsGenerating(false);
    }
  };

  const roomUrl = createdData ? getRoomFullUrl(createdData.roomCode) : '';

  const handleCopyLink = async () => {
    if (!roomUrl) return;
    triggerHaptic('light');
    const ok = await copyToClipboard(roomUrl);
    if (ok) {
      setCopiedLink(true);
      showToast('Link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = async () => {
    if (!createdData?.pin) return;
    triggerHaptic('light');
    const ok = await copyToClipboard(createdData.pin);
    if (ok) {
      setCopiedPin(true);
      showToast('PIN copied to clipboard');
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleShareDetails = async () => {
    if (!createdData) return;
    triggerHaptic('light');
    const text = `Private 2-person space\nLink: ${roomUrl}\nAccess PIN: ${createdData.pin}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my private room',
          text,
          url: roomUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast('Room details copied to clipboard');
    }
  };

  const handleEnter = () => {
    if (!createdData) return;
    triggerHaptic('medium');
    onRoomCreated({
      roomCode: createdData.roomCode,
      pin: createdData.pin,
      sessionToken: createdData.sessionToken,
      role: 'owner',
      expiresAt: createdData.expiresAt,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/85 backdrop-blur-2xl animate-fade-in font-sans selection:bg-[#4d8eff]/30 selection:text-white">
      {/* Ambient Background Glow Effect */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-30">
        <div className="w-[450px] h-[450px] rounded-full bg-[#adc6ff]/15 blur-[90px] animate-pulse"></div>
      </div>

      {/* Main Card Container */}
      <div
        id="room-card"
        className="w-full max-w-sm relative z-10 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
        role="dialog"
        aria-modal="true"
      >
        {/* Glassmorphism Card Surface */}
        <div className="bg-[#171f33]/85 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden border border-white/10">
          {/* Subtle Top Edge Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>

          {/* Close Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            id="close-create-modal-btn"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#222a3d]/80 text-[#c2c6d6] hover:text-[#dae2fd] hover:bg-[#2d3449] flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {error && (
            <div className="w-full p-3 mb-4 rounded-xl bg-[#93000a]/40 border border-[#ffb4ab]/30 text-xs text-[#ffdad6] text-left font-mono">
              {error}
            </div>
          )}

          {!createdData ? (
            /* Initial State */
            <div className="flex flex-col items-center text-center py-2" id="initial-state">
              <div className="w-16 h-16 rounded-full bg-[#3e495d]/50 flex items-center justify-center mb-4 shadow-inner border border-white/5">
                <KeyRound className="w-8 h-8 text-[#adc6ff]" />
              </div>

              <h1 className="text-2xl font-semibold text-[#dae2fd] mb-2 tracking-tight">
                Create Private Room
              </h1>
              <p className="text-sm text-[#c2c6d6] mb-8 leading-relaxed px-2">
                Create a secure communication space for exactly two people.
              </p>

              <button
                onClick={handleCreate}
                disabled={isGenerating}
                id="create-btn"
                className="w-full py-4 px-6 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base shadow-[0_0_20px_rgba(173,198,255,0.25)] hover:shadow-[0_0_30px_rgba(173,198,255,0.45)] hover:bg-[#d8e2ff] transition-all active:scale-95 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Establishing...</span>
                  </>
                ) : (
                  <>
                    <span>Create Room</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Success State */
            <div className="flex flex-col animate-fade-in py-1" id="success-state">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#adc6ff]/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-[#adc6ff]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#dae2fd] uppercase tracking-wider">
                    Room Created
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ffb786] pulsate"></div>
                    <span className="text-[11px] font-mono text-[#ffb786] font-medium">
                      Expires in 23:59:59
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {/* Shareable Link Field */}
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#c2c6d6] ml-2">
                    Shareable Link
                  </span>
                  <div className="flex items-center bg-[#222a3d]/70 rounded-xl p-1 pl-4 group hover:bg-[#222a3d] transition-colors border border-white/5">
                    <span className="text-sm font-mono text-[#adc6ff] truncate flex-1 select-all">
                      {roomUrl.replace(/^https?:\/\//, '')}
                    </span>
                    <button
                      aria-label="Copy Link"
                      onClick={handleCopyLink}
                      id="copy-created-link-btn"
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-[#c2c6d6] hover:text-[#adc6ff] hover:bg-[#adc6ff]/10 transition-colors cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-[#adc6ff]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Access PIN Field */}
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#c2c6d6] ml-2">
                    Access PIN
                  </span>
                  <div className="flex items-center bg-[#222a3d]/70 rounded-xl p-1 pl-4 group hover:bg-[#222a3d] transition-colors border border-white/5">
                    <span className="text-xl font-mono font-bold tracking-[0.25em] text-[#dae2fd] flex-1 select-all">
                      {createdData.pin}
                    </span>
                    <button
                      aria-label="Copy PIN"
                      onClick={handleCopyPin}
                      id="copy-created-pin-btn"
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-[#c2c6d6] hover:text-[#adc6ff] hover:bg-[#adc6ff]/10 transition-colors cursor-pointer"
                    >
                      {copiedPin ? <Check className="w-4 h-4 text-[#adc6ff]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleEnter}
                  id="enter-created-room-btn"
                  className="w-full py-3.5 px-6 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base shadow-[0_0_20px_rgba(173,198,255,0.25)] hover:shadow-[0_0_30px_rgba(173,198,255,0.45)] hover:bg-[#d8e2ff] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Enter Room</span>
                </button>

                <button
                  onClick={handleShareDetails}
                  id="share-details-btn"
                  className="w-full py-3 px-6 rounded-full bg-transparent text-[#adc6ff] font-semibold text-sm hover:bg-[#adc6ff]/10 transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#adc6ff]/20 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Details</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#2d3449] text-[#dae2fd] px-5 py-2.5 rounded-full text-xs font-mono shadow-2xl z-50 flex items-center gap-2 border border-white/10 animate-fade-in">
          <Check className="w-4 h-4 text-[#adc6ff]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
