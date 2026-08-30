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
  { label: '10m', value: 1 / 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '2d', value: 48 },
  { label: '3d', value: 72 },
  { label: '7d', value: 168 },
  { label: '20d', value: 480 },
];

const AUTO_DELETE_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
  { label: '24h', value: 86400 },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [selectedDurationIdx, setSelectedDurationIdx] = useState<number>(2); // 24h default
  const [selectedAutoDeleteIdx, setSelectedAutoDeleteIdx] = useState<number>(0); // Off default
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [createdData, setCreatedData] = useState<{
    roomCode: string;
    pin: string;
    sessionToken: string;
    expiresAt: number;
  } | null>(null);
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
          durationHours: DURATIONS[selectedDurationIdx].value,
          defaultMessageExpiration: AUTO_DELETE_OPTIONS[selectedAutoDeleteIdx].value,
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
      setError(err.message || 'Failed to initialize space.');
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
      showToast('Link copied to clipboard');
    }
  };

  const handleCopyCode = async () => {
    if (!createdData?.roomCode) return;
    triggerHaptic('light');
    const ok = await copyToClipboard(createdData.roomCode);
    if (ok) {
      showToast('Access code copied to clipboard');
    }
  };

  const handleCopyPin = async () => {
    if (!createdData?.pin) return;
    triggerHaptic('light');
    const ok = await copyToClipboard(createdData.pin);
    if (ok) {
      showToast('Security PIN copied to clipboard');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#111318]/90 backdrop-blur-2xl animate-fade-in select-none overflow-y-auto">
      {/* Ambient background blob */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <svg className="w-full h-full opacity-40 blur-3xl" preserveAspectRatio="none" viewBox="0 0 100 100">
          <circle cx="20" cy="20" fill="#33353a" r="40" className="animate-[drift_20s_ease-in-out_infinite_alternate]" />
          <circle cx="80" cy="80" fill="#46464b" r="50" className="animate-[drift_25s_ease-in-out_infinite_alternate-reverse]" />
        </svg>
      </div>

      {/* Main Container Card */}
      <div
        id="room-card"
        className="w-full max-w-xl relative z-10 bg-[#111318] border border-white/[0.08] rounded-[28px] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto scrollbar-hide"
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
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#1e2025] text-[#c7c6cb] hover:text-[#e2e2e9] hover:bg-[#33353a] flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {error && (
          <div className="w-full p-3.5 mb-5 rounded-2xl bg-[#93000a]/20 border border-[#ffb4ab]/30 text-xs text-[#ffb4ab] text-left font-mono">
            {error}
          </div>
        )}

        {!createdData ? (
          /* Initial Configuration State */
          <div className="flex flex-col gap-6 text-left py-1" id="create-form">
            <div className="flex flex-col gap-2">
              <h1 className="font-display-lg text-headline-lg-mobile md:text-display-sm text-[#e2e2e9] tracking-tight">
                Create Space
              </h1>
              <p className="font-body-md text-sm text-[#c7c6cb] leading-relaxed max-w-md">
                Configure a secure, ephemeral environment. Settings cannot be changed once active.
              </p>
            </div>

            {/* Room Duration Selection with Segmented Pill Slider */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <label className="font-label-sm text-[#c7c6cb] uppercase tracking-[0.1em] text-xs font-semibold">
                  Room Lifespan
                </label>
                <span className="font-body-md text-[#e2e2e9] font-medium text-sm">
                  {DURATIONS[selectedDurationIdx].label}
                </span>
              </div>

              <div className="relative w-full bg-[#1a1b21] rounded-[16px] p-1.5 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide border border-white/5">
                {DURATIONS.map((dur, idx) => {
                  const isActive = selectedDurationIdx === idx;
                  return (
                    <button
                      key={dur.label}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedDurationIdx(idx);
                      }}
                      className={`relative z-10 flex-1 min-w-[56px] py-2.5 text-center font-body-md text-sm transition-all rounded-[12px] cursor-pointer ${
                        isActive
                          ? 'bg-[#33353a] text-[#e2e2e9] font-semibold shadow-sm'
                          : 'text-[#c7c6cb] hover:text-[#e2e2e9]'
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Retention Selection with Segmented Pill Slider */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <label className="font-label-sm text-[#c7c6cb] uppercase tracking-[0.1em] text-xs font-semibold">
                  Message Retention
                </label>
                <span className="font-body-md text-[#e2e2e9] font-medium text-sm">
                  {AUTO_DELETE_OPTIONS[selectedAutoDeleteIdx].label}
                </span>
              </div>

              <div className="relative w-full bg-[#1a1b21] rounded-[16px] p-1.5 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide border border-white/5">
                {AUTO_DELETE_OPTIONS.map((opt, idx) => {
                  const isActive = selectedAutoDeleteIdx === idx;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedAutoDeleteIdx(idx);
                      }}
                      className={`relative z-10 flex-1 min-w-[56px] py-2.5 text-center font-body-md text-sm transition-all rounded-[12px] cursor-pointer ${
                        isActive
                          ? 'bg-[#33353a] text-[#e2e2e9] font-semibold shadow-sm'
                          : 'text-[#c7c6cb] hover:text-[#e2e2e9]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary & Initialize Space Button */}
            <div className="mt-2 bg-[#1e2025]/70 backdrop-blur-md p-5 sm:p-6 rounded-[24px] flex flex-col items-start gap-6 border border-white/10 shadow-lg">
              <div className="flex items-center gap-4 w-full">
                <div className="w-12 h-12 rounded-full bg-[#33353a] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#c7c6ca] text-[22px]">lock</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-body-md text-[#e2e2e9] font-medium">Secure Protocol</span>
                  <span className="font-body-sm text-xs text-[#c7c6cb]">End-to-End Encrypted · 2 Person Limit</span>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={isGenerating}
                id="btn-create"
                className="w-full px-6 py-4 bg-[#c7c6ca] text-[#303034] font-label-md rounded-[16px] hover:bg-[#e3e2e6] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(199,198,202,0.15)] font-bold cursor-pointer disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    <span>Initializing Space...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[15px]">Initialize Space</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Room Created Success State */
          <div className="flex flex-col gap-6 text-left py-1 animate-fade-in" id="success-state">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e2025] w-fit border border-white/10">
                <div className="w-2 h-2 rounded-full bg-[#ffb3af] animate-pulse"></div>
                <span className="font-label-sm text-[#ffb3af] uppercase tracking-widest text-[11px] font-semibold">
                  Active Space
                </span>
              </div>
              <h2 className="font-display-lg text-headline-lg-mobile md:text-display-sm text-[#e2e2e9] tracking-tight">
                Ready to Connect
              </h2>
              <p className="font-body-md text-sm text-[#c7c6cb] max-w-md leading-relaxed">
                Share these credentials securely. The space will automatically dissolve according to your settings.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-[#1e2025] rounded-3xl p-1 shadow-2xl border border-white/5 relative overflow-hidden">
              <div className="bg-[#1e2025] p-5 rounded-[20px] flex flex-col gap-5">
                {/* Room Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-[#c7c6cb] uppercase tracking-widest text-[10px] font-semibold font-mono">
                    Access Code
                  </label>
                  <div
                    onClick={handleCopyCode}
                    className="flex items-center justify-between bg-[#111318] p-3.5 rounded-xl border border-[#46464b]/30 hover:border-[#ffb3af]/50 transition-colors cursor-pointer group"
                  >
                    <span className="font-display-sm text-2xl tracking-widest text-[#e2e2e9]">
                      {createdData.roomCode}
                    </span>
                    <span className="material-symbols-outlined text-[#c7c6cb] group-hover:text-[#ffb3af] transition-colors text-[20px]">
                      content_copy
                    </span>
                  </div>
                </div>

                <div className="h-[1px] w-full bg-white/[0.06]"></div>

                {/* Security PIN with Individual Digit Boxes */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-[#c7c6cb] uppercase tracking-widest text-[10px] font-semibold font-mono">
                    Security PIN
                  </label>
                  <div
                    onClick={handleCopyPin}
                    className="flex items-center justify-between bg-[#111318] p-3.5 rounded-xl border border-[#46464b]/30 hover:border-[#ffb3af]/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex gap-2">
                      {createdData.pin.split('').map((char, i) => (
                        <span
                          key={i}
                          className="w-8 h-10 flex items-center justify-center font-display-sm text-lg text-[#e2e2e9] bg-[#33353a] rounded-md border border-white/5 font-mono"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                    <span className="material-symbols-outlined text-[#c7c6cb] group-hover:text-[#ffb3af] transition-colors text-[20px]">
                      content_copy
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <button
                onClick={handleCopyLink}
                className="flex-1 px-5 py-3.5 bg-[#1e2025] text-[#e2e2e9] font-label-md rounded-xl hover:bg-[#33353a] transition-colors active:scale-95 flex items-center justify-center gap-2 border border-white/5 cursor-pointer text-sm font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">link</span>
                <span>Copy Link</span>
              </button>

              <button
                onClick={handleEnter}
                className="flex-1 px-5 py-3.5 bg-[#c7c6ca] text-[#303034] font-label-md rounded-xl hover:bg-[#e3e2e6] transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-lg cursor-pointer text-sm font-bold"
              >
                <span>Enter Space</span>
                <span className="material-symbols-outlined text-[18px]">login</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[#33353a] text-[#e2e2e9] font-label-sm px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-white/10 animate-fade-in">
          <span className="material-symbols-outlined text-[#ffb3af] text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
