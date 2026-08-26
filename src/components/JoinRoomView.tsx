import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2, AlertCircle, Shield } from 'lucide-react';
import type { RoomInfo } from '../types';
import { apiRequest } from '../utils/api';

interface JoinRoomViewProps {
  initialRoomCode?: string;
  onJoined: (data: {
    roomCode: string;
    sessionToken: string;
    role: 'guest';
    expiresAt: number;
    roomInfo: RoomInfo;
  }) => void;
  onCancel: () => void;
}

export const JoinRoomView: React.FC<JoinRoomViewProps> = ({
  initialRoomCode = '',
  onJoined,
  onCancel,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isCheckingRoom, setIsCheckingRoom] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (roomCode.trim().length >= 4) {
      checkRoom(roomCode.trim());
    }
  }, [roomCode]);

  const checkRoom = async (code: string) => {
    setIsCheckingRoom(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/rooms/${code}/info`);
      if (!data.exists) {
        setError(data.error || 'Room not found or expired.');
        setRoomInfo(null);
      } else {
        setRoomInfo(data.roomInfo);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to reach room server.');
    } finally {
      setIsCheckingRoom(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, '').slice(0, 6);
      const newDigits = [...pinDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setPinDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = val.replace(/\D/g, '');
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = pinDigits.join('');
    if (!roomCode.trim()) {
      setError('Please enter a room code.');
      return;
    }
    if (pin.length !== 6) {
      setError('Please enter the complete 6-digit PIN.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest(`/api/rooms/${roomCode.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      onJoined({
        roomCode: roomCode.trim(),
        sessionToken: data.sessionToken,
        role: 'guest',
        expiresAt: data.expiresAt,
        roomInfo: data.roomInfo,
      });
    } catch (err: any) {
      setError(err.message || 'Error joining private room.');
      setIsLoading(false);
    }
  };

  const isPinComplete = pinDigits.every((d) => d.length === 1);

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 animate-fade-in font-sans">
      <div className="bg-[#141414] border border-[#2A2A2A] shadow-2xl overflow-hidden text-[#F0F0F0]">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-[#2A2A2A] text-left">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#888] font-mono">
            Peer Authentication
          </span>
          <h1 className="text-2xl font-light text-white tracking-tight mt-1 mb-1">
            Access <span className="font-serif italic text-[#CCC]">Private Room</span>
          </h1>
          <p className="text-xs text-[#888] font-light">
            Enter the 6-digit access PIN provided by the room creator.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-800 text-xs text-red-300 font-mono flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Room Code field (if not preset) */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-2 font-mono">
              Room Identifier
            </label>
            <div className="relative">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.trim())}
                placeholder="e.g. 8Kx92LmQ"
                disabled={Boolean(initialRoomCode)}
                className="w-full bg-[#0E0E0E] border border-[#2A2A2A] px-4 py-3 text-xs font-mono tracking-wider text-white focus:outline-none focus:border-white disabled:opacity-70"
              />
              {isCheckingRoom && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#888]" />
                </div>
              )}
            </div>
            {roomInfo && (
              <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1.5 font-mono">
                <Shield className="w-3.5 h-3.5" /> Room active • {roomInfo.currentMembers}/02 Peers
              </p>
            )}
          </div>

          {/* 6-Digit PIN Inputs */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#888] mb-3 font-mono flex items-center justify-between">
              <span>02 // 6-Digit Access PIN</span>
              <span className="text-[9px] text-[#666]">Auto-Advances</span>
            </label>

            <div className="flex items-center justify-between gap-2 sm:gap-2.5">
              {pinDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  id={`pin-digit-${index}`}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-light bg-[#0E0E0E] border border-[#2A2A2A] text-white focus:outline-none focus:border-white transition-all shadow-inner"
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isLoading || !isPinComplete || !roomCode}
              id="submit-join-room-btn"
              className="w-full py-4 bg-white text-black text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-[#D1D1D1] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <span>Enter Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-[10px] uppercase tracking-[0.2em] font-mono text-[#777] hover:text-white transition-colors"
            >
              Return Home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
