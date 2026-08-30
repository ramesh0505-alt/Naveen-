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
import { ProfileView } from './components/ProfileView';
import { NotificationToast } from './components/NotificationToast';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { WebRTCCallManager } from './utils/webrtc';
import { SoundEffects, unlockAudioContext } from './utils/audio';
import {
  triggerHaptic,
  isMobileDevice,
  hapticIncomingMessage,
  hapticMessageSent,
  startHapticCallAlert,
  stopHapticCallAlert,
  hapticCallConnected,
  hapticCallEnded,
  hapticBurnEffect,
} from './utils/helpers';
import { apiRequest, getWebSocketUrl } from './utils/api';
import {
  NetworkSettings,
  loadNetworkSettings,
  saveNetworkSettings,
  getEffectivePingIntervalMs,
  isLowDataActive,
  onNetworkChange,
} from './utils/network';
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
} from './utils/session';
import {
  dispatchNotification,
  getNotificationPermissionState,
  subscribeUserToPush,
  getUnreadNotificationCount,
  updateAppBadge,
  onNotificationRoute,
} from './utils/notifications';
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
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

  // 1. Check URL parameters, hash, or saved persistent session on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryPin = searchParams.get('pin') || searchParams.get('p') || '';
    if (queryPin) {
      setPin(queryPin);
    }

    const pathname = window.location.pathname;
    const matchPath = pathname.match(/\/(?:private|room|join)\/([a-zA-Z0-9_-]+)/);
    if (matchPath && matchPath[1]) {
      setRoomCode(matchPath[1].toUpperCase());
      setCurrentScreen('JOIN');
      return;
    }

    const queryRoom = searchParams.get('room') || searchParams.get('code') || searchParams.get('r');
    if (queryRoom) {
      setRoomCode(queryRoom.toUpperCase());
      setCurrentScreen('JOIN');
      return;
    }

    const hash = window.location.hash.replace(/^#\/?(room\/|join\/|private\/)?/, '');
    if (hash && hash.length >= 4 && hash.length <= 20) {
      const [hashCode, hashQuery] = hash.split('?');
      setRoomCode(hashCode.toUpperCase());
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        const hashPin = hashParams.get('pin') || hashParams.get('p');
        if (hashPin) setPin(hashPin);
      }
      setCurrentScreen('JOIN');
      return;
    }

    // 2. Restore active session across page reloads / app restarts
    const savedSession = getActiveSession();
    if (savedSession && savedSession.roomCode && savedSession.sessionToken) {
      setRoomCode(savedSession.roomCode);
      if (savedSession.pin) setPin(savedSession.pin);
      setSessionToken(savedSession.sessionToken);
      setRole(savedSession.role);
      setExpiresAt(savedSession.expiresAt);
      loadRoomSession(savedSession.roomCode, savedSession.sessionToken);
      setCurrentScreen('CHAT');
    }
  }, []);

  // Notification listeners & ServiceWorker initialization
  useEffect(() => {
    // 1. Initial badge update from unread history (excluding expired messages)
    const count = getUnreadNotificationCount();
    setUnreadNotificationCount(count);
    updateAppBadge(count);

    // 2. Register Service Worker for background notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('VELORA ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('VELORA ServiceWorker registration notice:', err);
        });

      // Handle notification click routing messages posted by service worker
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'VELORA_NOTIFICATION_CLICK') {
          const payload = event.data.payload;
          if (payload?.roomCode) {
            const targetCode = payload.roomCode.toUpperCase();
            if (targetCode === roomCode && sessionToken) {
              loadRoomSession(targetCode, sessionToken);
              setCurrentScreen('CHAT');
            } else {
              setRoomCode(targetCode);
              setCurrentScreen('JOIN');
            }
          }
          const nextCount = getUnreadNotificationCount();
          setUnreadNotificationCount(nextCount);
          updateAppBadge(nextCount);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [roomCode, sessionToken]);

  // Listen for custom in-app notification routing clicks (from toasts or notification history center)
  useEffect(() => {
    const unsubscribe = onNotificationRoute((payload) => {
      if (payload.roomCode) {
        const targetCode = payload.roomCode.toUpperCase();
        if (targetCode === roomCode && sessionToken) {
          loadRoomSession(targetCode, sessionToken);
          setCurrentScreen('CHAT');
        } else {
          setRoomCode(targetCode);
          setCurrentScreen('JOIN');
        }
      }
      const nextCount = getUnreadNotificationCount();
      setUnreadNotificationCount(nextCount);
      updateAppBadge(nextCount);
    });
    return unsubscribe;
  }, [roomCode, sessionToken]);

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
          hapticCallConnected();
        } else if (state === 'failed') {
          setCallError('Audio connection could not be established. Please try again.');
          SoundEffects.stopRingtone();
          SoundEffects.playCallEnded();
          hapticCallEnded();
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

      const wsUrl = getWebSocketUrl();
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

          if (data.type === 'auth:error') {
            console.warn('Session verification notice:', data.message);
            clearActiveSession();
            setSessionToken('');
            setSignalingStatus('disconnected');
            if (currentScreen === 'CHAT' || currentScreen === 'WAITING' || currentScreen === 'SHARE') {
              setExpiredReason(data.message || 'Your session has ended or is no longer valid.');
              setCurrentScreen('EXPIRED');
            }
            return;
          }

          if (data.type === 'auth:success') {
            setRole(data.role);
            setRoomInfo(data.roomInfo);
            setSignalingStatus('connected');
            // Ensure Web Push subscription is registered if notification permission is already granted
            if (getNotificationPermissionState() === 'granted' && sessionToken && roomCode) {
              subscribeUserToPush(sessionToken, roomCode);
            }
          } else if (data.type === 'presence') {
            setOtherUserOnline(data.otherUserOnline);
            setOtherUserRole(data.otherUserRole);
            setMemberCount(data.memberCount);

            // If in waiting/share room and other user joins, auto switch to Chat!
            if (data.memberCount >= 2 && (currentScreen === 'WAITING' || currentScreen === 'SHARE')) {
              setCurrentScreen('CHAT');
            }
          } else if (data.type === 'participant:left') {
            setOtherUserOnline(false);
            setMemberCount((prev) => Math.max(1, prev - 1));
          } else if (data.type === 'session:revoked') {
            clearActiveSession();
            setSessionToken('');
            setExpiredReason('Your session has ended.');
            setCurrentScreen('EXPIRED');
          } else if (data.type === 'typing') {
            setIsOtherTyping(data.isTyping);
          } else if (data.type === 'message:new') {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
            SoundEffects.playMessageReceived();
            hapticIncomingMessage();
          } else if (data.type === 'message:cleared') {
            setMessages([]);
            triggerHaptic('heavy');
          } else if (data.type === 'message:expired') {
            setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
          } else if (data.type === 'message:burned') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.messageId ? { ...m, isBurned: true, mediaReference: undefined, textContent: undefined } : m
              )
            );
            hapticBurnEffect();
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
            clearActiveSession();
            setSessionToken('');
            setExpiredReason('This private room has expired.');
            setCurrentScreen('EXPIRED');
          } else if (data.type === 'room:closed') {
            clearActiveSession();
            setSessionToken('');
            setExpiredReason(data.reason || 'This private room was closed.');
            setCurrentScreen('EXPIRED');
          } else if (data.type === 'notification:event') {
            if (data.notification) {
              dispatchNotification(data.notification);
              const count = getUnreadNotificationCount();
              setUnreadNotificationCount(count);
              updateAppBadge(count);
            }
          }
        } catch (e) {
          console.error('Error handling ws message:', e);
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        setPingLatency(null);
        // Automatically reconnect after 1.5s if session is still active
        if (!isUnmounted && currentScreen !== 'LANDING' && currentScreen !== 'EXPIRED' && roomCode && sessionToken) {
          reconnectCountRef.current += 1;
          setSignalingStatus('reconnecting');
          reconnectTimer = setTimeout(() => {
            if (roomCode && sessionToken) {
              connectWs();
              loadRoomSession(roomCode, sessionToken);
            }
          }, 1500);
        } else {
          setSignalingStatus(navigator.onLine ? 'connected' : 'disconnected');
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
      if (!roomCode || !sessionToken) return;
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
      startHapticCallAlert();
    } else if (payload.type === 'call:accept') {
      // Peer accepted, create WebRTC offer
      setCallState('CONNECTED');
      setCallError(null);
      SoundEffects.stopRingtone();
      stopHapticCallAlert();
      hapticCallConnected();
      try {
        await webrtcRef.current.startCall(roomCode, role);
      } catch (err: any) {
        console.error('Error starting WebRTC call:', err);
        setCallError(err.message || 'Failed to start audio call.');
      }
    } else if (payload.type === 'call:reject') {
      SoundEffects.stopRingtone();
      stopHapticCallAlert();
      SoundEffects.playCallEnded();
      hapticCallEnded();
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
      stopHapticCallAlert();
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
    triggerHaptic('impact');
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
    stopHapticCallAlert();
    hapticCallConnected();
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
    stopHapticCallAlert();
    hapticCallEnded();
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
    stopHapticCallAlert();
    SoundEffects.playCallEnded();
    hapticCallEnded();
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
    triggerHaptic('light');
    if (webrtcRef.current) {
      const nextMuted = !isMuted;
      webrtcRef.current.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const handleToggleSpeaker = () => {
    triggerHaptic('light');
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
      hapticMessageSent();
      const data = await apiRequest(`/api/rooms/${roomCode}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
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
      const data = await apiRequest(`/api/rooms/${roomCode}/timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ defaultMessageExpiration }),
      });
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
      const data = await apiRequest(`/api/rooms/${roomCode}/messages/${messageId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
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
      await apiRequest(`/api/rooms/${roomCode}/clear`, {
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
      await apiRequest(`/api/rooms/${roomCode}/burn-photo`, {
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

  const handleLeaveRoom = async () => {
    try {
      if (roomCode && sessionToken) {
        await apiRequest(`/api/rooms/${roomCode}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (err) {
      console.error('Leave room error:', err);
    } finally {
      clearActiveSession();
      if (socketRef.current) {
        socketRef.current.close();
      }
      setRoomCode('');
      setPin('');
      setSessionToken('');
      setMessages([]);
      setCurrentScreen('LANDING');
    }
  };

  const handleCloseRoom = async () => {
    try {
      if (roomCode && sessionToken) {
        await apiRequest(`/api/rooms/${roomCode}/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (err) {
      console.error('Close room error:', err);
    } finally {
      clearActiveSession();
      if (socketRef.current) {
        socketRef.current.close();
      }
      setExpiredReason('You have ended the private room.');
      setCurrentScreen('EXPIRED');
    }
  };

  // Fetch initial messages & authoritative session state on entering chat or reconnecting
  const loadRoomSession = async (code: string, token: string) => {
    if (!code || !token) return;
    try {
      const data = await apiRequest(`/api/rooms/${code}/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        // 1. Authoritative Room Metadata
        setRoomInfo(data.roomInfo);
        setRole(data.role);

        // 2. Authoritative Room Expiration Timestamp
        const serverRoomExpiresAt = Number(data.roomInfo?.expiresAt || data.expiresAt);
        if (serverRoomExpiresAt > 0) {
          setExpiresAt(serverRoomExpiresAt);
          // Keep persistent session storage in sync with authoritative server expiry
          saveActiveSession({
            roomCode: code,
            sessionToken: token,
            role: data.role,
            expiresAt: serverRoomExpiresAt,
            pin: pin || undefined,
          });
        }

        // 3. Authoritative Messages & Individual Expiration Timestamps
        const now = Date.now();
        const serverMessages: MessageItem[] = Array.isArray(data.messages) ? data.messages : [];
        const authoritativeMessages = serverMessages
          .filter((msg) => !msg.isBurned && (!msg.expiresAt || msg.expiresAt > now))
          .map((msg) => {
            let messageExpiresAt = msg.expiresAt;
            if (typeof messageExpiresAt !== 'number') {
              if (msg.burnOnRead) {
                if (msg.viewedAt && typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0) {
                  messageExpiresAt = msg.viewedAt + msg.burnAfterSeconds * 1000;
                }
              } else if (typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0) {
                messageExpiresAt = msg.createdAt + msg.burnAfterSeconds * 1000;
              } else if (serverRoomExpiresAt > 0) {
                messageExpiresAt = serverRoomExpiresAt;
              }
            }

            return {
              ...msg,
              expiresAt: messageExpiresAt,
            };
          })
          .filter((msg) => !msg.expiresAt || msg.expiresAt > now);

        // Completely replace local messages with authoritative server state
        setMessages(authoritativeMessages);
      }
    } catch (e: any) {
      const errMsg = e?.message || '';
      console.warn('Session verification notice:', errMsg || e);
      if (
        errMsg.includes('Invalid session') ||
        errMsg.includes('Missing session token') ||
        errMsg.includes('Session expired') ||
        errMsg.includes('Room not found') ||
        errMsg.includes('expired or closed')
      ) {
        clearActiveSession();
        setSessionToken('');
        if (currentScreen === 'CHAT' || currentScreen === 'WAITING' || currentScreen === 'SHARE') {
          setExpiredReason('Your session has ended or is no longer valid. Please re-enter the room.');
          setCurrentScreen('EXPIRED');
        }
      }
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
    saveActiveSession({
      roomCode: data.roomCode,
      pin: data.pin,
      sessionToken: data.sessionToken,
      role: 'owner',
      expiresAt: data.expiresAt,
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
    saveActiveSession({
      roomCode: data.roomCode,
      sessionToken: data.sessionToken,
      role: 'guest',
      expiresAt: data.expiresAt,
    });
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
      <div className={`min-h-full flex-1 flex flex-col bg-[#0B0C0F] text-[#F5F3EE] font-sans selection:bg-[#E8D8B8] selection:text-[#121419] relative ${currentScreen === 'CHAT' ? 'h-[100dvh] overflow-hidden' : 'pb-16 sm:pb-0'}`}>
        {/* Top Signaling Connection Status Bar */}
        <ConnectionStatusBar
          status={signalingStatus}
          latency={pingLatency}
          lowDataActive={isLowData}
          pingIntervalSeconds={currentPingIntervalSec}
          onReconnect={() => triggerWsReconnectRef.current?.()}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Top Navigation - rendered for all screens EXCEPT active chat (which has its own full-featured native chat header) */}
        {currentScreen !== 'CHAT' && (
          <Navbar
            currentRoomCode={['WAITING', 'SHARE'].includes(currentScreen) ? roomCode : undefined}
            roomStatus={roomInfo?.status}
            memberCount={memberCount}
            signalingStatus={signalingStatus}
            pingLatency={pingLatency}
            onNavigateHome={handleGoHome}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            unreadNotificationsCount={unreadNotificationCount}
            onOpenNotifications={() => setIsNotificationModalOpen(true)}
            isLowDataActive={isLowData}
          />
        )}

        {/* Main Screen Views */}
        <main className={`flex-1 flex flex-col ${currentScreen === 'CHAT' ? 'h-full overflow-hidden' : 'justify-center'}`}>
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
              hasActiveRoom={Boolean(roomCode && sessionToken)}
              activeRoomCode={roomCode}
              onResumeRoom={() => {
                loadRoomSession(roomCode, sessionToken);
                setCurrentScreen('CHAT');
              }}
            />
          )}

          {currentScreen === 'SHARE' && (
            <ShareRoomView
              roomCode={roomCode}
              pin={pin}
              expiresAt={expiresAt}
              onEnterRoom={handleEnterFromShare}
              onScanPartnerQr={(scannedCode, scannedPin) => {
                setRoomCode(scannedCode.toUpperCase());
                if (scannedPin) {
                  setPin(scannedPin);
                }
                setCurrentScreen('JOIN');
              }}
            />
          )}

          {currentScreen === 'JOIN' && (
            <JoinRoomView
              initialRoomCode={roomCode}
              initialPin={pin}
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
              sessionToken={sessionToken}
              role={role}
              roomInfo={roomInfo}
              messages={messages}
              otherUserOnline={otherUserOnline}
              isOtherTyping={isOtherTyping}
              networkSettings={networkSettings}
              signalingStatus={signalingStatus}
              pingLatency={pingLatency}
              unreadNotificationsCount={unreadNotificationCount}
              onNavigateHome={handleGoHome}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onOpenNotifications={() => setIsNotificationModalOpen(true)}
              onSendMessage={handleSendMessage}
              onSendTyping={handleSendTyping}
              onStartCall={handleStartCall}
              onClearConversation={handleClearConversation}
              onLeaveRoom={handleLeaveRoom}
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
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenRoomInfo={() => setIsSettingsModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onStartCall={handleStartCall}
          isCallActive={callState !== 'IDLE'}
        />

        {/* Private Profile & Preferences Modal */}
        <ProfileView
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentRoomCode={roomCode || undefined}
          hasActiveSession={Boolean(roomCode && sessionToken)}
          onLeaveRoom={handleGoHome}
          onClearSession={handleClearConversation}
          onTerminate={() => {
            handleCloseRoom();
            setIsProfileModalOpen(false);
          }}
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
          roomCode={roomCode}
          sessionToken={sessionToken}
        />

        {/* Notification History Center Modal */}
        <NotificationCenterModal
          isOpen={isNotificationModalOpen}
          onClose={() => {
            setIsNotificationModalOpen(false);
            const count = getUnreadNotificationCount();
            setUnreadNotificationCount(count);
            updateAppBadge(count);
          }}
        />

        {/* In-App Floating Notification Toast */}
        <NotificationToast />

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
