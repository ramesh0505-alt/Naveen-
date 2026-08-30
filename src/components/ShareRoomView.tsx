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
      <div className="relative z-10 flex flex-col items-center max-w-md w-full bg-[#1e2025] rounded-[28px] p-5 sm:p-7 shadow-2xl border border-white/5 text-center">
        {/* Status Badge & Room Lifetime */}
        <div className="flex items-center justify-between w-full mb-3 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111318] border border-white/5 text-[11px] font-label-sm text-[#ffb3af]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb3af] animate-pulse"></span>
            <span>Room Ready</span>
          </div>

          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#111318] border border-white/5 text-[11px] font-mono text-[#c7c6cb]"
            title="Room Lifetime"
          >
            <span className="material-symbols-outlined text-[13px] text-[#ffb3af]">hourglass_top</span>
            <span>{remainingTime}</span>
          </div>
        </div>

        {/* Header Title */}
        <h1 className="font-display-sm text-2xl text-[#e2e2e9] mb-1 tracking-tight">
          Scan to Connect
        </h1>
        <p className="font-body-md text-xs text-[#c7c6cb] mb-3 max-w-xs leading-relaxed">
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
          className="w-full mb-3 py-2.5 px-4 rounded-xl bg-[#282a2f] hover:bg-[#33353a] text-[#e2e2e9] border border-white/10 hover:border-[#ffb3af]/40 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px] text-[#ffb3af] group-hover:scale-110 transition-transform">
            photo_camera
          </span>
          <span>Scan Partner's QR</span>
          <span className="text-[10px] bg-[#ffb3af]/15 text-[#ffb3af] px-1.5 py-0.5 rounded font-mono ml-auto">
            Camera
          </span>
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#111318] p-1 rounded-xl border border-white/5 w-full mb-3">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('qr');
            }}
            id="share-tab-qr"
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#c7c6ca] text-[#303034] shadow-sm font-bold'
                : 'text-[#c7c6cb] hover:text-[#e2e2e9]'
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
                ? 'bg-[#c7c6ca] text-[#303034] shadow-sm font-bold'
                : 'text-[#c7c6cb] hover:text-[#e2e2e9]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">password</span>
            <span>Code &amp; PIN</span>
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
                  fgColor="#111318"
                  level="Q"
                  marginSize={1}
                  imageSettings={{
                    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23111318"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
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
                className="absolute top-2 right-2 w-7 h-7 bg-[#111318]/90 hover:bg-[#111318] text-[#ffb3af] rounded-lg flex items-center justify-center backdrop-blur-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                title="Fullscreen QR for scanning"
              >
                <span className="material-symbols-outlined text-[16px]">fullscreen</span>
              </button>
            </div>

            {/* PIN Inclusion Switch */}
            <div className="w-full bg-[#111318] rounded-xl p-2.5 px-3 border border-white/5 flex items-center justify-between gap-2 mb-3">
              <div className="text-left">
                <div className="text-xs font-semibold text-[#e2e2e9] flex items-center gap-1">
                  <span>1-Tap Connect</span>
                  {includePinInQr ? (
                    <span className="text-[10px] bg-[#ffb3af]/15 text-[#ffb3af] px-1.5 py-0.2 rounded font-mono">
                      PIN Embedded
                    </span>
                  ) : (
                    <span className="text-[10px] bg-white/10 text-[#c7c6cb] px-1.5 py-0.2 rounded font-mono">
                      Manual PIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#909095] leading-tight mt-0.5">
                  {includePinInQr ? 'Scanning auto-fills the 6-digit PIN' : 'Partner will manually type PIN'}
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
                  includePinInQr ? 'bg-[#ffb3af]' : 'bg-[#282a2f]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#111318] shadow ring-0 transition duration-200 ease-in-out ${
                    includePinInQr ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Quick credentials chip below QR */}
            <div className="grid grid-cols-2 gap-2 w-full mb-3">
              <div className="bg-[#111318] rounded-xl p-2 border border-white/5 flex flex-col items-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#909095]">Room Code</span>
                <span className="font-mono text-sm font-bold text-[#ffb3af]">{roomCode}</span>
              </div>
              <div className="bg-[#111318] rounded-xl p-2 border border-white/5 flex flex-col items-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#909095]">Access PIN</span>
                <span className="font-mono text-sm font-bold text-[#e2e2e9] tracking-wider">{pin}</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Credentials Tab View */}
        {activeTab === 'manual' && (
          <div className="w-full space-y-2.5 mb-4 text-left animate-fade-in">
            {/* Room Code */}
            <div className="w-full bg-[#111318] rounded-xl p-3 border border-white/5">
              <span className="font-label-sm text-[10px] text-[#909095] mb-0.5 block uppercase tracking-wider font-mono">
                Room Code
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-[#ffb3af] select-all tracking-wider">
                  {roomCode}
                </span>
                <span className="text-[11px] font-mono text-[#ffb3af] bg-[#ffb3af]/10 px-2 py-0.5 rounded border border-[#ffb3af]/20">
                  Active
                </span>
              </div>
            </div>

            {/* Link */}
            <div className="w-full bg-[#111318] rounded-xl p-3 border border-white/5">
              <span className="font-label-sm text-[10px] text-[#909095] mb-1 block uppercase tracking-wider font-mono">
                Shareable Link
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#ffb3af] truncate select-all">
                  {cleanRoomUrl.replace(/^https?:\/\//, '')}
                </span>
                <button
                  onClick={handleCopyLink}
                  id="share-copy-link-btn"
                  className="w-7 h-7 rounded-lg bg-[#282a2f] flex items-center justify-center text-[#e2e2e9] hover:text-[#ffb3af] transition-colors shrink-0 cursor-pointer"
                  title="Copy Link"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedLink ? 'done' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* PIN */}
            <div className="w-full bg-[#111318] rounded-xl p-3 border border-white/5">
              <span className="font-label-sm text-[10px] text-[#909095] mb-1 block uppercase tracking-wider font-mono">
                Access PIN
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xl font-bold tracking-[0.25em] text-[#e2e2e9] select-all">
                  {pin}
                </span>
                <button
                  onClick={handleCopyPin}
                  id="share-copy-pin-btn"
                  className="w-7 h-7 rounded-lg bg-[#282a2f] flex items-center justify-center text-[#e2e2e9] hover:text-[#ffb3af] transition-colors shrink-0 cursor-pointer"
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
            className="w-full py-3 rounded-full bg-[#c7c6ca] hover:bg-[#e3e2e6] text-[#303034] font-label-md font-bold text-sm flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-98"
          >
            <span>Enter Room</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={handleShare}
              id="share-system-btn"
              className="py-2.5 rounded-full bg-[#111318] hover:bg-[#282a2f] text-[#ffb3af] font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copiedFull ? 'done' : 'share'}
              </span>
              <span>{copiedFull ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              onClick={handleDownloadQr}
              id="share-save-qr-btn"
              className="py-2.5 rounded-full bg-[#111318] hover:bg-[#282a2f] text-[#e2e2e9] font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">
                {savedImageSuccess ? 'check_circle' : 'download'}
              </span>
              <span>{savedImageSuccess ? 'Saved' : 'Save QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Enlarge QR Modal */}
      {isFullscreenQr && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={() => setIsFullscreenQr(false)}
        >
          <div
            className="bg-[#1e2025] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-4">
              <span className="font-mono text-xs text-[#ffb3af] uppercase tracking-wider font-semibold">
                Scan with Phone Camera
              </span>
              <button
                onClick={() => setIsFullscreenQr(false)}
                className="w-8 h-8 rounded-full bg-[#111318] text-[#c7c6cb] hover:text-[#e2e2e9] flex items-center justify-center transition-colors cursor-pointer"
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
                fgColor="#111318"
                level="H"
                marginSize={1}
                imageSettings={{
                  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23111318"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>

            <div className="w-full bg-[#111318] rounded-xl p-3 border border-white/5 mb-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#909095]">ROOM: <strong className="text-[#ffb3af]">{roomCode}</strong></span>
                <span className="text-[#909095]">PIN: <strong className="text-[#e2e2e9] tracking-wider">{pin}</strong></span>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreenQr(false)}
              className="w-full py-2.5 rounded-full bg-[#c7c6ca] text-[#303034] font-label-md font-bold text-xs cursor-pointer hover:bg-[#e3e2e6] transition-colors"
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
