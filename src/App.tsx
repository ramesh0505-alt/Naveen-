import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ConnectionStatusBar } from './components/ConnectionStatusBar';
import { MobileDeviceFrame } from './components/MobileDeviceFrame';
import { MobileBottomDock } from './components/MobileBottomDock';
import { InstallAppModal } from './components/InstallAppModal';
import { LandingPage } from './components/LandingPage';
import { CreateRoomModal } from './components/CreateRoomModal';
import { ShareRoomView } from './components/ShareRoomView';
import { JoinRoomView } from './components/JoinRoomView';
import { WaitingRoomView } from './components/WaitingRoomView';
import { ChatView } from './components/ChatView';
import { AudioCallModal } from './components/AudioCallModal';
import { RoomExpiredView } from './components/RoomExpiredView';
import { SettingsModal } from './components/SettingsModal';
import { WebRTCCallManager } from './utils/webrtc';
import { SoundEffects, unlockAudioContext } from './utils/audio';
import { triggerHaptic, isMobileDevice } from './utils/helpers';
import {
  NetworkSettings,
  loadNetworkSettings,
  saveNetworkSettings,
  getEffectivePingIntervalMs,
  isLowDataActive,
  onNetworkChange,
} from './utils/network';
import type {
  RoomInfo,
  MemberRole,
  MessageItem,
  CallState,
  CallSignalPayload,
  WebSocketServerMessage,
  ViewMode,
  SignalingStatus,
} from './types';

