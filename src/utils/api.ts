/**
 * API and WebSocket client with graceful error handling for all hosting environments
 */

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
