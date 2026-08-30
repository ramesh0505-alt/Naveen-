/**
 * API and WebSocket client with graceful error handling for all hosting environments
 */

import type { MessageItem, MemberRole, RoomInfo, SendMessagePayload } from '../types';

export function getApiBaseUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return '';
}

export function getWebSocketUrl(): string {
  const envWsUrl = ((import.meta as any).env?.VITE_WS_URL as string | undefined)?.trim();
  if (envWsUrl) {
    return envWsUrl;
  }

  const apiBase = getApiBaseUrl();
  if (apiBase) {
    const wsProtocol = apiBase.startsWith('https:') ? 'wss:' : 'ws:';
    const cleanHost = apiBase.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${cleanHost}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const base = getApiBaseUrl();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${base}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error(
      `Cannot connect to backend server at ${url}. Please verify your network connection or server status.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!contentType.includes('application/json') && (text.trim().startsWith('<') || text.includes('<!DOCTYPE'))) {
    throw new Error(
      `Backend server is not running on this host (received HTML instead of API response). This app requires the Node.js WebSocket backend (server.ts). If hosted on a static provider (like Netlify or GitHub Pages), deploy to a Node host (e.g. Render, Railway, Cloud Run) or configure VITE_API_URL.`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid response received from server (${response.status} ${response.statusText}).`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

/**
 * Message & Room API Endpoints supporting the reply model
 */

export async function postMessageApi(
  roomCode: string,
  sessionToken: string,
  payload: SendMessagePayload
): Promise<{ success: boolean; message: MessageItem }> {
  return apiRequest<{ success: boolean; message: MessageItem }>(
    `/api/rooms/${encodeURIComponent(roomCode)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function getMessagesApi(
  roomCode: string,
  sessionToken: string
): Promise<{
  success: boolean;
  role: MemberRole;
  roomInfo: RoomInfo;
  expiresAt: number;
  serverTime: number;
  messages: MessageItem[];
}> {
  return apiRequest(
    `/api/rooms/${encodeURIComponent(roomCode)}/messages`,
    {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
}

export async function viewMessageApi(
  roomCode: string,
  messageId: string,
  sessionToken: string
): Promise<{ success: boolean; isBurned?: boolean; viewedAt?: number; expiresAt?: number }> {
  return apiRequest(
    `/api/rooms/${encodeURIComponent(roomCode)}/messages/${encodeURIComponent(messageId)}/view`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
}

export async function burnMessageApi(
  roomCode: string,
  messageId: string,
  sessionToken: string
): Promise<{ success: boolean }> {
  return apiRequest(
    `/api/rooms/${encodeURIComponent(roomCode)}/messages/${encodeURIComponent(messageId)}/burn`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
}

export async function clearMessagesApi(
  roomCode: string,
  sessionToken: string
): Promise<{ success: boolean }> {
  return apiRequest(
    `/api/rooms/${encodeURIComponent(roomCode)}/messages`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    }
  );
}

export async function updateRoomTimerApi(
  roomCode: string,
  sessionToken: string,
  defaultMessageExpiration: number
): Promise<{ success: boolean; defaultMessageExpiration: number; roomInfo: RoomInfo }> {
  return apiRequest(
    `/api/rooms/${encodeURIComponent(roomCode)}/timer`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ defaultMessageExpiration }),
    }
  );
}

