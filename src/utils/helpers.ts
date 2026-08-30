/**
 * Common formatting and URL helpers & Mobile App Utilities
 */

/**
 * Common formatting and URL helpers & Mobile App Utilities with Nuanced Haptics
 */

export type HapticPatternType =
  | 'light'
  | 'selection'
  | 'medium'
  | 'impact'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'failure'
  | 'message-received'
  | 'incoming-message'
  | 'message-sent'
  | 'call-incoming'
  | 'call-alert'
  | 'call-connected'
  | 'call-ended'
  | 'record-start'
  | 'record-stop'
  | 'burn-effect'
  | 'disappearing'
  | 'pin-keypress'
  | 'pin-success'
  | 'pin-error';

// Nuanced vibration patterns in milliseconds
export const HAPTIC_PATTERNS: Record<HapticPatternType, number | number[]> = {
  light: 10,
  selection: 6,
  medium: 25,
  impact: 35,
  heavy: 50,
  success: [15, 40, 25],
  warning: [30, 50, 30, 50],
  error: [40, 60, 40, 60, 40],
  failure: [50, 70, 50],
  'message-received': [25, 45, 35],
  'incoming-message': [25, 45, 35],
  'message-sent': [12, 30, 18],
  'call-incoming': [200, 100, 200, 100, 400],
  'call-alert': [200, 100, 200, 100, 400],
  'call-connected': [30, 50, 60],
  'call-ended': [50, 40, 20],
  'record-start': 35,
  'record-stop': [15, 25, 15],
  'burn-effect': [12, 18, 12, 18, 12],
  disappearing: [12, 18, 12, 18, 12],
  'pin-keypress': 12,
  'pin-success': [20, 35, 45],
  'pin-error': [45, 50, 45, 50, 45],
};

let ringtoneHapticTimer: any = null;

/**
 * Universal Haptic Trigger
 * Accepts predefined string key, single millisecond duration, or custom vibration pattern array
 */
export function triggerHaptic(pattern: HapticPatternType | number | number[] = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (typeof pattern === 'string') {
        const sequence = HAPTIC_PATTERNS[pattern] ?? 15;
        navigator.vibrate(sequence);
      } else {
        navigator.vibrate(pattern);
      }
    } catch {
      // Gracefully ignore vibration errors if blocked by browser permission/policy
    }
  }
}

/**
 * Immediately cancel all active vibrations
 */
export function stopHaptic() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
  if (ringtoneHapticTimer) {
    clearInterval(ringtoneHapticTimer);
    ringtoneHapticTimer = null;
  }
}

/**
 * Nuanced Haptic Helper: Incoming message received
 */
export function hapticIncomingMessage() {
  triggerHaptic('incoming-message');
}

/**
 * Nuanced Haptic Helper: Message sent confirmation
 */
export function hapticMessageSent() {
  triggerHaptic('message-sent');
}

/**
 * Nuanced Haptic Helper: Recurring incoming call vibration loop
 */
export function startHapticCallAlert() {
  stopHaptic();
  triggerHaptic('call-incoming');
  ringtoneHapticTimer = setInterval(() => {
    triggerHaptic('call-incoming');
  }, 2200);
}

/**
 * Stop incoming call vibration loop
 */
export function stopHapticCallAlert() {
  stopHaptic();
}

/**
 * Nuanced Haptic Helper: Call connected confirmation
 */
export function hapticCallConnected() {
  stopHaptic();
  triggerHaptic('call-connected');
}

/**
 * Nuanced Haptic Helper: Call terminated
 */
export function hapticCallEnded() {
  stopHaptic();
  triggerHaptic('call-ended');
}

/**
 * Nuanced Haptic Helper: Voice audio recording started
 */
export function hapticRecordStart() {
  triggerHaptic('record-start');
}

/**
 * Nuanced Haptic Helper: Voice audio recording stopped
 */
export function hapticRecordStop() {
  triggerHaptic('record-stop');
}

/**
 * Nuanced Haptic Helper: Disappearing / self-destructing message burn
 */
export function hapticBurnEffect() {
  triggerHaptic('burn-effect');
}

/**
 * Nuanced Haptic Helper: PIN keypad press
 */
export function hapticPinKey() {
  triggerHaptic('pin-keypress');
}

/**
 * Nuanced Haptic Helper: PIN success
 */
export function hapticPinSuccess() {
  triggerHaptic('pin-success');
}

/**
 * Nuanced Haptic Helper: PIN error shake
 */
export function hapticPinError() {
  triggerHaptic('pin-error');
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  ) || window.innerWidth <= 768;
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function formatTimeRemaining(expiresAt: number, now = Date.now()): string {
  const diff = Math.max(0, expiresAt - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

export function formatDetailedTimeRemaining(expiresAt: number, now = Date.now()): string {
  const diff = Math.max(0, expiresAt - now);
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function formatAbsoluteDateTime(timestamp: number): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getRoomFullUrl(roomCode: string, pin?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (pin) {
    return `${origin}/private/${roomCode}?pin=${encodeURIComponent(pin)}`;
  }
  return `${origin}/private/${roomCode}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  triggerHaptic('medium');
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
}

export function parseScannedQrData(qrText: string): { roomCode: string; pin?: string } | null {
  if (!qrText || typeof qrText !== 'string') return null;
  const raw = qrText.trim();

  // Pattern 1: URL with /private/:code, /room/:code, /join/:code
  try {
    const parsedUrl = new URL(raw.startsWith('http') ? raw : `https://dummy.host/${raw.replace(/^\/+/, '')}`);
    const pathname = parsedUrl.pathname;
    const match = pathname.match(/\/(?:private|room|join)\/([a-zA-Z0-9_-]+)/i);
    const pin = parsedUrl.searchParams.get('pin') || parsedUrl.searchParams.get('p') || undefined;
    if (match && match[1]) {
      return {
        roomCode: match[1].toUpperCase(),
        pin: pin || undefined,
      };
    }
  } catch {}

  // Pattern 2: Text matching ROOM: XYZ PIN: 123456 or formatted string
  const roomMatch = raw.match(/ROOM:?\s*([a-zA-Z0-9_-]{4,20})/i);
  const pinMatch = raw.match(/PIN:?\s*(\d{6})/i);
  if (roomMatch && roomMatch[1]) {
    return {
      roomCode: roomMatch[1].toUpperCase(),
      pin: pinMatch ? pinMatch[1] : undefined,
    };
  }

  // Pattern 3: Simple Room Code (4-16 alphanumeric characters)
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length >= 4 && clean.length <= 16) {
    return {
      roomCode: clean.toUpperCase(),
    };
  }

  return null;
}

