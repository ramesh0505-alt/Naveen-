import React, { useState } from 'react';
import { Shield, Clock, X, Loader2, ArrowRight, Flame, Hourglass, Zap } from 'lucide-react';
import { apiRequest } from '../utils/api';

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
  const [durationHours, setDurationHours] = useState<number>(24);
  const [defaultMessageExpiration, setDefaultMessageExpiration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationHours,
          defaultMessageExpiration,
        }),
      });

      onRoomCreated({
        roomCode: data.roomCode,
        pin: data.pin,
        sessionToken: data.sessionToken,
        role: 'owner',
        expiresAt: data.expiresAt,
      });
    } catch (err: any) {
      setError(err.message || 'Network error creating room.');
      setIsLoading(false);
    }
  };

  const durations = [
    { label: '01 Hour', hours: 1, desc: 'Quick session' },
    { label: '12 Hours', hours: 12, desc: 'Half-day workspace' },
    { label: '24 Hours', hours: 24, desc: 'Standard ephemeral' },
    { label: '07 Days', hours: 168, desc: 'Extended dialogue' },
  ];

  const messageRetentionOptions = [
    { label: 'Room Lifetime', value: 0, desc: 'Keep until session expires', icon: Hourglass },
    { label: 'Burn on Read', value: -1, desc: '10s after recipient opens', icon: Flame },
    { label: '1 Minute', value: 60, desc: 'Auto-delete after 60s', icon: Zap },
    { label: '5 Minutes', value: 300, desc: 'Auto-delete after 5 min', icon: Clock },
    { label: '1 Hour', value: 3600, desc: 'Auto-delete after 60 min', icon: Clock },
    { label: '24 Hours', value: 86400, desc: 'Auto-delete after 24 hours', icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full max-w-lg bg-[#141414] border border-[#2A2A2A] shadow-2xl overflow-hidden animate-scale-up text-[#F0F0F0] max-h-[95vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2A2A2A] flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#888] font-mono">
              Configuration Module
            </span>
            <h2 id="create-modal-title" className="text-xl font-light text-white tracking-tight mt-0.5">
              Initialize <span className="font-serif italic text-[#CCC]">Private Room</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            id="close-create-modal-btn"
            className="text-[#888] hover:text-white p-2 border border-[#2A2A2A] hover:bg-[#222] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-800 text-xs text-red-300 font-mono">
              {error}
            </div>
          )}

          {/* Room Lifetime selection */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-3 font-mono">
              Select Room Lifetime
            </label>
            <div className="grid grid-cols-2 gap-3">
              {durations.map((d) => (
                <button
                  key={d.hours}
                  type="button"
                  onClick={() => setDurationHours(d.hours)}
                  className={`p-3.5 border text-left transition-all cursor-pointer ${
                    durationHours === d.hours
                      ? 'border-white bg-[#222222] text-white shadow-sm'
                      : 'border-[#2A2A2A] hover:border-[#444] bg-[#0E0E0E] text-[#888]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-white tracking-wider">{d.label}</span>
                    {durationHours === d.hours && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#777] font-light">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Message Expiration Timer */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] font-mono">
                Message Expiration & Retention Timer
              </label>
              <span className="text-[10px] font-mono text-emerald-400">
                {defaultMessageExpiration === 0
                  ? 'ROOM LIFETIME'
                  : defaultMessageExpiration === -1
                  ? 'BURN ON READ'
                  : `${defaultMessageExpiration >= 3600 ? defaultMessageExpiration / 3600 + 'H' : defaultMessageExpiration / 60 + 'M'} RETENTION`}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {messageRetentionOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = defaultMessageExpiration === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDefaultMessageExpiration(opt.value)}
                    className={`p-3 border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/80 bg-[#16221A] text-white shadow-sm'
                        : 'border-[#2A2A2A] hover:border-[#444] bg-[#0E0E0E] text-[#888]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-[#666]'}`} />
                      <span className="font-mono text-xs font-medium text-white truncate">{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-[#777] font-light block leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy features recap */}
          <div className="p-4 bg-[#0E0E0E] border border-[#2A2A2A] text-xs text-[#888] space-y-2 font-mono">
            <div className="text-white font-mono text-xs flex items-center justify-between">
              <span>MANIFEST SPECIFICATIONS</span>
              <span className="text-[#555]">02P_LIMIT</span>
            </div>
            <ul className="space-y-1.5 text-[#777] text-[11px] pt-1 border-t border-[#1C1C1C]">
              <li className="flex justify-between"><span>Max Participants:</span> <span className="text-[#AAA]">02 (Owner + Guest)</span></li>
              <li className="flex justify-between"><span>PIN Encryption:</span> <span className="text-[#AAA]">256-Bit Salted SHA</span></li>
              <li className="flex justify-between"><span>Auto-Purge Engine:</span> <span className="text-[#AAA]">Active Sub-Second Scrubber</span></li>
              <li className="flex justify-between"><span>Post-Expiry:</span> <span className="text-[#AAA]">Total Memory Purge</span></li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0E0E0E] border-t border-[#2A2A2A] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-[11px] uppercase tracking-[0.2em] font-mono text-[#888] hover:text-white px-3 py-2 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isLoading}
            id="confirm-create-room-btn"
            className="bg-white text-black px-6 py-3 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-[#D1D1D1] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>Generate Keys</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
