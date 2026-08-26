import React, { useState } from 'react';
import { KeyRound, Check, Copy, ArrowRight, ShieldCheck, Lock, Sparkles, Loader2, X } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { copyToClipboard, getRoomFullUrl } from '../utils/helpers';

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
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsGenerating(true);
    setError(null);

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
    } catch (err: any) {
      setError(err.message || 'Failed to establish room.');
    } finally {
      setIsGenerating(false);
    }
  };

  const roomUrl = createdData ? getRoomFullUrl(createdData.roomCode) : '';

  const handleCopyLink = async () => {
    if (!roomUrl) return;
    const ok = await copyToClipboard(roomUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = async () => {
    if (!createdData?.pin) return;
    const ok = await copyToClipboard(createdData.pin);
    if (ok) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleEnter = () => {
    if (!createdData) return;
    onRoomCreated({
      roomCode: createdData.roomCode,
      pin: createdData.pin,
      sessionToken: createdData.sessionToken,
      role: 'owner',
      expiresAt: createdData.expiresAt,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/85 backdrop-blur-xl animate-fade-in font-sans">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-25 flex justify-center items-center overflow-hidden">
        <div className="w-[500px] h-[500px] rounded-full bg-[#4d8eff]/20 blur-[100px] animate-pulse"></div>
      </div>

      {/* Main Card Container */}
      <div
        id="card-container"
        className="relative z-10 w-full max-w-sm bg-[#171f33]/80 backdrop-blur-3xl rounded-[32px] p-7 sm:p-8 shadow-[0_32px_64px_rgba(0,0,0,0.6)] flex flex-col items-center text-center border border-white/5 animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button Top-Right */}
        <button
          onClick={onClose}
          id="close-create-modal-btn"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#222a3d]/80 text-[#c2c6d6] hover:text-[#dae2fd] hover:bg-[#2d3449] flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Icon */}
        <div
          id="header-icon"
          className="w-16 h-16 rounded-full bg-[#4d8eff]/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(77,142,255,0.2)] transition-all duration-300"
        >
          {createdData ? (
            <Lock className="w-8 h-8 text-[#adc6ff]" />
          ) : (
            <KeyRound className="w-8 h-8 text-[#adc6ff]" />
          )}
        </div>

        {error && (
          <div className="w-full p-3.5 mb-4 rounded-2xl bg-[#93000a]/40 border border-[#ffb4ab]/30 text-xs text-[#ffdad6] text-left font-mono">
            {error}
          </div>
        )}

        {!createdData ? (
          /* Initial Create Space State */
          <div id="initial-state" className="w-full flex flex-col items-center">
            <h1 className="text-2xl font-semibold text-[#dae2fd] mb-2 tracking-tight">
              Create Private Room
            </h1>
            <p className="text-sm text-[#c2c6d6] mb-8 px-2 leading-relaxed">
              Establish a secure, ephemeral space for you and one other person.
            </p>

            <button
              onClick={handleCreate}
              disabled={isGenerating}
              id="create-space-btn"
              className="w-full py-4 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base shadow-[0_8px_24px_rgba(173,198,255,0.25)] hover:bg-[#adc6ff]/90 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Initiating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Create Space</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Created State with Link & PIN */
          <div id="created-state" className="w-full flex flex-col items-center animate-fade-in">
            <div className="inline-flex items-center gap-1.5 bg-[#4d8eff]/15 border border-[#4d8eff]/30 px-3.5 py-1.5 rounded-full mb-4">
              <ShieldCheck className="w-4 h-4 text-[#adc6ff]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#adc6ff]">
                Room Established
              </span>
            </div>

            <h2 className="text-lg font-medium text-[#dae2fd] mb-5">
              Ready for connection.
            </h2>

            {/* Link Section */}
            <div className="w-full bg-[#222a3d] rounded-2xl p-4 mb-3 text-left">
              <p className="text-xs font-medium text-[#c2c6d6] mb-1.5 uppercase tracking-wider">
                Secure Link
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono text-[#dae2fd] truncate select-all">
                  {roomUrl.replace(/^https?:\/\//, '')}
                </span>
                <button
                  onClick={handleCopyLink}
                  id="copy-created-link-btn"
                  className="w-9 h-9 rounded-full bg-[#2d3449] flex items-center justify-center text-[#dae2fd] hover:text-[#adc6ff] hover:bg-[#4d8eff]/20 transition-colors shrink-0 cursor-pointer"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-[#adc6ff]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* PIN Section */}
            <div className="w-full bg-[#222a3d] rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs font-medium text-[#c2c6d6] mb-1.5 uppercase tracking-wider">
                Access PIN
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold tracking-widest text-[#adc6ff] select-all">
                  {createdData.pin}
                </span>
                <button
                  onClick={handleCopyPin}
                  id="copy-created-pin-btn"
                  className="w-9 h-9 rounded-full bg-[#2d3449] flex items-center justify-center text-[#dae2fd] hover:text-[#adc6ff] hover:bg-[#4d8eff]/20 transition-colors shrink-0 cursor-pointer"
                  title="Copy PIN"
                >
                  {copiedPin ? <Check className="w-4 h-4 text-[#adc6ff]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Enter Room Button */}
            <button
              onClick={handleEnter}
              id="enter-created-room-btn"
              className="w-full py-4 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base shadow-[0_8px_24px_rgba(173,198,255,0.25)] hover:bg-[#adc6ff]/90 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enter Room</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