type Screen = 'LANDING' | 'SHARE' | 'JOIN' | 'WAITING' | 'CHAT' | 'EXPIRED';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LANDING');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isFrameMode, setIsFrameMode] = useState<boolean>(false);

  // Network & Low Data Mode Settings
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(loadNetworkSettings);
  const networkSettingsRef = useRef<NetworkSettings>(networkSettings);
  networkSettingsRef.current = networkSettings;

  // Active Session State
  const [roomCode, setRoomCode] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [role, setRole] = useState<MemberRole>('owner');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  // Connection & Signaling Status
  const [signalingStatus, setSignalingStatus] = useState<SignalingStatus>('connected');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const triggerWsReconnectRef = useRef<(() => void) | null>(null);

  // Chat State
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [otherUserOnline, setOtherUserOnline] = useState<boolean>(false);
  const [otherUserRole, setOtherUserRole] = useState<MemberRole | null>(null);
  const [memberCount, setMemberCount] = useState<number>(1);
  const [isOtherTyping, setIsOtherTyping] = useState<boolean>(false);
  const [expiredReason, setExpiredReason] = useState<string>('');

  // Audio Call State
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaker, setIsSpeaker] = useState<boolean>(false);
  const [localAudioLevel, setLocalAudioLevel] = useState<number>(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState<number>(0);
  const [callError, setCallError] = useState<string | null>(null);

  // Refs for socket and WebRTC
  const socketRef = useRef<WebSocket | null>(null);
  const webrtcRef = useRef<WebRTCCallManager | null>(null);
  const callTimerRef = useRef<any>(null);

  // 1. Check URL parameters and hash on mount (e.g. /private/:roomCode, /room/:code, ?room=, ?code=, #code)
  useEffect(() => {
    const pathname = window.location.pathname;
    const matchPath = pathname.match(/\/(?:private|room|join)\/([a-zA-Z0-9_-]+)/);
    if (matchPath && matchPath[1]) {
      setRoomCode(matchPath[1]);
      setCurrentScreen('JOIN');
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const queryRoom = searchParams.get('room') || searchParams.get('code') || searchParams.get('r');
    if (queryRoom) {
      setRoomCode(queryRoom);
      setCurrentScreen('JOIN');
      return;
    }

    const hash = window.location.hash.replace(/^#\/?(room\/|join\/)?/, '');
    if (hash && hash.length >= 4 && hash.length <= 20) {
      setRoomCode(hash);
      setCurrentScreen('JOIN');
    }
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 2. WebSocket Signal Sender for WebRTC
  const sendCallSignal = useCallback((payload: CallSignalPayload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'signal',
          payload,
        })
      );
    }
  }, []);

  // 3. Initialize WebRTC Call Manager
  useEffect(() => {
    const manager = new WebRTCCallManager(sendCallSignal);
    manager.setCallbacks({
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          setCallState('CONNECTED');
          setCallError(null);
          SoundEffects.stopRingtone();
          SoundEffects.playCallConnected();
        } else if (state === 'failed') {
          setCallError('Audio connection could not be established. Please try again.');
          SoundEffects.stopRingtone();
          SoundEffects.playCallEnded();
          setTimeout(() => handleEndCall(true), 2500);
        } else if (state === 'disconnected') {
          handleEndCall(false);
        }
      },
      onLocalAudioLevels: (lvl) => setLocalAudioLevel(lvl),
      onRemoteAudioLevels: (lvl) => setRemoteAudioLevel(lvl),
      onError: (err) => {
        setCallError(err.message || 'Microphone error occurred.');
      },
    });
    webrtcRef.current = manager;

    return () => {
      manager.cleanup();
      webrtcRef.current = null;
    };
  }, [sendCallSignal]);

  // Call timer interval
  useEffect(() => {
    if (callState === 'CONNECTED') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
  }, [callState]);

  // Active client-side message expiration and self-destruct cleaner loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setMessages((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (m.isBurned) return m;

          let isExpired = false;

          // Check fixed absolute expiration timestamp
          if (m.expiresAt && m.expiresAt <= now) {
            isExpired = true;
          }

          // Check burn-after-reading timer (calculated from when recipient viewed it)
          if (
            m.burnOnRead &&
            m.viewedAt &&
            typeof m.burnAfterSeconds === 'number' &&
            m.burnAfterSeconds > 0 &&
            m.viewedAt + m.burnAfterSeconds * 1000 <= now
          ) {
            isExpired = true;
          }

          // Fallback check: standard timed message without burnOnRead
          if (
            !m.burnOnRead &&
            typeof m.burnAfterSeconds === 'number' &&
            m.burnAfterSeconds > 0 &&
            m.createdAt + m.burnAfterSeconds * 1000 <= now
          ) {
            isExpired = true;
          }

          if (isExpired) {
            changed = true;
            return {
              ...m,
              isBurned: true,
              textContent: undefined,
              mediaReference: undefined,
            };
          }

          return m;
        });

        return changed ? next : prev;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        setSignalingStatus('connected');
      } else if (roomCode && sessionToken && currentScreen !== 'LANDING' && currentScreen !== 'EXPIRED') {
        setSignalingStatus('reconnecting');
        triggerWsReconnectRef.current?.();
      } else {
        setSignalingStatus('connected');
      }
    };

    const handleOffline = () => {
      setSignalingStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [roomCode, sessionToken, currentScreen]);

  // 4. WebSocket Lifecycle for active session with auto-reconnect and ping keepalive
  useEffect(() => {
    if (!roomCode || !sessionToken || currentScreen === 'LANDING' || currentScreen === 'EXPIRED') {
      if (navigator.onLine) {
        setSignalingStatus('connected');
      } else {
        setSignalingStatus('disconnected');
      }
      setPingLatency(null);
      return;
    }

    let isUnmounted = false;
    let ws: WebSocket | null = null;
    let pingTimer: any = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      if (isUnmounted) return;

      if (!navigator.onLine) {
        setSignalingStatus('disconnected');
        return;
      }

      setSignalingStatus(reconnectCountRef.current > 0 ? 'reconnecting' : 'connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted || !ws) return;
        reconnectCountRef.current = 0;
        setSignalingStatus('connected');

        // Authenticate with server
        ws.send(
          JSON.stringify({
            type: 'auth',
            roomCode,
            sessionToken,
          })
        );

        // Dynamic ping keepalive based on Low Data Mode and Connection type
        if (pingTimer) clearInterval(pingTimer);
        const sendPing = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        };

        sendPing();
        const effectivePingMs = getEffectivePingIntervalMs(networkSettingsRef.current);
        pingTimer = setInterval(sendPing, effectivePingMs);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketServerMessage;

          if (data.type === 'pong') {
            if (data.timestamp) {
              setPingLatency(Math.max(1, Date.now() - data.timestamp));
            }
            return;
          }

          if (data.type === 'auth:success') {
            setRole(data.role);
            setRoomInfo(data.roomInfo);
            setSignalingStatus('connected');
          } else if (data.type === 'presence') {
            setOtherUserOnline(data.otherUserOnline);
            setOtherUserRole(data.otherUserRole);
            setMemberCount(data.memberCount);

            // If in waiting/share room and other user joins, auto switch to Chat!
            if (data.memberCount >= 2 && (currentScreen === 'WAITING' || currentScreen === 'SHARE')) {
              setCurrentScreen('CHAT');
            }
          } else if (data.type === 'typing') {
            setIsOtherTyping(data.isTyping);
          } else if (data.type === 'message:new') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
            SoundEffects.playMessageReceived();
          } else if (data.type === 'message:cleared') {
            setMessages([]);
          } else if (data.type === 'message:burned') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.messageId ? { ...m, isBurned: true, mediaReference: undefined, textContent: undefined } : m
              )
            );
          } else if (data.type === 'message:viewed') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.messageId
                  ? {
                      ...m,
                      viewedAt: data.viewedAt,
                      burnAfterSeconds: data.burnAfterSeconds ?? m.burnAfterSeconds,
                      expiresAt: data.expiresAt ?? m.expiresAt,
                    }
                  : m
              )
            );
          } else if (data.type === 'room:timer_updated') {
            setRoomInfo((prev) =>
              prev
                ? {
                    ...prev,
                    defaultMessageExpiration: data.defaultMessageExpiration,
                  }
                : null
            );
          } else if (data.type === 'signal') {
            handleIncomingSignal(data.payload);
          } else if (data.type === 'room:expired') {
            setExpiredReason('This private room has expired.');
            setCurrentScreen('EXPIRED');
          } else if (data.type === 'room:closed') {
            setExpiredReason(data.reason || 'This private room was closed.');
            setCurrentScreen('EXPIRED');
          }
        } catch (e) {
          console.error('Error handling ws message:', e);
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        setPingLatency(null);
        // Automatically reconnect after 1.5s if session is still active
        if (!isUnmounted && currentScreen !== 'LANDING' && currentScreen !== 'EXPIRED') {
          reconnectCountRef.current += 1;
          setSignalingStatus('reconnecting');
          reconnectTimer = setTimeout(() => {
            connectWs();
            loadRoomSession(roomCode, sessionToken);
          }, 1500);
        } else {
          setSignalingStatus('disconnected');
        }
      };

      ws.onerror = () => {
        setSignalingStatus('disconnected');
        try {
          ws?.close();
        } catch {}
      };
    };

    triggerWsReconnectRef.current = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      connectWs();
      loadRoomSession(roomCode, sessionToken);
    };

    connectWs();

    return () => {
      isUnmounted = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
      socketRef.current = null;
      triggerWsReconnectRef.current = null;
    };
  }, [roomCode, sessionToken, currentScreen]);

  // 5. Handle Incoming WebRTC Signals
  const handleIncomingSignal = async (payload: CallSignalPayload) => {
    if (!webrtcRef.current) return;

    if (payload.type === 'call:initiate') {
      // Incoming call ringing
      setCallError(null);
      setCallState('RINGING');
      SoundEffects.startIncomingRingtone();
    } else if (payload.type === 'call:accept') {
      // Peer accepted, create WebRTC offer
      setCallState('CONNECTED');
      setCallError(null);
      SoundEffects.stopRingtone();
      try {
        await webrtcRef.current.startCall(roomCode, role);
      } catch (err: any) {
        console.error('Error starting WebRTC call:', err);
        setCallError(err.message || 'Failed to start audio call.');
      }
    } else if (payload.type === 'call:reject') {
      SoundEffects.stopRingtone();
      SoundEffects.playCallEnded();
      setCallState('REJECTED');
      setTimeout(() => setCallState('IDLE'), 2500);
    } else if (payload.type === 'call:offer' && payload.sdp) {
      // Received offer from peer, generate answer
      try {
        await webrtcRef.current.handleOffer(roomCode, role, payload.sdp);
      } catch (err: any) {
        console.error('Error handling offer:', err);
        setCallError(err.message || 'Failed to answer audio call.');
      }
    } else if (payload.type === 'call:answer' && payload.sdp) {
      try {
        await webrtcRef.current.handleAnswer(payload.sdp);
      } catch (err: any) {
        console.error('Error handling answer:', err);
      }
    } else if (payload.type === 'call:ice_candidate' && payload.candidate) {
      try {
        await webrtcRef.current.handleIceCandidate(payload.candidate);
      } catch (err: any) {
        console.error('Error handling ice candidate:', err);
      }
    } else if (payload.type === 'call:end') {
      handleEndCall(false);
    }
  };

  // Audio Call User Actions
  const handleStartCall = async () => {
    if (!otherUserOnline && memberCount < 2) {
      alert('The other participant must join the room before starting an audio call.');
      return;
    }
    setCallError(null);
    unlockAudioContext();
    try {
      if (webrtcRef.current) {
        await webrtcRef.current.acquireLocalAudio();
      }
      setCallState('CALLING');
      SoundEffects.startOutgoingRingback();
      sendCallSignal({
        type: 'call:initiate',
        roomCode,
        senderRole: role,
      });
    } catch (err: any) {
      console.error('Microphone error on call start:', err);
      setCallError(err.message || 'Microphone access required to make audio calls.');
      setCallState('FAILED');
      setTimeout(() => setCallState('IDLE'), 3500);
    }
  };

  const handleAcceptCall = async () => {
    unlockAudioContext();
    SoundEffects.stopRingtone();
    setCallError(null);
    try {
      if (webrtcRef.current) {
        await webrtcRef.current.acquireLocalAudio();
      }
      setCallState('CONNECTED');
      sendCallSignal({
        type: 'call:accept',
        roomCode,
        senderRole: role,
      });
    } catch (err: any) {
      console.error('Microphone error on call accept:', err);
      setCallError(err.message || 'Microphone access required to answer calls.');
      setCallState('FAILED');
      sendCallSignal({
        type: 'call:reject',
        roomCode,
        senderRole: role,
      });
      setTimeout(() => setCallState('IDLE'), 3500);
    }
  };

  const handleRejectCall = () => {
    SoundEffects.stopRingtone();
    setCallState('IDLE');
    setCallError(null);
    sendCallSignal({
      type: 'call:reject',
      roomCode,
      senderRole: role,
    });
  };

  const handleEndCall = (sendHangupSignal: boolean = true) => {
    SoundEffects.stopRingtone();
    SoundEffects.playCallEnded();
    setCallState('ENDED');

    if (sendHangupSignal) {
      sendCallSignal({
        type: 'call:end',
        roomCode,
        senderRole: role,
      });
    }

    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    setTimeout(() => {
      setCallState('IDLE');
      setCallError(null);
      setIsMuted(false);
      setIsSpeaker(false);
    }, 1500);
  };

  const handleToggleMute = () => {
    if (webrtcRef.current) {
      const nextMuted = !isMuted;
      webrtcRef.current.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const handleToggleSpeaker = () => {
    if (webrtcRef.current) {
      const nextSpeaker = !isSpeaker;
      webrtcRef.current.setSpeakerphone(nextSpeaker);
      setIsSpeaker(nextSpeaker);
    }
  };

  // Chat Actions
  const handleSendMessage = async (payload: {
    type: 'TEXT' | 'VOICE' | 'IMAGE';
    textContent?: string;
    mediaReference?: string;
    duration?: number;
    viewMode?: ViewMode;
    burnAfterSeconds?: number;
    burnOnRead?: boolean;
  }) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      if (data.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err: any) {
      console.error('Send message error:', err);
    }
  };

  const handleUpdateRoomTimer = async (defaultMessageExpiration: number) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ defaultMessageExpiration }),
      });
      const data = await res.json();
      if (data.success) {
        setRoomInfo((prev) =>
          prev
            ? {
                ...prev,
                defaultMessageExpiration: data.defaultMessageExpiration,
              }
            : null
        );
      }
    } catch (err) {
      console.error('Update room timer error:', err);
    }
  };

  const handleViewMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/messages/${messageId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  viewedAt: data.viewedAt || Date.now(),
                  expiresAt: data.expiresAt || m.expiresAt,
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error('View message error:', err);
    }
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'typing',
          roomCode,
          isTyping,
        })
      );
    }
  };

  const handleClearConversation = async () => {
    try {
      await fetch(`/api/rooms/${roomCode}/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setMessages([]);
    } catch (err) {
      console.error('Clear conversation error:', err);
    }
  };

  const handleBurnPhoto = async (messageId: string) => {
    try {
      await fetch(`/api/rooms/${roomCode}/burn-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ messageId }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isBurned: true, mediaReference: undefined } : m
        )
      );
    } catch (err) {
      console.error('Burn photo error:', err);
    }
  };

  const handleCloseRoom = async () => {
    try {
      await fetch(`/api/rooms/${roomCode}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      setExpiredReason('You have ended the private room.');
      setCurrentScreen('EXPIRED');
    } catch (err) {
      console.error('Close room error:', err);
    }
  };

  // Fetch initial messages & session on entering chat
  const loadRoomSession = async (code: string, token: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRoomInfo(data.roomInfo);
        setRole(data.role);
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
  };

  // Navigation handlers
  const handleRoomCreated = (data: {
    roomCode: string;
    pin: string;
    sessionToken: string;
    role: 'owner';
    expiresAt: number;
  }) => {
    setRoomCode(data.roomCode);
    setPin(data.pin);
    setSessionToken(data.sessionToken);
    setRole(data.role);
    setExpiresAt(data.expiresAt);
    setRoomInfo({
      id: data.roomCode,
      roomCode: data.roomCode,
      status: 'WAITING',
      maxMembers: 2,
      currentMembers: 1,
      expiresAt: data.expiresAt,
      createdAt: Date.now(),
      hasOwner: true,
      hasGuest: false,
    });
    setIsCreateModalOpen(false);
    setCurrentScreen('SHARE');
  };

  const handleJoinedRoom = (data: {
    roomCode: string;
    sessionToken: string;
    role: 'guest';
    expiresAt: number;
    roomInfo: RoomInfo;
  }) => {
    setRoomCode(data.roomCode);
    setSessionToken(data.sessionToken);
    setRole(data.role);
    setExpiresAt(data.expiresAt);
    setRoomInfo(data.roomInfo);
    loadRoomSession(data.roomCode, data.sessionToken);
    setCurrentScreen('CHAT');
  };

  const handleUpdateNetworkSettings = useCallback((updated: Partial<NetworkSettings>) => {
    setNetworkSettings((prev) => {
      const next = { ...prev, ...updated };
      saveNetworkSettings(next);
      return next;
    });
  }, []);

  // Listen for online/offline and cellular connection changes
  useEffect(() => {
    const unsubscribe = onNetworkChange(() => {
      // Force trigger state sync for active connection type
      setNetworkSettings((prev) => ({ ...prev }));
    });
    return unsubscribe;
  }, []);

  const handleEnterFromShare = () => {
    loadRoomSession(roomCode, sessionToken);
    setCurrentScreen('CHAT');
  };

  const handleGoHome = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    setRoomCode('');
    setPin('');
    setSessionToken('');
    setMessages([]);
    setCurrentScreen('LANDING');
  };

  const isLowData = isLowDataActive(networkSettings);
  const currentPingIntervalSec = Math.round(getEffectivePingIntervalMs(networkSettings) / 1000);

  return (
    <MobileDeviceFrame
      isFrameMode={isFrameMode}
      onToggleFrameMode={() => setIsFrameMode(!isFrameMode)}
      roomCode={roomCode}
    >
      <div className="min-h-full flex-1 flex flex-col bg-[#0C0C0C] text-[#F0F0F0] font-sans selection:bg-white selection:text-black relative pb-16 sm:pb-0">
        {/* Top Signaling Connection Status Bar */}
        <ConnectionStatusBar
          status={signalingStatus}
          latency={pingLatency}
          lowDataActive={isLowData}
          pingIntervalSeconds={currentPingIntervalSec}
          onReconnect={() => triggerWsReconnectRef.current?.()}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Top Navigation */}
        <Navbar
          currentRoomCode={['WAITING', 'CHAT', 'SHARE'].includes(currentScreen) ? roomCode : undefined}
          roomStatus={roomInfo?.status}
          memberCount={memberCount}
          onNavigateHome={handleGoHome}
          onOpenInstall={() => setIsInstallModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isLowDataActive={isLowData}
          isFrameMode={isFrameMode}
          onToggleFrameMode={() => setIsFrameMode(!isFrameMode)}
        />

        {/* Main Screen Views */}
        <main className="flex-1 flex flex-col justify-center">
          {currentScreen === 'LANDING' && (
            <LandingPage
              onCreateRoom={() => {
                triggerHaptic('medium');
                setIsCreateModalOpen(true);
              }}
              onJoinRoom={() => {
                triggerHaptic('light');
                setCurrentScreen('JOIN');
              }}
            />
          )}

          {currentScreen === 'SHARE' && (
            <ShareRoomView
              roomCode={roomCode}
              pin={pin}
              expiresAt={expiresAt}
              onEnterRoom={handleEnterFromShare}
            />
          )}

          {currentScreen === 'JOIN' && (
            <JoinRoomView
              initialRoomCode={roomCode}
              onJoined={handleJoinedRoom}
              onCancel={handleGoHome}
            />
          )}

          {currentScreen === 'WAITING' && (
            <WaitingRoomView
              roomCode={roomCode}
              pin={pin}
              expiresAt={expiresAt}
              memberCount={memberCount}
              onProceedToChat={() => {
                loadRoomSession(roomCode, sessionToken);
                setCurrentScreen('CHAT');
              }}
            />
          )}

          {currentScreen === 'CHAT' && roomInfo && (
            <ChatView
              roomCode={roomCode}
              pin={pin}
              role={role}
              roomInfo={roomInfo}
              messages={messages}
              otherUserOnline={otherUserOnline}
              isOtherTyping={isOtherTyping}
              networkSettings={networkSettings}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onSendMessage={handleSendMessage}
              onSendTyping={handleSendTyping}
              onStartCall={handleStartCall}
              onClearConversation={handleClearConversation}
              onCloseRoom={handleCloseRoom}
              onBurnPhoto={handleBurnPhoto}
              onUpdateRoomTimer={handleUpdateRoomTimer}
              onViewMessage={handleViewMessage}
            />
          )}

          {currentScreen === 'EXPIRED' && (
            <RoomExpiredView
              reason={expiredReason}
              onCreateNew={() => {
                handleGoHome();
                setIsCreateModalOpen(true);
              }}
              onGoHome={handleGoHome}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Dock */}
        <MobileBottomDock
          currentScreen={currentScreen}
          hasActiveRoom={Boolean(roomCode && sessionToken)}
          onNavigateHome={handleGoHome}
          onOpenCreate={() => setIsCreateModalOpen(true)}
          onOpenJoin={() => setCurrentScreen('JOIN')}
          onOpenInstall={() => setIsInstallModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          isLowDataActive={isLowData}
        />

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onRoomCreated={handleRoomCreated}
        />

        {/* Settings & Low Data Mode Modal */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={networkSettings}
          onUpdateSettings={handleUpdateNetworkSettings}
        />

        {/* Install PWA Mobile App Modal */}
        <InstallAppModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          deferredPrompt={deferredInstallPrompt}
          onInstalled={() => {
            setIsInstallModalOpen(false);
            setDeferredInstallPrompt(null);
          }}
        />

        {/* Audio Call Overlay Modal */}
        <AudioCallModal
          callState={callState}
          otherRole={otherUserRole}
          callDuration={callDuration}
          isMuted={isMuted}
          isSpeaker={isSpeaker}
          localVolume={localAudioLevel}
          remoteVolume={remoteAudioLevel}
          callError={callError}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onEndCall={() => handleEndCall(true)}
          onToggleMute={handleToggleMute}
          onToggleSpeaker={handleToggleSpeaker}
          onBindAudioElement={(el) => webrtcRef.current?.attachRemoteAudioElement(el)}
        />
      </div>
    </MobileDeviceFrame>
  );
}
