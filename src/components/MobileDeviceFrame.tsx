import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Sparkles, Smartphone, Monitor } from 'lucide-react';

interface MobileDeviceFrameProps {
  children: React.ReactNode;
  isFrameMode: boolean;
  onToggleFrameMode: () => void;
  roomCode?: string;
}

export const MobileDeviceFrame: React.FC<MobileDeviceFrameProps> = ({
  children,
  isFrameMode,
  onToggleFrameMode,
  roomCode,
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const mins = d.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours % 12 || 12}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isFrameMode) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#070707] py-4 sm:py-8 px-2 sm:px-4 flex flex-col items-center justify-center">
      {/* Desktop Helper Bar */}
      <div className="w-full max-w-sm mb-3 flex items-center justify-between px-2 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-300">Mobile Native Viewport</span>
        </div>
        <button
          onClick={onToggleFrameMode}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] transition-colors cursor-pointer"
          title="Switch to full screen layout"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full Screen</span>
        </button>
      </div>

      {/* Realistic Mobile Device Frame */}
      <div className="relative w-full max-w-[420px] h-[860px] max-h-[92vh] bg-[#0C0C0C] rounded-[48px] border-[10px] border-[#222222] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_0_2px_#3a3a3a] overflow-hidden flex flex-col">
        {/* Dynamic Island / Mobile Notch */}
        <div className="absolute top-0 left-0 right-0 h-10 z-50 px-7 flex items-center justify-between text-white select-none pointer-events-none">
          <span className="text-[12px] font-bold font-sans tracking-tight">
            {currentTime || '9:41'}
          </span>

          {/* Notch Pill */}
          <div className="w-24 h-5 bg-black rounded-full border border-zinc-800/80 flex items-center justify-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-200">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Device Inner Content with Safe-Area padding */}
        <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden pt-8 pb-4 flex flex-col relative">
          {children}
        </div>

        {/* Mobile Home Bar Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-600 rounded-full z-50 pointer-events-none opacity-60" />
      </div>
    </div>
  );
};
