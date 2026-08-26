import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  QrCode,
  Shield,
  Zap,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-[#F0F0F0] animate-scale-up font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#222] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>Install Mobile App</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  PWA Ready
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Run standalone with zero browser chrome & native haptics
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Key Advantages */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col items-center gap-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-zinc-200">Zero Logs</span>
              <span className="text-[9px] text-zinc-500">No telemetry</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col items-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold text-zinc-200">Full Screen</span>
              <span className="text-[9px] text-zinc-500">Native feel</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-bold text-zinc-200">Fast Launch</span>
              <span className="text-[9px] text-zinc-500">Home screen</span>
            </div>
          </div>

          {/* Platform Tab Selector */}
          <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setPlatform('ios')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                platform === 'ios'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              iOS / iPhone
            </button>
            <button
              onClick={() => setPlatform('android')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                platform === 'android'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Android
            </button>
            <button
              onClick={() => setPlatform('desktop')}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                platform === 'desktop'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Desktop
            </button>
          </div>

          {/* Platform Instructions */}
          {platform === 'ios' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="text-zinc-300 font-semibold flex items-center gap-2">
                <span>How to install on iOS Safari:</span>
              </div>
              <ol className="space-y-2 text-zinc-400 list-decimal list-inside leading-relaxed text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-4 text-emerald-400 font-bold">1.</span>
                  <span>
                    Tap the <strong className="text-white">Share</strong> icon{' '}
                    <Share className="inline w-3.5 h-3.5 mx-0.5 text-sky-400" /> at bottom of Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-4 text-emerald-400 font-bold">2.</span>
                  <span>
                    Scroll down and select{' '}
                    <strong className="text-white">Add to Home Screen</strong>{' '}
                    <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-emerald-400" />.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-4 text-emerald-400 font-bold">3.</span>
                  <span>
                    Tap <strong className="text-white">Add</strong> in the top right corner.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {platform === 'android' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="text-zinc-300 font-semibold flex items-center justify-between">
                <span>Android Chrome / Samsung Internet:</span>
              </div>
              {deferredPrompt ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-400">
                    Ready to install! Tap below to add Private 2P directly to your application drawer.
                  </p>
                  <button
                    onClick={handleInstallClick}
                    disabled={installing}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>{installing ? 'Installing App...' : 'Install 1-Tap App'}</span>
                  </button>
                </div>
              ) : (
                <ol className="space-y-2 text-zinc-400 list-decimal list-inside leading-relaxed text-[11px]">
                  <li>
                    Tap the browser menu <strong className="text-white">(⋮)</strong> in Chrome.
                  </li>
                  <li>
                    Select <strong className="text-white">Install app</strong> or{' '}
                    <strong className="text-white">Add to Home screen</strong>.
                  </li>
                  <li>Confirm installation to launch as standalone mobile app.</li>
                </ol>
              )}
            </div>
          )}

          {platform === 'desktop' && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="text-zinc-300 font-semibold flex items-center justify-between">
                <span>Desktop PWA or Mobile Hand-off:</span>
              </div>
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Desktop App</span>
                </button>
              ) : (
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  In Chrome or Edge, click the install icon in your address bar to install on your computer.
                </p>
              )}

              {/* QR Code toggle */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Scan to open on phone:</span>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
                </button>
              </div>

              {showQr && (
                <div className="p-3 bg-white rounded-xl flex flex-col items-center justify-center animate-fade-in">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      currentUrl
                    )}`}
                    alt="App URL QR Code"
                    className="w-36 h-36"
                  />
                  <span className="text-[10px] text-black font-mono mt-1 font-semibold">
                    Scan with Phone Camera
                  </span>
                </div>
              )}
            </div>
          )}

          {isInstalled && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-300 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>App is installed and running in standalone mobile mode.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#161616] border-t border-[#222] flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono">
            Zero Server Logs • PWA v2.0
          </span>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
