import React, { useState, useEffect, useRef } from 'react';
import type { RoomInfo } from '../types';
import { apiRequest } from '../utils/api';
import { triggerHaptic, hapticPinKey, hapticPinSuccess, hapticPinError } from '../utils/helpers';
import { QrScannerModal } from './QrScannerModal';

interface JoinRoomViewProps {
  initialRoomCode?: string;
  initialPin?: string;
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
  initialPin = '',
  onJoined,
  onCancel,
}) => {
  const [roomCode, setRoomCode] = useState<string>(() => extractCode(initialRoomCode));
  const [digits, setDigits] = useState<string[]>(() => {
    if (initialPin && initialPin.length >= 1) {
      const clean = initialPin.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const arr = ['', '', '', '', '', ''];
      clean.forEach((c, i) => {
        arr[i] = c;
      });
      return arr;
    }
    return ['', '', '', '', '', ''];
  });
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isCheckingRoom, setIsCheckingRoom] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

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

  // Sync if initialPin prop updates
  useEffect(() => {
    if (initialPin && initialPin.length >= 1) {
      const clean = initialPin.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const arr = ['', '', '', '', '', ''];
      clean.forEach((c, i) => {
        arr[i] = c;
      });
      setDigits(arr);
    }
  }, [initialPin]);

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

  const handleScanSuccess = (data: { roomCode: string; pin?: string }) => {
    setIsScannerOpen(false);
    if (data.roomCode) {
      setRoomCode(data.roomCode);
    }
    if (data.pin) {
      const clean = data.pin.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const arr = ['', '', '', '', '', ''];
      clean.forEach((c, i) => {
        arr[i] = c;
      });
      setDigits(arr);
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
          className="w-9 h-9 flex items-center justify-center text-[#c7c6cb] hover:text-[#e2e2e9] rounded-full hover:bg-[#1e2025] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e2025] border border-white/5 text-xs font-label-sm text-[#ffb3af]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] animate-pulse"></span>
          <span>Access Portal</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-6 flex flex-col items-center justify-center pt-2 relative z-10 flex-grow max-w-md mx-auto w-full">
        {/* Key Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#1e2025] border border-white/5 shadow-lg flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-[#c7c6ca] text-[26px]">key</span>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center max-w-sm mb-5">
          {initialPin && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb3af]/10 border border-[#ffb3af]/25 text-[11px] font-mono text-[#ffb3af] mb-2.5 animate-fade-in">
              <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
              <span>Scanned from Partner's Screen</span>
            </div>
          )}
          <span className="font-label-sm text-[11px] text-[#ffb3af] uppercase tracking-widest block mb-1.5 font-semibold">
            Access Required
          </span>
          <h1 className="font-display-sm text-3xl text-[#e2e2e9] mb-1.5 tracking-tight">
            Join Private Room
          </h1>
          <p className="font-body-md text-xs text-[#c7c6cb]">
            {initialPin
              ? 'Credentials detected. Tap Enter Room to join your partner.'
              : 'Enter the 6-digit PIN shared with you to enter this space.'}
          </p>
        </div>

        {/* Form Container */}
        <div
          className={`w-full bg-[#1e2025] rounded-[28px] p-6 sm:p-7 shadow-2xl border border-white/5 transition-all duration-300 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {/* Scan Partner QR Bar */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setIsScannerOpen(true);
            }}
            id="join-scan-partner-qr-btn"
            className="w-full mb-4 py-2.5 px-4 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-[#e2e2e9] border border-white/10 hover:border-[#ffb3af]/40 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px] text-[#ffb3af] group-hover:scale-110 transition-transform">
              photo_camera
            </span>
            <span>Scan Partner's QR</span>
            <span className="text-[10px] bg-[#ffb3af]/15 text-[#ffb3af] px-1.5 py-0.5 rounded font-mono ml-auto">
              Camera
            </span>
          </button>

          <div className="flex items-center gap-2 w-full mb-4">
            <div className="flex-1 h-[1px] bg-white/5"></div>
            <span className="font-mono text-[10px] uppercase text-[#909095] tracking-wider">or enter manually</span>
            <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col items-center gap-4.5 w-full">
            {/* Room Code input */}
            <div className="w-full">
              <div className="flex items-center justify-between font-label-sm text-xs text-[#c7c6cb] mb-1.5 px-1">
                <span>ROOM CODE</span>
                {isCheckingRoom && <span className="text-[#ffb3af] animate-pulse">Checking...</span>}
                {roomInfo && <span className="text-[#ffb3af] font-semibold">Valid Room</span>}
              </div>
              <input
                type="text"
                value={roomCode}
                onChange={handleRoomCodeInputChange}
                placeholder="e.g. 8KX92LMQ"
                id="room-code-input"
                className="w-full h-11 text-center font-mono text-sm tracking-widest bg-[#111318] border border-white/10 rounded-xl text-[#e2e2e9] focus:outline-none focus:border-[#ffb3af] transition-all uppercase"
              />
            </div>

            {/* 6-Digit PIN Container */}
            <div className="w-full">
              <div className="text-center font-label-sm text-xs text-[#c7c6cb] mb-2 uppercase tracking-wider font-mono">
                6-Digit Access PIN
              </div>
              <div className="flex justify-center items-center gap-1.5 sm:gap-2 w-full" onPaste={handlePaste}>
                {/* First 3 Digits */}
                {[0, 1, 2].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    id={`pin-digit-${idx}`}
                    className="w-10 h-12 sm:w-11 sm:h-13 bg-[#111318] rounded-xl text-center font-mono text-lg font-bold text-[#e2e2e9] caret-[#ffb3af] focus:outline-none focus:border-[#ffb3af] border border-white/10 transition-all"
                  />
                ))}

                {/* Spacer Dot */}
                <div className="w-1.5 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span>
                </div>

                {/* Last 3 Digits */}
                {[3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    id={`pin-digit-${idx}`}
                    className="w-10 h-12 sm:w-11 sm:h-13 bg-[#111318] rounded-xl text-center font-mono text-lg font-bold text-[#e2e2e9] caret-[#ffb3af] focus:outline-none focus:border-[#ffb3af] border border-white/10 transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-1.5 text-[#ffb4ab] bg-[#93000a]/20 border border-[#ffb4ab]/30 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all animate-fade-in">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isJoining || pin.length !== 6 || !roomCode.trim()}
              id="join-submit-btn"
              className="w-full h-12 bg-[#c7c6ca] hover:bg-[#e3e2e6] text-[#303034] rounded-full font-label-md font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 mt-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
        <div className="mt-5 flex items-center gap-1.5 text-[#909095] text-xs font-mono">
          <span className="material-symbols-outlined text-[#c7c6ca] text-[15px]">lock</span>
          <span>End-to-End Encrypted · 2 Person Limit</span>
        </div>
      </div>

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
