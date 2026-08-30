import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getRoomFullUrl, copyToClipboard, formatTimeRemaining, triggerHaptic } from '../utils/helpers';
import { QrScannerModal } from './QrScannerModal';

interface ShareRoomViewProps {
  roomCode: string;
  pin: string;
  expiresAt: number;
  onEnterRoom: () => void;
  onScanPartnerQr?: (scannedCode: string, scannedPin?: string) => void;
}

export const ShareRoomView: React.FC<ShareRoomViewProps> = ({
  roomCode,
  pin,
  expiresAt,
  onEnterRoom,
  onScanPartnerQr,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
  const [includePinInQr, setIncludePinInQr] = useState<boolean>(true);
  const [isFullscreenQr, setIsFullscreenQr] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [savedImageSuccess, setSavedImageSuccess] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>(() => formatTimeRemaining(expiresAt));

  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrFullscreenRef = useRef<HTMLDivElement>(null);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(formatTimeRemaining(expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const qrUrl = getRoomFullUrl(roomCode, includePinInQr ? pin : undefined);
  const cleanRoomUrl = getRoomFullUrl(roomCode);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(cleanRoomUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPin = async () => {
    const ok = await copyToClipboard(pin);
    if (ok) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleCopyFull = async () => {
    const text = `Join my private 2-person room:\nLink: ${cleanRoomUrl}\nPIN: ${pin}\n(Expires in ${remainingTime})`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    }
  };

  const handleShare = async () => {
    triggerHaptic('selection');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Private Room Invite',
          text: `Join my private 2-person space.\nPIN: ${pin}\nLink: ${qrUrl}`,
          url: qrUrl,
        });
      } catch {}
    } else {
      handleCopyFull();
    }
  };

  const handleDownloadQr = () => {
    triggerHaptic('medium');
    try {
      const svgElement = qrContainerRef.current?.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `private-room-${roomCode}-qr.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          setSavedImageSuccess(true);
          setTimeout(() => setSavedImageSuccess(false), 2500);
        }
      };

      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    } catch (err) {
      console.warn('Failed to export QR image:', err);
    }
  };

  const handleScanSuccess = (data: { roomCode: string; pin?: string }) => {
    setIsScannerOpen(false);
    if (onScanPartnerQr) {
      onScanPartnerQr(data.roomCode, data.pin);
    }
  };

  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100vh-140px)] items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none animate-fade-in pb-20 sm:pb-8">
      {/* Main Container Card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full bg-[#121419] rounded-[28px] p-5 sm:p-7 shadow-2xl border border-[#272A31] text-center">
        {/* Status Badge & Room Lifetime */}
        <div className="flex items-center justify-between w-full mb-3 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181B21] border border-[#272A31] text-[11px] font-label-sm text-[#7ED6A5]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7ED6A5] animate-pulse"></span>
            <span>Room Ready</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#181B21] border border-[#272A31] text-[11px] font-mono text-[#E8D8B8]" title="Room Lifetime">
            <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
            <span>{remainingTime}</span>
          </div>
        </div>

        {/* Header Title */}
        <h1 className="font-editorial text-2xl text-[#F5F3EE] mb-1 tracking-tight">
          Scan to Connect
        </h1>
        <p className="font-body-sm text-xs text-[#9B9DA3] mb-3 max-w-xs leading-relaxed">
          Show this QR code to your partner or scan their screen to enter the room together.
        </p>

        {/* Scan Partner QR Bar */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setIsScannerOpen(true);
          }}
          id="share-scan-partner-qr-btn"
          className="w-full mb-3 py-2.5 px-4 rounded-xl bg-[#1C2027] hover:bg-[#252A34] text-[#E8D8B8] border border-[#E8D8B8]/30 hover:border-[#E8D8B8]/60 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px] text-[#E8D8B8] group-hover:scale-110 transition-transform">
            photo_camera
          </span>
          <span>Scan Partner's QR</span>
          <span className="text-[10px] bg-[#E8D8B8]/15 text-[#E8D8B8] px-1.5 py-0.5 rounded font-mono ml-auto">
            Camera
          </span>
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#181B21] p-1 rounded-xl border border-[#272A31] w-full mb-3">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('qr');
            }}
            id="share-tab-qr"
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#E8D8B8] text-[#121419] shadow-sm font-bold'
                : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">qr_code_scanner</span>
            <span>Show QR Code</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('manual');
            }}
            id="share-tab-manual"
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-[#E8D8B8] text-[#121419] shadow-sm font-bold'
                : 'text-[#9B9DA3] hover:text-[#F5F3EE]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">password</span>
            <span>Code & PIN</span>
          </button>
        </div>

        {/* QR Code Tab View */}
        {activeTab === 'qr' && (
          <div className="flex flex-col items-center w-full animate-fade-in">
            {/* White QR Code Plate */}
            <div className="relative group p-3 bg-white rounded-2xl shadow-xl border border-white/20 mb-3 flex flex-col items-center justify-center">
              <div ref={qrContainerRef} className="p-1">
                <QRCodeSVG
                  value={qrUrl}
                  size={184}
                  bgColor="#FFFFFF"
                  fgColor="#0B0C0F"
                  level="Q"
                  marginSize={1}
                  imageSettings={{
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%230B0C0F"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
              </div>

              {/* Fullscreen Expand Action Button */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsFullscreenQr(true);
                }}
                id="share-expand-qr-btn"
                className="absolute top-2 right-2 w-7 h-7 bg-[#121419]/90 hover:bg-[#121419] text-[#E8D8B8] rounded-lg flex items-center justify-center backdrop-blur-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                title="Fullscreen QR for scanning"
              >
                <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              </button>
            </div>

            {/* PIN Inclusion Switch */}
            <div className="w-full bg-[#181B21] rounded-xl p-2.5 px-3 border border-[#272A31] flex items-center justify-between gap-2 mb-3">
              <div className="text-left">
                <div className="text-xs font-semibold text-[#F5F3EE] flex items-center gap-1">
                  <span>1-Tap Connect</span>
                  {includePinInQr ? (
                    <span className="text-[10px] bg-[#7ED6A5]/15 text-[#7ED6A5] px-1.5 py-0.2 rounded font-mono">
                      PIN Embedded
                    </span>
                  ) : (
                    <span className="text-[10px] bg-[#9B9DA3]/20 text-[#9B9DA3] px-1.5 py-0.2 rounded font-mono">
                      Manual PIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9B9DA3] leading-tight mt-0.5">
                  {includePinInQr
                    ? 'Scanning auto-fills the 6-digit PIN'
                    : 'Partner will manually type PIN'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={includePinInQr}
                onClick={() => {
                  triggerHaptic('selection');
                  setIncludePinInQr(!includePinInQr);
                }}
                id="share-toggle-pin-in-qr"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  includePinInQr ? 'bg-[#E8D8B8]' : 'bg-[#272A31]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#121419] shadow ring-0 transition duration-200 ease-in-out ${
                    includePinInQr ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quick credentials chip below QR */}
            <div className="grid grid-cols-2 gap-2 w-full mb-3">
              <div className="bg-[#181B21] rounded-xl p-2 border border-[#272A31] flex flex-col items-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#9B9DA3]">Room Code</span>
                <span className="font-mono text-sm font-bold text-[#E8D8B8]">{roomCode}</span>
              </div>
              <div className="bg-[#181B21] rounded-xl p-2 border border-[#272A31] flex flex-col items-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#9B9DA3]">Access PIN</span>
                <span className="font-mono text-sm font-bold text-[#F5F3EE] tracking-wider">{pin}</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Credentials Tab View */}
        {activeTab === 'manual' && (
          <div className="w-full space-y-2.5 mb-4 text-left animate-fade-in">
            {/* Room Code */}
            <div className="w-full bg-[#181B21] rounded-xl p-3 border border-[#272A31]">
              <span className="font-label-sm text-[10px] text-[#9B9DA3] mb-0.5 block uppercase tracking-wider font-mono">
                Room Code
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-[#E8D8B8] select-all tracking-wider">
                  {roomCode}
                </span>
                <span className="text-[11px] font-mono text-[#7ED6A5] bg-[#7ED6A5]/10 px-2 py-0.5 rounded border border-[#7ED6A5]/20">
                  Active
                </span>
              </div>
            </div>

            {/* Link */}
            <div className="w-full bg-[#181B21] rounded-xl p-3 border border-[#272A31]">
              <span className="font-label-sm text-[10px] text-[#9B9DA3] mb-1 block uppercase tracking-wider font-mono">
                Shareable Link
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#E8D8B8] truncate select-all">
                  {cleanRoomUrl.replace(/^https?:\/\//, '')}
                </span>
                <button
                  onClick={handleCopyLink}
                  id="share-copy-link-btn"
                  className="w-7 h-7 rounded-lg bg-[#272A31] flex items-center justify-center text-[#F5F3EE] hover:text-[#E8D8B8] transition-colors shrink-0 cursor-pointer"
                  title="Copy Link"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedLink ? 'done' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* PIN */}
            <div className="w-full bg-[#181B21] rounded-xl p-3 border border-[#272A31]">
              <span className="font-label-sm text-[10px] text-[#9B9DA3] mb-1 block uppercase tracking-wider font-mono">
                Access PIN
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#F5F3EE] select-all">
                  {pin}
                </span>
                <button
                  onClick={handleCopyPin}
                  id="share-copy-pin-btn"
                  className="w-7 h-7 rounded-lg bg-[#272A31] flex items-center justify-center text-[#F5F3EE] hover:text-[#E8D8B8] transition-colors shrink-0 cursor-pointer"
                  title="Copy PIN"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedPin ? 'done' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-2 pt-1">
          <button
            onClick={() => {
              triggerHaptic('medium');
              onEnterRoom();
            }}
            id="share-enter-room-btn"
            className="w-full py-3 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-[#F0E3C8] transition-all cursor-pointer active:scale-98"
          >
            <span>Enter Room</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={handleShare}
              id="share-system-btn"
              className="py-2.5 rounded-full bg-[#181B21] hover:bg-[#272A31] text-[#E8D8B8] font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#272A31] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copiedFull ? 'done' : 'share'}
              </span>
              <span>{copiedFull ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={handleDownloadQr}
              id="share-save-qr-btn"
              className="py-2.5 rounded-full bg-[#181B21] hover:bg-[#272A31] text-[#F5F3EE] font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#272A31] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">
                {savedImageSuccess ? 'check_circle' : 'download'}
              </span>
              <span>{savedImageSuccess ? 'Saved' : 'Save QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Enlarge QR Modal for High-Glare or Phone-to-Phone Scanning */}
      {isFullscreenQr && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={() => setIsFullscreenQr(false)}
        >
          <div
            className="bg-[#121419] border border-[#272A31] rounded-3xl p-6 sm:p-8 flex flex-col items-center max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-4">
              <span className="font-mono text-xs text-[#E8D8B8] uppercase tracking-wider font-semibold">
                Scan with Phone Camera
              </span>
              <button
                onClick={() => setIsFullscreenQr(false)}
                className="w-8 h-8 rounded-full bg-[#181B21] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* High-Contrast Large QR */}
            <div ref={qrFullscreenRef} className="p-4 bg-white rounded-2xl shadow-2xl mb-4">
              <QRCodeSVG
                value={qrUrl}
                size={240}
                bgColor="#FFFFFF"
                fgColor="#0B0C0F"
                level="H"
                marginSize={1}
                imageSettings={{
                  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%230B0C0F"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>

            <div className="w-full bg-[#181B21] rounded-xl p-3 border border-[#272A31] mb-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#9B9DA3]">ROOM: <strong className="text-[#E8D8B8]">{roomCode}</strong></span>
                <span className="text-[#9B9DA3]">PIN: <strong className="text-[#F5F3EE] tracking-wider">{pin}</strong></span>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreenQr(false)}
              className="w-full py-2.5 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold text-xs cursor-pointer hover:bg-[#F0E3C8] transition-colors"
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
