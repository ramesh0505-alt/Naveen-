import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/helpers';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstalled?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setPlatform('ios');
    } else if (/Android/i.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          onInstalled?.();
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      } finally {
        setInstalling(false);
      }
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div
      id="install-app-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/80 backdrop-blur-md animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#121419] border border-[#272A31] rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl text-[#F5F3EE] animate-scale-up">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#272A31] flex items-center justify-between bg-[#181B21]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#121419] border border-[#272A31] flex items-center justify-center text-[#E8D8B8]">
              <span className="material-symbols-outlined text-[18px]">install_mobile</span>
            </div>
            <div>
              <h2 className="font-editorial text-base text-[#F5F3EE] flex items-center gap-2">
                <span>Install Standalone</span>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#E8D8B8]/15 text-[#E8D8B8] border border-[#E8D8B8]/30">
                  PWA
                </span>
              </h2>
              <p className="font-body-sm text-[11px] text-[#9B9DA3]">
                Zero browser chrome & hardware haptics
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#121419] hover:bg-[#272A31] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4.5 space-y-3.5">
          {/* Key Advantages */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-[#181B21] border border-[#272A31] flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-[#E8D8B8] text-[16px]">shield</span>
              <span className="font-label-md text-[10px] font-bold text-[#F5F3EE]">Zero Logs</span>
              <span className="font-body-sm text-[9px] text-[#9B9DA3]">No telemetry</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#181B21] border border-[#272A31] flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-[#E8D8B8] text-[16px]">fullscreen</span>
              <span className="font-label-md text-[10px] font-bold text-[#F5F3EE]">Full Screen</span>
              <span className="font-body-sm text-[9px] text-[#9B9DA3]">Native layout</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#181B21] border border-[#272A31] flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-[#E8D8B8] text-[16px]">bolt</span>
              <span className="font-label-md text-[10px] font-bold text-[#F5F3EE]">Instant</span>
              <span className="font-body-sm text-[9px] text-[#9B9DA3]">Home dock</span>
            </div>
          </div>

          {/* Platform Tab Selector */}
          <div className="flex rounded-full bg-[#181B21] p-0.5 border border-[#272A31] font-label-md text-xs">
            <button
              onClick={() => setPlatform('ios')}
              className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer text-xs ${
                platform === 'ios'
                  ? 'bg-[#E8D8B8] text-[#121419] font-bold shadow-xs'
                  : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
              }`}
            >
              iOS Safari
            </button>
            <button
              onClick={() => setPlatform('android')}
              className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer text-xs ${
                platform === 'android'
                  ? 'bg-[#E8D8B8] text-[#121419] font-bold shadow-xs'
                  : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
              }`}
            >
              Android
            </button>
            <button
              onClick={() => setPlatform('desktop')}
              className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer text-xs ${
                platform === 'desktop'
                  ? 'bg-[#E8D8B8] text-[#121419] font-bold shadow-xs'
                  : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
              }`}
            >
              Desktop
            </button>
          </div>

          {/* Platform Instructions */}
          {platform === 'ios' && (
            <div className="bg-[#181B21] border border-[#272A31] rounded-xl p-3.5 space-y-2.5 font-body-sm text-xs">
              <div className="text-[#F5F3EE] font-semibold flex items-center gap-1.5 text-xs">
                <span>Installing on iPhone / iPad:</span>
              </div>
              <ol className="space-y-1.5 text-[#9B9DA3] list-none leading-relaxed text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-3.5 text-[#E8D8B8] font-bold">1.</span>
                  <span>
                    Tap the <strong className="text-[#F5F3EE]">Share</strong> icon at the bottom bar of Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-3.5 text-[#E8D8B8] font-bold">2.</span>
                  <span>
                    Scroll and select <strong className="text-[#F5F3EE]">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-3.5 text-[#E8D8B8] font-bold">3.</span>
                  <span>
                    Tap <strong className="text-[#F5F3EE]">Add</strong> in top-right corner.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {platform === 'android' && (
            <div className="bg-[#181B21] border border-[#272A31] rounded-xl p-3.5 space-y-2.5 font-body-sm text-xs">
              <div className="text-[#F5F3EE] font-semibold flex items-center justify-between text-xs">
                <span>Android Chrome / Samsung Internet:</span>
              </div>
              {deferredPrompt ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#9B9DA3]">
                    Ready to install! Tap below to add to your home launcher.
                  </p>
                  <button
                    onClick={handleInstallClick}
                    disabled={installing}
                    className="w-full py-3 bg-[#E8D8B8] hover:bg-[#F0E3C8] text-[#121419] font-label-md font-bold rounded-full text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>{installing ? 'Installing App...' : '1-Tap Install'}</span>
                  </button>
                </div>
              ) : (
                <ol className="space-y-1.5 text-[#9B9DA3] list-none leading-relaxed text-[11px]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#E8D8B8] font-bold">1.</span>
                    <span>Tap the menu <strong className="text-[#F5F3EE]">(⋮)</strong> in Chrome.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#E8D8B8] font-bold">2.</span>
                    <span>Select <strong className="text-[#F5F3EE]">Install app</strong> or <strong className="text-[#F5F3EE]">Add to Home screen</strong>.</span>
                  </li>
                </ol>
              )}
            </div>
          )}

          {platform === 'desktop' && (
            <div className="bg-[#181B21] border border-[#272A31] rounded-xl p-3.5 space-y-2.5 font-body-sm text-xs">
              <div className="text-[#F5F3EE] font-semibold flex items-center justify-between text-xs">
                <span>Desktop or Mobile Link:</span>
              </div>
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-2.5 bg-[#E8D8B8] text-[#121419] font-label-md font-bold rounded-full text-xs flex items-center justify-center gap-1.5 hover:bg-[#F0E3C8] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Install Desktop App</span>
                </button>
              ) : (
                <p className="text-[11px] text-[#9B9DA3] leading-relaxed">
                  In Chrome or Edge, click the install icon in the address bar to run standalone.
                </p>
              )}

              {/* QR Code toggle */}
              <div className="pt-2 border-t border-[#272A31] flex items-center justify-between">
                <span className="text-[11px] text-[#9B9DA3]">Scan with phone camera:</span>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="px-2.5 py-1 rounded-full bg-[#121419] hover:bg-[#272A31] text-[10px] text-[#E8D8B8] font-mono flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">qr_code</span>
                  <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
                </button>
              </div>

              {showQr && (
                <div className="p-3 bg-white rounded-xl flex flex-col items-center justify-center animate-fade-in">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      currentUrl
                    )}`}
                    alt="App URL QR Code"
                    className="w-32 h-32"
                  />
                  <span className="text-[10px] text-[#121419] font-mono mt-1 font-semibold">
                    Scan with Phone Camera
                  </span>
                </div>
              )}
            </div>
          )}

          {isInstalled && (
            <div className="p-2.5 rounded-xl bg-[#7ED6A5]/15 border border-[#7ED6A5]/30 flex items-center gap-2 text-xs text-[#7ED6A5] font-mono">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Running in standalone mobile mode.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#181B21] border-t border-[#272A31] flex items-center justify-between">
          <span className="text-[10px] text-[#6E7179] font-mono">
            Zero Telemetry • Velora PWA
          </span>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-1.5 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md text-xs font-bold hover:bg-[#F0E3C8] cursor-pointer transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
