import { MemberRole, RoomInfo } from '../types';

const SESSION_STORAGE_KEY = 'velora_active_session_v1';

export interface StoredLocalSession {
  roomCode: string;
  sessionToken: string;
  role: MemberRole;
  expiresAt: number;
  pin?: string;
  savedAt: number;
}

/**
 * Save active room session to persistent storage
 */
export function saveActiveSession(session: Omit<StoredLocalSession, 'savedAt'>): void {
  try {
    if (typeof window === 'undefined') return;
    const data: StoredLocalSession = {
      ...session,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

/**
 * Retrieve active room session from persistent storage
 */
export function getActiveSession(): StoredLocalSession | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredLocalSession;
    if (!session || !session.roomCode || !session.sessionToken) {
      return null;
    }
    // Check if locally past expiration timestamp
    if (session.expiresAt && session.expiresAt <= Date.now()) {
      clearActiveSession();
      return null;
    }
    return session;
  } catch (err) {
    console.error('Failed to read session from localStorage:', err);
    return null;
  }
}

/**
 * Clear active session upon explicit Leave Room or room expiration
 */
export function clearActiveSession(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session from localStorage:', err);
  }
}
