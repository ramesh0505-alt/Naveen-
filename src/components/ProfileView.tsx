import React, { useState } from 'react';
import {
  ShieldCheck,
  Radio,
  History,
  Bell,
  Volume2,
  Mic,
  Trash2,
  LogOut,
  Sliders,
  Power,
  X,
  Sparkles,
  Check,
  Layers,
  Fingerprint,
  ArrowRight
} from 'lucide-react';
import { triggerHaptic } from '../utils/helpers';

interface ProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
  hasActiveSession?: boolean;
  onLeaveRoom?: () => void;
  onClearSession?: () => void;
  onTerminate?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  isOpen,
  onClose,
  currentRoomCode,
  hasActiveSession = false,
  onLeaveRoom,
  onClearSession,
  onTerminate,
}) => {
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(true);
  const [micAccessEnabled, setMicAccessEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/90 backdrop-blur-2xl animate-fade-in font-sans selection:bg-[#4d8eff]/30 selection:text-white">
      <div className="w-full max-w-lg bg-[#131b2e] border border-white/10 rounded-[32px] shadow-2xl p-6 sm:p-8 text-[#dae2fd] max-h-[90vh] overflow-y-auto flex flex-col gap-6 animate-scale-up relative">
        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#222a3d] hover:bg-[#2d3449] text-[#c2c6d6] hover:text-[#dae2fd] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1 pr-8">
          <h1 className="text-2xl font-bold text-[#dae2fd] tracking-tight">Private Profile</h1>
          <p className="text-xs sm:text-sm text-[#c2c6d6]">
            Manage your secure session, preferences, and local data footprint.
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[11px] font-mono text-[#adc6ff] tracking-widest uppercase font-semibold">
            Connection Status
          </h2>
          <div className="bg-[#171f33] rounded-2xl p-4 flex items-center justify-between border border-white/5 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#4d8eff]/20 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full bg-[#adc6ff]/10 pulsate"></div>
                <ShieldCheck className="w-6 h-6 text-[#adc6ff]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-[#dae2fd]">
                  {hasActiveSession ? 'Active Session' : 'Ephemeral Mode'}
                </span>
                <span className="text-xs text-[#c2c6d6]">End-to-end encrypted</span>
              </div>
            </div>
            <div className="px-3 py-1 bg-[#4d8eff] text-[#00285d] rounded-full flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00285d] pulsate"></div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Secure</span>
            </div>
          </div>
        </div>

        {/* Room Activity */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[11px] font-mono text-[#adc6ff] tracking-widest uppercase font-semibold">
            Room Activity
          </h2>
          <div className="bg-[#171f33] rounded-2xl overflow-hidden border border-white/5 flex flex-col divide-y divide-white/5 shadow-md">
            {currentRoomCode ? (
              <div className="p-4 flex items-center justify-between bg-[#171f33]">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#3e495d] flex items-center justify-center text-[#adc6ff]">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#dae2fd]">{currentRoomCode}</span>
                    <span className="text-xs text-[#adc6ff] font-mono">Active room connected</span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#4d8eff]/20 text-[#adc6ff] font-mono">
                  2/2 Connected
                </span>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#222a3d] flex items-center justify-center text-[#c2c6d6]">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#dae2fd]">Standby Mode</span>
                    <span className="text-xs text-[#8c909f]">No active rooms joined</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Local Preferences */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[11px] font-mono text-[#adc6ff] tracking-widest uppercase font-semibold">
            Local Preferences
          </h2>
          <div className="bg-[#171f33] rounded-2xl divide-y divide-white/5 border border-white/5 overflow-hidden shadow-md">
            {/* Toggle: Notifications */}
            <div
              onClick={() => {
                triggerHaptic('light');
                setPushEnabled(!pushEnabled);
              }}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222a3d]/50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <Bell className="w-5 h-5 text-[#c2c6d6]" />
                <span className="text-sm font-medium text-[#dae2fd]">Push Notifications</span>
              </div>
              <div
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  pushEnabled ? 'bg-[#adc6ff]' : 'bg-[#2d3449]'
                }`}
              >
                <div
                  className={`absolute left-1 top-1 w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${
                    pushEnabled ? 'translate-x-5 bg-[#002e6a]' : 'translate-x-0 bg-[#8c909f]'
                  }`}
                />
              </div>
            </div>

            {/* Toggle: Sound */}
            <div
              onClick={() => {
                triggerHaptic('light');
                setSoundsEnabled(!soundsEnabled);
              }}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222a3d]/50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <Volume2 className="w-5 h-5 text-[#c2c6d6]" />
                <span className="text-sm font-medium text-[#dae2fd]">In-App Sounds</span>
              </div>
              <div
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  soundsEnabled ? 'bg-[#adc6ff]' : 'bg-[#2d3449]'
                }`}
              >
                <div
                  className={`absolute left-1 top-1 w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${
                    soundsEnabled ? 'translate-x-5 bg-[#002e6a]' : 'translate-x-0 bg-[#8c909f]'
                  }`}
                />
              </div>
            </div>

            {/* Toggle: Microphone */}
            <div
              onClick={() => {
                triggerHaptic('light');
                setMicAccessEnabled(!micAccessEnabled);
              }}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222a3d]/50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <Mic className="w-5 h-5 text-[#c2c6d6]" />
                <span className="text-sm font-medium text-[#dae2fd]">Microphone Access</span>
              </div>
              <div
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  micAccessEnabled ? 'bg-[#adc6ff]' : 'bg-[#2d3449]'
                }`}
              >
                <div
                  className={`absolute left-1 top-1 w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${
                    micAccessEnabled ? 'translate-x-5 bg-[#002e6a]' : 'translate-x-0 bg-[#8c909f]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Controls */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[11px] font-mono text-[#adc6ff] tracking-widest uppercase font-semibold">
            Privacy Controls
          </h2>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onClearSession) onClearSession();
                showToast('Current session history cleared');
              }}
              className="bg-[#171f33] hover:bg-[#222a3d] transition-colors rounded-2xl p-4 flex items-center justify-between text-left group shadow-sm border border-white/5 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#dae2fd]">Clear Current Session</span>
                <span className="text-xs text-[#8c909f]">Removes chat history from this device</span>
              </div>
              <Trash2 className="w-5 h-5 text-[#8c909f] group-hover:text-[#adc6ff] transition-colors" />
            </button>

            {hasActiveSession && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  if (onLeaveRoom) onLeaveRoom();
                  onClose();
                }}
                className="bg-[#171f33] hover:bg-[#222a3d] transition-colors rounded-2xl p-4 flex items-center justify-between text-left group shadow-sm border border-white/5 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#dae2fd]">Leave Active Room</span>
                  <span className="text-xs text-[#8c909f]">Disconnect and erase presence</span>
                </div>
                <LogOut className="w-5 h-5 text-[#8c909f] group-hover:text-[#adc6ff] transition-colors" />
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('heavy');
                localStorage.clear();
                sessionStorage.clear();
                showToast('Temporary cached media purged');
              }}
              className="bg-[#93000a]/20 hover:bg-[#93000a]/35 transition-colors rounded-2xl p-4 flex items-center justify-between text-left group shadow-sm border border-[#ffb4ab]/20 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#ffb4ab]">Clear Temporary Data</span>
                <span className="text-xs text-[#ffb4ab]/70">Purge all cached media and keys</span>
              </div>
              <Trash2 className="w-5 h-5 text-[#ffb4ab]" />
            </button>
          </div>
        </div>

        {/* Device Identity */}
        <div className="flex flex-col gap-2 pt-2">
          <h2 className="text-[10px] font-mono text-[#8c909f] tracking-widest uppercase text-center">
            Device Identity
          </h2>
          <div className="bg-[#060e20] rounded-2xl p-3.5 flex flex-col gap-2 shadow-inner text-center border border-white/5">
            <div className="flex justify-between items-center px-3">
              <span className="text-xs text-[#8c909f]">Node ID</span>
              <span className="text-xs font-mono text-[#dae2fd] tracking-widest font-semibold">
                NX-84A9-2B
              </span>
            </div>
            <div className="flex justify-between items-center px-3">
              <span className="text-xs text-[#8c909f]">Session Key</span>
              <span className="text-xs font-mono text-[#dae2fd] tracking-widest opacity-80">
                v2_ecdsa_99x
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out / Terminate */}
        <div className="pt-2 pb-2">
          <button
            onClick={() => {
              triggerHaptic('heavy');
              if (onTerminate) {
                onTerminate();
              } else if (onLeaveRoom) {
                onLeaveRoom();
              }
              onClose();
            }}
            className="w-full bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] py-4 rounded-2xl font-bold text-sm shadow-[0_4px_16px_rgba(255,180,171,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
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
