import React, { useState, useEffect, useRef } from 'react';
import type { RoomInfo } from '../types';
import { apiRequest } from '../utils/api';
import { triggerHaptic, hapticPinKey, hapticPinSuccess, hapticPinError } from '../utils/helpers';

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
  const [roomCode, setRoomCode] = useState<string>(() => extractCode(initialRoomCode));
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isCheckingRoom, setIsCheckingRoom] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function extractCode(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.trim();
    const urlMatch = cleaned.match(/(?:private|room|join)\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].toUpperCase();
    }
    const queryMatch = cleaned.match(/[?&](?:room|code|r)=([a-zA-Z0-9_-]+)/i);
    if (queryMatch && queryMatch[1]) {
      return queryMatch[1].toUpperCase();
    }
    return cleaned.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  // Sync if initialRoomCode prop updates
  useEffect(() => {
    if (initialRoomCode) {
      const parsed = extractCode(initialRoomCode);
      if (parsed) setRoomCode(parsed);
    }
  }, [initialRoomCode]);

  // Automatically check room status when code reaches 6+ chars
  useEffect(() => {
    const clean = extractCode(roomCode);
    if (clean.length >= 6) {
      const timer = setTimeout(() => {
        checkRoom(clean);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setRoomInfo(null);
    }
  }, [roomCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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
    const char = val.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    setError(null);

    if (char) {
      hapticPinKey();
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleRoomCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const extracted = extractCode(val);
    setRoomCode(extracted || val.trim().toUpperCase());
    setError(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        hapticPinKey();
        inputRefs.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
      } else if (digits[index]) {
        hapticPinKey();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasted.length > 0) {
      hapticPinKey();
      const chars = pasted.slice(0, 6).split('');
      const updated = ['', '', '', '', '', ''];
      chars.forEach((c, i) => {
        if (i < 6) updated[i] = c;
      });
      setDigits(updated);
      const nextFocus = Math.min(chars.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const pin = digits.join('');

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!roomCode.trim()) {
      setError('Please provide the 8-character room code.');
      hapticPinError();
      triggerShake();
      return;
    }
    if (pin.length !== 6) {
      setError('Please enter the complete 6-digit access PIN.');
      hapticPinError();
      triggerShake();
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const data = await apiRequest(`/api/rooms/${roomCode.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      hapticPinSuccess();
      onJoined({
        roomCode: roomCode.trim().toUpperCase(),
        sessionToken: data.sessionToken,
        role: 'guest',
        expiresAt: data.expiresAt,
        roomInfo: data.roomInfo,
      });
    } catch (err: any) {
      hapticPinError();
      setError(err.message || 'Invalid PIN or room is full.');
      triggerShake();
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsJoining(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="flex flex-col w-full h-full justify-between pb-28 pt-4 relative overflow-hidden min-h-[calc(100vh-140px)] select-none">
      {/* Top Back Navigation */}
      <div className="w-full px-6 flex items-center justify-between z-10 max-w-lg mx-auto">
        <button
          onClick={onCancel}
          id="join-back-btn"
          className="w-9 h-9 flex items-center justify-center text-[#9B9DA3] hover:text-[#F5F3EE] rounded-full hover:bg-[#181B21] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181B21] border border-[#272A31] text-xs font-label-sm text-[#E8D8B8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8D8B8] animate-pulse"></span>
          <span>Access Portal</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-6 flex flex-col items-center justify-center pt-2 relative z-10 flex-grow max-w-md mx-auto w-full">
        {/* Key Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#181B21] border border-[#272A31] shadow-lg flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-[#E8D8B8] text-[26px]">key</span>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center max-w-sm mb-5">
          <span className="font-mono text-[11px] text-[#E8D8B8] uppercase tracking-widest block mb-1.5 font-semibold">
            Access Required
          </span>
          <h1 className="font-editorial text-3xl text-[#F5F3EE] mb-1.5 tracking-tight">
            Join Private Room
          </h1>
          <p className="font-body-sm text-xs text-[#9B9DA3]">
            Enter the 6-digit PIN shared with you to enter this space.
          </p>
        </div>

        {/* Form Container */}
        <div
          className={`w-full bg-[#121419] rounded-[28px] p-6 sm:p-7 shadow-2xl border border-[#272A31] transition-all duration-300 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          <form onSubmit={handleJoin} className="flex flex-col items-center gap-4.5 w-full">
            {/* Room Code input */}
            <div className="w-full">
              <div className="flex items-center justify-between font-label-sm text-xs text-[#9B9DA3] mb-1.5 px-1">
                <span>ROOM CODE</span>
                {isCheckingRoom && <span className="text-[#E8D8B8] animate-pulse">Checking...</span>}
                {roomInfo && <span className="text-[#7ED6A5] font-semibold">Valid Room</span>}
              </div>
              <input
                type="text"
                value={roomCode}
                onChange={handleRoomCodeInputChange}
                placeholder="e.g. 8KX92LMQ"
                id="room-code-input"
                className="w-full h-11 text-center font-mono text-sm tracking-widest bg-[#181B21] border border-[#272A31] rounded-xl text-[#F5F3EE] focus:outline-none focus:border-[#E8D8B8] transition-all uppercase"
              />
            </div>

            {/* 6-Digit PIN Container */}
            <div className="w-full">
              <div className="text-center font-label-sm text-xs text-[#9B9DA3] mb-2 uppercase tracking-wider font-mono">
                6-Digit Access PIN
              </div>
              <div className="flex justify-center items-center gap-1.5 sm:gap-2 w-full" onPaste={handlePaste}>
                {/* First 3 Digits */}
                {[0, 1, 2].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    id={`pin-digit-${idx}`}
                    className="w-10 h-12 sm:w-11 sm:h-13 bg-[#181B21] rounded-xl text-center font-mono text-lg font-bold text-[#F5F3EE] caret-[#E8D8B8] focus:outline-none focus:border-[#E8D8B8] border border-[#272A31] transition-all"
                  />
                ))}

                {/* Spacer Dot */}
                <div className="w-1.5 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-[#272A31] rounded-full"></span>
                </div>

                {/* Last 3 Digits */}
                {[3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    id={`pin-digit-${idx}`}
                    className="w-10 h-12 sm:w-11 sm:h-13 bg-[#181B21] rounded-xl text-center font-mono text-lg font-bold text-[#F5F3EE] caret-[#E8D8B8] focus:outline-none focus:border-[#E8D8B8] border border-[#272A31] transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-1.5 text-[#FF5C5C] bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all animate-fade-in">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isJoining || pin.length !== 6 || !roomCode.trim()}
              id="join-submit-btn"
              className="w-full h-12 bg-[#E8D8B8] text-[#121419] rounded-full font-label-md font-bold text-xs shadow-md hover:bg-[#F0E3C8] transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 mt-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isJoining ? (
                <span>Verifying Access...</span>
              ) : (
                <>
                  <span>Enter Room</span>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge at bottom */}
        <div className="mt-5 flex items-center gap-1.5 text-[#6E7179] text-xs font-mono">
          <span className="material-symbols-outlined text-[#E8D8B8] text-[15px]">lock</span>
          <span>End-to-End Encrypted · 2 Person Limit</span>
        </div>
      </div>
    </div>
  );
};
