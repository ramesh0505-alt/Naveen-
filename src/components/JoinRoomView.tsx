import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
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
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isCheckingRoom, setIsCheckingRoom] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatically check room status when code reaches 8 alphanumeric chars
  useEffect(() => {
    const clean = roomCode.trim().toUpperCase();
    if (clean.length === 8) {
      checkRoom(clean);
    } else {
      setRoomInfo(null);
    }
  }, [roomCode]);

  // Focus the first PIN input when room info is loaded
  useEffect(() => {
    if (roomInfo && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [roomInfo]);

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
    const char = val.slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    setError(null);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasted.length >= 6) {
      const chars = pasted.slice(0, 6).split('');
      setDigits(chars);
      inputRefs.current[5]?.focus();
    }
  };

  const pin = digits.join('');

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Please provide an 8-character room code.');
      return;
    }
    if (pin.length !== 6) {
      setError('Please enter the full 6-digit access PIN.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const data = await apiRequest(`/api/rooms/${roomCode.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      triggerHaptic('success');
      onJoined({
        roomCode: roomCode.trim(),
        sessionToken: data.sessionToken,
        role: 'guest',
        expiresAt: data.expiresAt,
        roomInfo: data.roomInfo,
      });
    } catch (err: any) {
      triggerHaptic('warning');
      setError(err.message || 'Incorrect PIN or room is full.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-4 sm:px-8 py-6 min-h-[calc(100vh-120px)] max-w-lg mx-auto justify-between animate-fade-in font-sans">
      {/* Top back button */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={onCancel}
          id="join-back-btn"
          className="w-10 h-10 flex items-center justify-center text-[#c2c6d6] hover:text-[#dae2fd] rounded-full hover:bg-[#171f33] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-mono text-[#8c909f] uppercase tracking-wider">
          Direct Connect
        </span>
      </div>

      {/* Hero / Header Section */}
      <div className="flex flex-col items-center justify-center my-auto space-y-6 text-center">
        <div className="relative mb-2">
          <div className="absolute inset-0 bg-[#adc6ff]/20 rounded-full blur-xl scale-150 animate-pulse"></div>
          <div className="relative bg-[#171f33] w-24 h-24 rounded-full flex items-center justify-center shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4d8eff]/20 to-transparent"></div>
            <Lock className="w-10 h-10 text-[#adc6ff] drop-shadow-[0_0_15px_rgba(77,142,255,0.5)] relative z-10" />
          </div>
        </div>

        <div className="text-center space-y-2 max-w-[300px]">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#dae2fd] tracking-tight">
            Private Room
          </h1>
          <p className="text-sm text-[#c2c6d6] leading-relaxed">
            Enter the room code and 6-digit access PIN to securely join the sanctuary.
          </p>
        </div>

        {/* Room Code Input (If not preset) */}
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#c2c6d6] px-1">
            <span>ROOM CODE</span>
            {isCheckingRoom && <span className="text-[#adc6ff] animate-pulse">Verifying...</span>}
            {roomInfo && <span className="text-emerald-400 font-semibold">Active Sanctuary</span>}
          </div>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. 8KX92LMQ"
            maxLength={12}
            id="room-code-input"
            className="w-full h-12 text-center font-mono text-base tracking-widest bg-[#171f33] border border-[#424754]/50 rounded-2xl text-[#dae2fd] shadow-inner focus:outline-none focus:border-[#adc6ff] focus:ring-1 focus:ring-[#adc6ff]/50 transition-all uppercase"
          />
        </div>

        {/* PIN Input Area */}
        <div className="pt-2 w-full max-w-sm mx-auto">
          <div className="text-center text-[11px] font-mono text-[#c2c6d6] mb-3">
            ENTER 6-DIGIT ACCESS PIN
          </div>
          <div className="flex justify-center gap-2 sm:gap-2.5 px-2" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                aria-label={`Digit ${idx + 1}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                id={`pin-input-${idx}`}
                className="w-12 h-14 text-center font-mono text-xl font-bold bg-[#171f33]/80 border border-[#424754]/50 rounded-xl text-[#dae2fd] shadow-inner focus:outline-none focus:border-[#adc6ff] focus:ring-2 focus:ring-[#adc6ff]/40 transition-all duration-300"
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#ffb4ab] text-xs font-mono animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pt-6 pb-2 w-full">
        <button
          onClick={handleJoin}
          disabled={isJoining || pin.length !== 6 || !roomCode.trim()}
          id="confirm-join-room-btn"
          className="w-full h-14 rounded-full bg-[#adc6ff] text-[#002e6a] font-semibold text-base flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(77,142,255,0.3)] hover:bg-[#adc6ff]/90 transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isJoining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span>Join Room</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
