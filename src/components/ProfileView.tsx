import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#121419] border border-[#272A31] rounded-[28px] shadow-2xl p-6 text-[#F5F3EE] max-h-[90vh] overflow-y-auto flex flex-col gap-5 animate-scale-up relative">
        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#181B21] hover:bg-[#272A31] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Header */}
        <div className="flex flex-col gap-0.5 pr-8">
          <span className="font-mono text-[10px] text-[#E8D8B8] uppercase tracking-widest block font-semibold">
            Security & Identity
          </span>
          <h1 className="font-editorial text-2xl text-[#F5F3EE] tracking-tight">Private Profile</h1>
          <p className="font-body-sm text-xs text-[#9B9DA3]">
            Manage your secure session, hardware access, and local data footprint.
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] text-[#E8D8B8] tracking-widest uppercase font-semibold">
            Connection Status
          </h2>
          <div className="bg-[#181B21] rounded-xl p-3.5 flex items-center justify-between border border-[#272A31] shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8D8B8]/15 flex items-center justify-center relative">
                <span className="material-symbols-outlined text-[#E8D8B8] text-[20px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-sm font-semibold text-[#F5F3EE]">
                  {hasActiveSession ? 'Active Session' : 'Ephemeral Standby'}
                </span>
                <span className="font-body-sm text-[11px] text-[#9B9DA3]">End-to-end encrypted</span>
              </div>
            </div>
            <div className="px-3 py-0.5 bg-[#E8D8B8] text-[#121419] rounded-full flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#121419] animate-pulse"></div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Active</span>
            </div>
          </div>
        </div>

        {/* Room Activity */}
        <div className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] text-[#E8D8B8] tracking-widest uppercase font-semibold">
            Room Activity
          </h2>
          <div className="bg-[#181B21] rounded-xl overflow-hidden border border-[#272A31] flex flex-col divide-y divide-[#272A31] shadow-sm">
            {currentRoomCode ? (
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#121419] border border-[#272A31] flex items-center justify-center text-[#E8D8B8]">
                    <span className="material-symbols-outlined text-[18px]">sensors</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold text-[#F5F3EE]">{currentRoomCode}</span>
                    <span className="font-mono text-[11px] text-[#7ED6A5]">Active Room Connected</span>
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#E8D8B8]/15 text-[#E8D8B8] font-mono border border-[#E8D8B8]/30">
                  2/2 Devices
                </span>
              </div>
            ) : (
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#121419] border border-[#272A31] flex items-center justify-center text-[#9B9DA3]">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs font-semibold text-[#F5F3EE]">Standby Mode</span>
                    <span className="font-body-sm text-[11px] text-[#9B9DA3]">No active rooms joined</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Local Preferences */}
        <div className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] text-[#E8D8B8] tracking-widest uppercase font-semibold">
            Local Preferences
          </h2>
          <div className="bg-[#181B21] rounded-xl divide-y divide-[#272A31] border border-[#272A31] overflow-hidden shadow-sm">
            {/* Toggle: Notifications */}
            <div
              onClick={() => {
                triggerHaptic('light');
                setPushEnabled(!pushEnabled);
              }}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#272A31] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9B9DA3] text-[18px]">notifications</span>
                <span className="font-body-sm text-xs text-[#F5F3EE]">Push Notifications</span>
              </div>
              <div
                className={`relative w-10 h-6 rounded-full transition-colors duration-300 ${
                  pushEnabled ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                }`}
              >
                <div
                  className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${
                    pushEnabled ? 'translate-x-4 bg-[#121419]' : 'translate-x-0 bg-[#9B9DA3]'
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
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#272A31] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9B9DA3] text-[18px]">volume_up</span>
                <span className="font-body-sm text-xs text-[#F5F3EE]">In-App Sounds</span>
              </div>
              <div
                className={`relative w-10 h-6 rounded-full transition-colors duration-300 ${
                  soundsEnabled ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                }`}
              >
                <div
                  className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${
                    soundsEnabled ? 'translate-x-4 bg-[#121419]' : 'translate-x-0 bg-[#9B9DA3]'
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
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#272A31] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9B9DA3] text-[18px]">mic</span>
                <span className="font-body-sm text-xs text-[#F5F3EE]">Microphone Access</span>
              </div>
              <div
                className={`relative w-10 h-6 rounded-full transition-colors duration-300 ${
                  micAccessEnabled ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                }`}
              >
                <div
                  className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${
                    micAccessEnabled ? 'translate-x-4 bg-[#121419]' : 'translate-x-0 bg-[#9B9DA3]'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Controls */}
        <div className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] text-[#E8D8B8] tracking-widest uppercase font-semibold">
            Privacy Controls
          </h2>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onClearSession) onClearSession();
                showToast('Current session history cleared');
              }}
              className="bg-[#181B21] hover:bg-[#272A31] transition-colors rounded-xl p-3 flex items-center justify-between text-left group shadow-sm border border-[#272A31] cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-label-md text-xs text-[#F5F3EE]">Clear Current Session</span>
                <span className="font-body-sm text-[11px] text-[#9B9DA3]">Removes chat history from this device</span>
              </div>
              <span className="material-symbols-outlined text-[#9B9DA3] group-hover:text-[#E8D8B8] text-[18px] transition-colors">
                delete
              </span>
            </button>

            {hasActiveSession && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  if (onLeaveRoom) onLeaveRoom();
                  onClose();
                }}
                className="bg-[#181B21] hover:bg-[#272A31] transition-colors rounded-xl p-3 flex items-center justify-between text-left group shadow-sm border border-[#272A31] cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-label-md text-xs text-[#F5F3EE]">Leave Active Room</span>
                  <span className="font-body-sm text-[11px] text-[#9B9DA3]">Disconnect and erase presence</span>
                </div>
                <span className="material-symbols-outlined text-[#9B9DA3] group-hover:text-[#E8D8B8] text-[18px] transition-colors">
                  logout
                </span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('heavy');
                localStorage.clear();
                sessionStorage.clear();
                showToast('Temporary cached media purged');
              }}
              className="bg-[#FF5C5C]/10 hover:bg-[#FF5C5C]/15 transition-colors rounded-xl p-3 flex items-center justify-between text-left group shadow-sm border border-[#FF5C5C]/20 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-label-md text-xs text-[#FF5C5C]">Clear Temporary Data</span>
                <span className="font-body-sm text-[11px] text-[#FF5C5C]/70">Purge all cached media and keys</span>
              </div>
              <span className="material-symbols-outlined text-[#FF5C5C] text-[18px]">delete_forever</span>
            </button>
          </div>
        </div>

        {/* Device Identity */}
        <div className="flex flex-col gap-1.5 pt-1">
          <h2 className="font-mono text-[9px] text-[#6E7179] tracking-widest uppercase text-center">
            Device Identity
          </h2>
          <div className="bg-[#181B21] rounded-xl p-3 flex flex-col gap-1.5 shadow-inner text-center border border-[#272A31]">
            <div className="flex justify-between items-center px-2">
              <span className="font-body-sm text-[11px] text-[#9B9DA3]">Node ID</span>
              <span className="font-mono text-xs text-[#F5F3EE] tracking-widest font-semibold">
                NX-84A9-2B
              </span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="font-body-sm text-[11px] text-[#9B9DA3]">Session Protocol</span>
              <span className="font-mono text-[11px] text-[#E8D8B8] tracking-widest opacity-80">
                v2_ecdsa_99x
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out / Terminate */}
        <div className="pt-1 pb-1">
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
            className="w-full bg-[#FF5C5C] text-[#0B0C0F] hover:bg-[#FF7373] py-3 rounded-full font-label-md font-bold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
            <span>Terminate Session</span>
          </button>
        </div>
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
