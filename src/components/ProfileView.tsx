import React, { useState } from 'react';
import { triggerHaptic } from '../utils/helpers';
import { VELORA_SIGNATURE_LOGO } from './Navbar';

interface ProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
  hasActiveSession?: boolean;
  onLeaveRoom?: () => void;
  onClearSession?: () => void;
  onTerminate?: () => void;
}

const PROFILE_AVATAR_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBalYKgYDqECsx0ihis1uLrrCCfy_yRN1Na3Sgizu38frYqn6jNoQe8O9sayEGWjQ1xEq6wj8H7WtklBDc5imaVSa22b0wCNaAkKHqOaJL0T1zuDtHfZ7j3oc8sWWDnoGrSQtoOYxCr678Wtya_Vi5lJe7y9nXG1uRGqbCIX0GOztMq77kFu-fdaa9XiFgXClIZ-WfzCoL-L6YhHSWjR0zZ_G8DjrtTh2qbnPZUqMcUKh4C3uhi_tTb';

export const ProfileView: React.FC<ProfileViewProps> = ({
  isOpen,
  onClose,
  currentRoomCode,
  hasActiveSession = false,
  onLeaveRoom,
  onClearSession,
  onTerminate,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [deviceLockEnabled, setDeviceLockEnabled] = useState<boolean>(true);
  const [soundMode, setSoundMode] = useState<'Subtle' | 'Muted' | 'Standard'>('Subtle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#111318]/90 backdrop-blur-2xl animate-fade-in select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-[#111318] border border-white/[0.08] rounded-[28px] shadow-2xl p-6 sm:p-8 text-[#e2e2e9] max-h-[92vh] overflow-y-auto flex flex-col gap-7 animate-scale-up relative scrollbar-hide">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <img
              src={VELORA_SIGNATURE_LOGO}
              alt="Velora Logo"
              className="h-6 w-auto object-contain"
            />
            <span className="font-display-sm text-2xl tracking-tight text-[#e2e2e9]">Profile</span>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#1e2025] hover:bg-[#282a2f] text-[#c7c6cb] hover:text-[#e2e2e9] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-[#33353a] overflow-hidden relative border border-white/10 shadow-lg flex-shrink-0">
            <img
              src={PROFILE_AVATAR_IMAGE}
              alt="User Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-display-sm text-3xl leading-tight text-[#e2e2e9]">
              Alex Mercer
            </h1>
            <p className="font-label-md text-sm font-medium text-[#c7c6cb] flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb3af] shadow-[0_0_8px_rgba(255,179,175,0.4)]"></span>
              <span>{hasActiveSession ? 'Online · In Session' : 'Online · Standby'}</span>
            </p>
          </div>
        </div>

        {/* Session Section */}
        <section className="flex flex-col gap-3">
          <h2 className="font-label-md text-xs font-semibold text-[#c7c6cb] uppercase tracking-[0.1em] pl-1">
            Session
          </h2>
          <div className="bg-[#282a2f] rounded-[20px] overflow-hidden flex flex-col border border-white/[0.03] divide-y divide-white/[0.04]">
            {/* Active Devices */}
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#ffb3af] text-[24px]">devices</span>
                <div>
                  <p className="font-body-md text-sm text-[#e2e2e9] font-medium leading-tight">Active Devices</p>
                  <p className="font-label-sm text-xs text-[#c7c6cb] mt-0.5">2 currently linked</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#c7c6cb]/50 text-[20px]">chevron_right</span>
            </div>

            {/* Active Rooms */}
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#c7c6ca] text-[24px]">meeting_room</span>
                <div>
                  <p className="font-body-md text-sm text-[#e2e2e9] font-medium leading-tight">Active Rooms</p>
                  <p className="font-label-sm text-xs text-[#c7c6cb] mt-0.5">
                    {currentRoomCode ? `1 secure session (${currentRoomCode})` : '0 secure sessions open'}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#c7c6cb]/50 text-[20px]">chevron_right</span>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="flex flex-col gap-3">
          <h2 className="font-label-md text-xs font-semibold text-[#c7c6cb] uppercase tracking-[0.1em] pl-1">
            Preferences
          </h2>
          <div className="bg-[#282a2f] rounded-[20px] overflow-hidden flex flex-col border border-white/[0.03] divide-y divide-white/[0.04]">
            {/* Notifications Toggle */}
            <div
              onClick={() => {
                triggerHaptic('light');
                setNotificationsEnabled(!notificationsEnabled);
              }}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#e2e2e9] text-[22px]">notifications</span>
                <p className="font-body-md text-sm text-[#e2e2e9] font-medium">Notifications</p>
              </div>
              <div
                className={`w-[52px] h-[32px] rounded-full p-1 flex items-center relative transition-colors duration-300 ${
                  notificationsEnabled ? 'bg-[#ffb3af]/20' : 'bg-[#33353a]'
                }`}
              >
                <div
                  className={`w-[24px] h-[24px] rounded-full transform transition-transform duration-300 shadow-sm ${
                    notificationsEnabled ? 'translate-x-5 bg-[#ffb3af]' : 'translate-x-0 bg-[#c7c6cb]'
                  }`}
                ></div>
              </div>
            </div>

            {/* Face / Device Lock Toggle */}
            <div
              onClick={() => {
                triggerHaptic('light');
                setDeviceLockEnabled(!deviceLockEnabled);
              }}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#e2e2e9] text-[22px]">face</span>
                <p className="font-body-md text-sm text-[#e2e2e9] font-medium">Face / Device Lock</p>
              </div>
              <div
                className={`w-[52px] h-[32px] rounded-full p-1 flex items-center relative transition-colors duration-300 ${
                  deviceLockEnabled ? 'bg-[#ffb3af]/20' : 'bg-[#33353a]'
                }`}
              >
                <div
                  className={`w-[24px] h-[24px] rounded-full transform transition-transform duration-300 shadow-sm ${
                    deviceLockEnabled ? 'translate-x-5 bg-[#ffb3af]' : 'translate-x-0 bg-[#c7c6cb]'
                  }`}
                ></div>
              </div>
            </div>

            {/* Sound & Haptics */}
            <div
              onClick={() => {
                triggerHaptic('light');
                const next = soundMode === 'Subtle' ? 'Standard' : soundMode === 'Standard' ? 'Muted' : 'Subtle';
                setSoundMode(next);
              }}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#e2e2e9] text-[22px]">vibration</span>
                <p className="font-body-md text-sm text-[#e2e2e9] font-medium">Sound &amp; Haptics</p>
              </div>
              <span className="font-label-md text-xs font-normal text-[#c7c6cb] bg-[#1e2025] px-3 py-1 rounded-full border border-white/5">
                {soundMode}
              </span>
            </div>

            {/* Data & Storage / Purge Cache */}
            <div
              onClick={() => {
                triggerHaptic('medium');
                if (onClearSession) onClearSession();
                showToast('Temporary cached media purged');
              }}
              className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#e2e2e9] text-[22px]">storage</span>
                <p className="font-body-md text-sm text-[#e2e2e9] font-medium">Data &amp; Storage</p>
              </div>
              <span className="material-symbols-outlined text-[#c7c6cb]/50 text-[20px]">chevron_right</span>
            </div>
          </div>
        </section>

        {/* Return Home / Leave Session Action */}
        <div className="flex flex-col gap-2.5 pt-2">
          {hasActiveSession && onLeaveRoom && (
            <button
              onClick={() => {
                triggerHaptic('medium');
                onLeaveRoom();
                onClose();
              }}
              className="w-full bg-[#93000a]/20 hover:bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/20 font-label-md text-sm py-3.5 rounded-[18px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">meeting_room</span>
              <span>Leave Active Room</span>
            </button>
          )}

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-full bg-[#33353a]/60 hover:bg-[#33353a] transition-colors text-[#e2e2e9] font-label-md text-sm py-3.5 rounded-[18px] flex items-center justify-center gap-2 border border-white/[0.05] shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-[#c7c6cb]">logout</span>
            <span>Return Home</span>
          </button>
        </div>
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
