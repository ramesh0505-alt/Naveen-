import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { triggerHaptic, parseScannedQrData } from '../utils/helpers';
import { SoundEffects } from '../utils/audio';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: { roomCode: string; pin?: string }) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [scannerState, setScannerState] = useState<'idle' | 'starting' | 'scanning' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{ roomCode: string; pin?: string } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewport';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop scanner instance safely
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop notice:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  }, []);

  // Handle successful scan detection
  const handleScannedText = useCallback((decodedText: string) => {
    const parsed = parseScannedQrData(decodedText);
    if (parsed) {
      triggerHaptic('success');
      SoundEffects.playMessageSent();
      setScannedResult(parsed);
      setScannerState('success');
      stopScanner();

      // Give a brief visual confirmation before proceeding
      setTimeout(() => {
        onScanSuccess(parsed);
      }, 700);
    } else {
      triggerHaptic('warning');
      setErrorMessage('QR code recognized, but is not a valid room invite.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  }, [onScanSuccess, stopScanner]);

  // Start the camera scanner
  const startScanner = useCallback(async (cameraIdToUse?: string) => {
    setScannerState('starting');
    setErrorMessage(null);

    try {
      await stopScanner();

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      // Discover available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (!cameraIdToUse) {
            // Prefer back/environment camera
            const backCam = devices.find((d) =>
              /back|rear|environment/i.test(d.label)
            );
            cameraIdToUse = backCam ? backCam.id : devices[0].id;
          }
          setActiveCameraId(cameraIdToUse);
        }
      } catch {
        // Fallback to default constraints if enumerateDevices fails
      }

      const config: Html5QrcodeCameraScanConfig = {
        fps: 12,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrBoxSize = Math.floor(minEdge * 0.72);
          return {
            width: Math.max(qrBoxSize, 220),
            height: Math.max(qrBoxSize, 220),
          };
        },
        aspectRatio: 1.0,
      };

      const cameraSource = cameraIdToUse
        ? { deviceId: { exact: cameraIdToUse } }
        : { facingMode: 'environment' };

      await scanner.start(
        cameraSource,
        config,
        (decodedText) => {
          handleScannedText(decodedText);
        },
        () => {
          // Frame error (no QR detected yet) - silent
        }
      );

      setScannerState('scanning');

      // Check if torch/flashlight capability exists
      try {
        const capabilities = scanner.getRunningTrackCapabilities() as any;
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setScannerState('error');
      const msg = err?.message || '';
      if (/permission/i.test(msg) || /denied/i.test(msg) || /NotAllowedError/i.test(msg)) {
        setErrorMessage('Camera access was denied. Please grant camera permissions in your browser settings.');
      } else if (/NotFoundError|DevicesNotFoundError/i.test(msg)) {
        setErrorMessage('No camera device found on this system.');
      } else {
        setErrorMessage('Unable to access camera stream. You can also upload a photo of the QR code.');
      }
    }
  }, [handleScannedText, stopScanner]);

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      triggerHaptic('light');
      const next = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: next } as any],
      });
      setTorchOn(next);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Flip camera between front/back
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    triggerHaptic('selection');
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    if (nextCamera) {
      setActiveCameraId(nextCamera.id);
      await startScanner(nextCamera.id);
    }
  };

  // Fallback: Scan QR from uploaded image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      triggerHaptic('selection');
      setScannerState('starting');
      setErrorMessage(null);

      // Create a transient scanner if needed
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        html5QrCodeRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleScannedText(decodedText);
    } catch (err: any) {
      console.warn('File QR scan error:', err);
      setScannerState('error');
      setErrorMessage('No clear QR code detected in the selected image. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start on open, stop on close
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setErrorMessage(null);
      setTorchOn(false);
      // Small timeout to allow DOM node to render
      const timeout = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timeout);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="bg-[#121419] border border-[#272A31] rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col relative text-[#F5F3EE]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#272A31]/70 bg-[#181B21]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E8D8B8]/10 text-[#E8D8B8] flex items-center justify-center border border-[#E8D8B8]/20">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            </div>
            <div>
              <h2 className="font-editorial text-lg text-[#F5F3EE] leading-tight">
                Scan Partner's Screen
              </h2>
              <p className="text-[11px] text-[#9B9DA3]">Align QR code within the frame</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            id="qr-scanner-close-btn"
            className="w-8 h-8 rounded-full bg-[#272A31]/60 hover:bg-[#272A31] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
            title="Close scanner"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          {/* HTML5 QR Code Mount Node */}
          <div
            id={scannerContainerId}
            className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />

          {/* Loading / Starting State */}
          {scannerState === 'starting' && (
            <div className="absolute inset-0 z-20 bg-[#121419]/90 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 border-2 border-[#E8D8B8] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="font-mono text-xs text-[#E8D8B8]">Activating Camera...</p>
              <p className="text-[11px] text-[#9B9DA3] mt-1">Please allow camera permissions if prompted</p>
            </div>
          )}

          {/* Error State Overlay */}
          {scannerState === 'error' && (
            <div className="absolute inset-0 z-20 bg-[#121419]/95 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FF5C5C]/15 text-[#FF5C5C] flex items-center justify-center border border-[#FF5C5C]/30 mb-3">
                <span className="material-symbols-outlined text-[24px]">videocam_off</span>
              </div>
              <p className="font-headline-md text-sm text-[#F5F3EE] mb-1 font-bold">Camera Unavailable</p>
              <p className="text-xs text-[#9B9DA3] mb-4 max-w-xs leading-relaxed">
                {errorMessage || 'Could not access the camera. Check device permissions or upload a QR image.'}
              </p>

              <div className="flex gap-2 w-full max-w-xs">
                <button
                  onClick={() => startScanner()}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#272A31] hover:bg-[#32363F] text-xs font-semibold text-[#F5F3EE] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Retry</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#E8D8B8] text-[#121419] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#F0E3C8] transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Image</span>
                </button>
              </div>
            </div>
          )}

          {/* Success State Overlay */}
          {scannerState === 'success' && scannedResult && (
            <div className="absolute inset-0 z-30 bg-[#121419]/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-[#7ED6A5]/20 text-[#7ED6A5] flex items-center justify-center border border-[#7ED6A5]/40 mb-3 animate-scale-up">
                <span className="material-symbols-outlined text-[30px]">check_circle</span>
              </div>
              <p className="font-editorial text-xl text-[#F5F3EE] mb-1">Room Found!</p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181B21] border border-[#272A31] text-xs font-mono mb-2">
                <span className="text-[#9B9DA3]">ROOM:</span>
                <span className="text-[#E8D8B8] font-bold">{scannedResult.roomCode}</span>
                {scannedResult.pin && (
                  <>
                    <span className="text-[#9B9DA3]">PIN:</span>
                    <span className="text-[#7ED6A5] font-bold tracking-wider">{scannedResult.pin}</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-[#7ED6A5] font-mono animate-pulse">Entering space...</p>
            </div>
          )}

          {/* Overlay Targeting Frame & Laser */}
          {scannerState === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Darkened corner borders */}
              <div className="relative w-60 h-60 border-2 border-dashed border-[#E8D8B8]/40 rounded-2xl flex items-center justify-center overflow-hidden">
                {/* 4 Optical Corner Brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#E8D8B8] rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#E8D8B8] rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#E8D8B8] rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#E8D8B8] rounded-br-lg"></div>

                {/* Animated Red/Gold Laser Sweep */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#E8D8B8] to-transparent shadow-[0_0_8px_#E8D8B8] animate-laser"></div>
              </div>
            </div>
          )}

          {/* Viewfinder Controls (Torch + Camera Flip) */}
          {scannerState === 'scanning' && (
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
                    torchOn
                      ? 'bg-[#E8D8B8] text-[#121419] border-[#E8D8B8] shadow-[0_0_12px_rgba(232,216,184,0.5)]'
                      : 'bg-black/60 text-[#F5F3EE] border-white/20 hover:bg-black/80'
                  }`}
                  title="Toggle Torch/Flash"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {torchOn ? 'flashlight_on' : 'flashlight_off'}
                  </span>
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="w-9 h-9 rounded-full bg-black/60 text-[#F5F3EE] border border-white/20 hover:bg-black/80 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                  title="Switch Camera"
                >
                  <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#181B21] border-t border-[#272A31] flex items-center justify-between gap-3">
          {/* File Upload Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            id="qr-scan-from-file-btn"
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#272A31] hover:bg-[#32363F] text-xs font-semibold text-[#E8D8B8] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">image</span>
            <span>Scan from Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            id="qr-scan-cancel-btn"
            className="py-2.5 px-4 rounded-xl bg-transparent hover:bg-[#272A31]/50 text-xs font-medium text-[#9B9DA3] hover:text-[#F5F3EE] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {/* Hidden File Input for scanning photos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
};
