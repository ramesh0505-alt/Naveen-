import React, { useState, useEffect } from 'react';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  loadNotificationPreferences,
  saveNotificationPreferences,
  subscribeUserToPush,
} from '../utils/notifications';
import { triggerHaptic } from '../utils/helpers';

interface NotificationPermissionBannerProps {
  roomCode: string;
  sessionToken?: string;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  roomCode,
  sessionToken,
}) => {
  const [permissionState, setPermissionState] = useState<string>(getNotificationPermissionState());
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    const prefs = loadNotificationPreferences();
    const currentPerm = getNotificationPermissionState();
    setPermissionState(currentPerm);

    // Only show prompt if permission is 'default' and user hasn't explicitly dismissed this session
    if (currentPerm === 'default' && !prefs.permissionPromptDismissed && roomCode) {
      // Delay showing by 1.5s so user can settle into room
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(true);
    }
  }, [roomCode]);

  if (isDismissed || permissionState !== 'default') {
    return null;
  }

  const handleAllow = async () => {
    triggerHaptic('impact');
    const result = await requestNotificationPermission();
    setPermissionState(result);
    setIsDismissed(true);

    const prefs = loadNotificationPreferences();
    saveNotificationPreferences({
      ...prefs,
      enabled: result === 'granted',
      permissionPromptDismissed: true,
    });

    if (result === 'granted' && sessionToken && roomCode) {
      await subscribeUserToPush(sessionToken, roomCode);
    }
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setIsDismissed(true);
    const prefs = loadNotificationPreferences();
    saveNotificationPreferences({
      ...prefs,
      permissionPromptDismissed: true,
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto mb-3 px-4 animate-fade-in select-none">
      <div className="p-4 rounded-2xl bg-[#121419]/95 border border-[#E8D8B8]/40 shadow-xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#181B21] border border-[#E8D8B8]/30 flex items-center justify-center text-[#E8D8B8] flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-editorial text-sm text-[#F5F3EE] tracking-tight">
              Stay connected
            </h4>
            <p className="font-body-sm text-xs text-[#9B9DA3] mt-0.5 leading-relaxed">
              Allow VELORA to notify you when your private space receives a message, voice note, or audio call.
            </p>

            <div className="flex items-center gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleAllow}
                className="px-4 py-1.5 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md text-xs font-bold hover:bg-[#F0E3C8] transition-colors cursor-pointer shadow-sm"
              >
                Allow Notifications
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-full text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#181B21] font-label-md text-xs transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
