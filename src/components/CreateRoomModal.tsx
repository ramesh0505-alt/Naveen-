import React, { useState } from 'react';
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

const DURATIONS = [
  { label: '10 MIN', value: 1 / 6 },
  { label: '12 HR', value: 12 },
  { label: '24 HR', value: 24 },
  { label: '2 D', value: 48 },
  { label: '3 D', value: 72 },
  { label: '7 D', value: 168 },
  { label: '20 D', value: 480 },
];

const AUTO_DELETE_OPTIONS = [
  { label: 'OFF', value: 0 },
  { label: '30 S', value: 30 },
  { label: '1 M', value: 60 },
  { label: '5 M', value: 300 },
  { label: '30 M', value: 1800 },
  { label: '1 HR', value: 3600 },
  { label: '24 HR', value: 86400 },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(24);
  const [selectedAutoDelete, setSelectedAutoDelete] = useState<number>(0);
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
          durationHours: selectedDuration,
          defaultMessageExpiration: selectedAutoDelete,
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
        // Fallback
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/90 backdrop-blur-2xl animate-fade-in select-none">
      {/* Main Modal Card */}
      <div
        id="room-card"
        className="w-full max-w-lg relative z-10 bg-[#121419] border border-[#272A31] rounded-[28px] p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          id="close-create-modal-btn"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#181B21] text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#272A31] flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {error && (
          <div className="w-full p-3 mb-4 rounded-xl bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 text-xs text-[#FF5C5C] text-left font-mono">
            {error}
          </div>
        )}

        {!createdData ? (
          /* Initial Configuration State */
          <div className="flex flex-col text-left py-1" id="initial-state">
            <h1 className="font-editorial text-2xl text-[#F5F3EE] mb-1.5 tracking-tight">
              Create Private Room
            </h1>
            <p className="font-body-sm text-xs text-[#9B9DA3] mb-5 leading-relaxed">
              Configure your ephemeral space. When the duration ends or either person leaves, all data vanishes.
            </p>

            {/* Room Duration Selection */}
            <div className="mb-5">
              <span className="font-label-sm text-[11px] text-[#E8D8B8] uppercase tracking-wider block mb-2 font-semibold font-mono">
                Room Duration
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((dur) => {
                  const isActive = selectedDuration === dur.value;
                  return (
                    <button
                      key={dur.label}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedDuration(dur.value);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E8D8B8] text-[#121419] shadow-sm'
                          : 'bg-[#181B21] text-[#F5F3EE] border border-[#272A31] hover:border-[#E8D8B8]/50'
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Auto-Delete Selection */}
            <div className="mb-5">
              <span className="font-label-sm text-[11px] text-[#E8D8B8] uppercase tracking-wider block mb-0.5 font-semibold font-mono">
                Message Auto-Delete
              </span>
              <span className="text-[11px] text-[#9B9DA3] block mb-2">
                Messages disappear after they are read or after this time
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AUTO_DELETE_OPTIONS.map((opt) => {
                  const isActive = selectedAutoDelete === opt.value;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedAutoDelete(opt.value);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E8D8B8] text-[#121419] shadow-sm'
                          : 'bg-[#181B21] text-[#F5F3EE] border border-[#272A31] hover:border-[#E8D8B8]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary / Encryption Card */}
            <div className="p-3.5 rounded-2xl bg-[#181B21] border border-[#272A31] flex items-start gap-3 mb-6">
              <span className="material-symbols-outlined text-[#E8D8B8] text-[20px] mt-0.5">vpn_key</span>
              <div>
                <h4 className="font-label-md text-xs text-[#F5F3EE] font-semibold">End-to-End Encrypted Space</h4>
                <p className="font-body-sm text-[11px] text-[#9B9DA3] mt-0.5">
                  Room PIN will be generated upon creation. Only two devices can connect simultaneously.
                </p>
              </div>
            </div>

            {/* Create CTA */}
            <button
              onClick={handleCreate}
              disabled={isGenerating}
              id="create-btn"
              className="w-full py-3 px-5 rounded-full bg-[#E8D8B8] hover:bg-[#F0E3C8] text-[#121419] font-label-md font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <span>Establishing Space...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Create Private Room</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Room Created Success State */
          <div className="flex flex-col text-left animate-fade-in py-1" id="success-state">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#7ED6A5]/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#7ED6A5] text-[20px]">check_circle</span>
              </div>
              <div>
                <h2 className="font-editorial text-2xl text-[#F5F3EE]">
                  Room Created
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#7ED6A5] animate-pulse"></div>
                  <span className="font-mono text-[11px] text-[#7ED6A5]">
                    Active · Two Devices Max
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 mb-5">
              {/* Shareable Link Field */}
              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-[11px] text-[#9B9DA3]">
                  Shareable Link
                </span>
                <div className="flex items-center bg-[#181B21] rounded-xl p-1.5 pl-3 border border-[#272A31]">
                  <span className="font-mono text-xs text-[#E8D8B8] truncate flex-1 select-all">
                    {roomUrl.replace(/^https?:\/\//, '')}
                  </span>
                  <button
                    aria-label="Copy Link"
                    onClick={handleCopyLink}
                    id="copy-created-link-btn"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9B9DA3] hover:text-[#E8D8B8] hover:bg-[#272A31] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {copiedLink ? 'done' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Access PIN Field */}
              <div className="flex flex-col gap-1">
                <span className="font-label-sm text-[11px] text-[#9B9DA3]">
                  Access PIN
                </span>
                <div className="flex items-center bg-[#181B21] rounded-xl p-1.5 pl-3 border border-[#272A31]">
                  <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#F5F3EE] flex-1 select-all">
                    {createdData.pin}
                  </span>
                  <button
                    aria-label="Copy PIN"
                    onClick={handleCopyPin}
                    id="copy-created-pin-btn"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9B9DA3] hover:text-[#E8D8B8] hover:bg-[#272A31] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {copiedPin ? 'done' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleEnter}
                id="enter-created-room-btn"
                className="w-full py-3 px-5 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold text-xs hover:bg-[#F0E3C8] transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Enter Room</span>
              </button>

              <button
                onClick={handleShareDetails}
                id="share-details-btn"
                className="w-full py-2.5 px-5 rounded-full bg-transparent text-[#E8D8B8] font-label-md font-semibold text-xs hover:bg-[#181B21] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#272A31] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Share Room Details</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#181B21] text-[#F5F3EE] px-4 py-2 rounded-full text-xs font-mono shadow-2xl z-50 flex items-center gap-2 border border-[#272A31] animate-fade-in">
          <span className="material-symbols-outlined text-[#7ED6A5] text-[16px]">check</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
