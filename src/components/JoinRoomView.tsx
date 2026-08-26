import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, ArrowRight, Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import type { RoomInfo } from '../types';
import { apiRequest } from '../utils/api';
import { triggerHaptic } from '../utils/helpers';

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

  // Automatically check room status when code reaches 6+ alphanumeric chars
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

  // Focus the first PIN input on mount or when room is ready
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

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
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
        inputRefs.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasted.length > 0) {
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
      triggerShake();
      return;
    }
    if (pin.length !== 6) {
      setError('Please enter the complete 6-digit access PIN.');
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

      triggerHaptic('success');
      onJoined({
        roomCode: roomCode.trim().toUpperCase(),
        sessionToken: data.sessionToken,
        role: 'guest',
        expiresAt: data.expiresAt,
        roomInfo: data.roomInfo,
      });
    } catch (err: any) {
      triggerHaptic('warning');
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
    <div className="flex flex-col w-full h-full justify-between pb-8 relative overflow-hidden min-h-[calc(100vh-140px)] font-sans selection:bg-[#4d8eff]/30 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-br from-[#adc6ff]/10 via-[#0b1326] to-[#bcc7de]/10"></div>
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#adc6ff]/5 rounded-full blur-3xl pointer-events-none mix-blend-screen"></div>

      {/* Top Back Navigation */}
      <div className="w-full px-4 sm:px-8 pt-4 flex items-center justify-between z-10">
        <button
          onClick={onCancel}
          id="join-back-btn"
          className="w-10 h-10 flex items-center justify-center text-[#c2c6d6] hover:text-[#dae2fd] rounded-full hover:bg-[#171f33] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171f33]/60 border border-white/5 text-[11px] font-mono text-[#adc6ff]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#adc6ff] pulsate"></span>
          <span>Encrypted Entry</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-4 sm:px-6 flex flex-col items-center justify-center pt-2 relative z-10 flex-grow max-w-md mx-auto w-full">
        {/* Key Icon Container */}
        <div className="w-16 h-16 rounded-2xl bg-[#222a3d]/50 backdrop-blur-md shadow-lg flex items-center justify-center mb-6 relative group border border-white/5">
          <div className="absolute inset-0 bg-[#adc6ff]/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <KeyRound className="w-8 h-8 text-[#adc6ff]" />
        </div>

        {/* Title and Subtitle */}
        <div className="text-center max-w-sm mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#dae2fd] mb-1 tracking-tight">
            Join a Private Room
          </h1>
          <p className="text-sm text-[#c2c6d6]">
            Enter the room code and 6-digit access PIN.
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div
          className={`w-full bg-[#131b2e]/40 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative group transition-all duration-300 border border-white/5 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {/* Ambient Glow border */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#adc6ff]/20 to-[#bcc7de]/20 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

          <div className="relative bg-[#060e20]/80 rounded-3xl p-5 sm:p-6 backdrop-blur-md border border-white/5">
            <form onSubmit={handleJoin} className="flex flex-col items-center gap-5 w-full">
              {/* Optional Room Code input (if not preset) */}
              <div className="w-full">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#c2c6d6] mb-1 px-1">
                  <span>ROOM CODE</span>
                  {isCheckingRoom && <span className="text-[#adc6ff] animate-pulse">Verifying...</span>}
                  {roomInfo && <span className="text-emerald-400 font-semibold">Active Sanctuary</span>}
                </div>
                <input
                  type="text"
                  value={roomCode}
                  onChange={handleRoomCodeInputChange}
                  placeholder="e.g. 8KX92LMQ or paste invite link"
                  id="room-code-input"
                  className="w-full h-11 text-center font-mono text-sm tracking-widest bg-[#2d3449]/40 border border-white/5 rounded-xl text-[#dae2fd] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#adc6ff]/50 transition-all uppercase"
                />
              </div>

              {/* 6-Digit PIN Container with Center Spacer */}
              <div className="w-full">
                <div className="text-center text-[11px] font-mono text-[#c2c6d6] mb-2 uppercase tracking-wider">
                  6-Digit Access PIN
                </div>
                <div className="flex justify-center items-center gap-2 sm:gap-2.5 w-full" onPaste={handlePaste}>
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
                      className="w-10 h-12 sm:w-11 sm:h-14 bg-[#2d3449]/50 rounded-xl text-center font-mono text-xl font-bold text-[#dae2fd] caret-[#adc6ff] focus:outline-none focus:ring-2 focus:ring-[#adc6ff]/50 shadow-inner transition-all focus:-translate-y-0.5 border border-white/5"
                    />
                  ))}

                  {/* Spacer for visual grouping */}
                  <div className="w-2 h-12 sm:h-14 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-[#424754] rounded-full"></span>
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
                      className="w-10 h-12 sm:w-11 sm:h-14 bg-[#2d3449]/50 rounded-xl text-center font-mono text-xl font-bold text-[#dae2fd] caret-[#adc6ff] focus:outline-none focus:ring-2 focus:ring-[#adc6ff]/50 shadow-inner transition-all focus:-translate-y-0.5 border border-white/5"
                    />
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-[#ffb4ab] bg-[#93000a]/30 border border-[#ffb4ab]/30 px-4 py-2 rounded-full text-xs font-mono transition-all animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#ffb4ab]" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isJoining || pin.length !== 6 || !roomCode.trim()}
                id="join-submit-btn"
                className="w-full h-14 bg-[#adc6ff] text-[#002e6a] rounded-2xl font-semibold text-base shadow-[0_10px_25px_-5px_rgba(77,142,255,0.35)] hover:shadow-[0_15px_30px_-5px_rgba(77,142,255,0.45)] hover:bg-[#d8e2ff] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group mt-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Join Room</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Security badge at bottom */}
        <div className="mt-6 flex items-center gap-2 text-[#8c909f] text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-[#adc6ff]" />
          <span>Only two people can join a room.</span>
        </div>
      </div>
    </div>
  );
};
