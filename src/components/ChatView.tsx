import React, { useState, useRef, useEffect } from 'react';
import type { MessageItem, MemberRole, RoomInfo, ViewMode, SignalingStatus } from '../types';
import { MessageList } from './MessageList';
import { ClearConversationModal } from './ClearConversationModal';
import { DisappearingPhotoModal } from './DisappearingPhotoModal';
import { VoiceRecorder } from './VoiceRecorder';
import { LeaveRoomModal } from './LeaveRoomModal';
import { RoomInfoModal } from './RoomInfoModal';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { VoiceRecorder as AudioRecorderClass, SoundEffects } from '../utils/audio';
import {
  formatTimeRemaining,
  formatDuration,
  triggerHaptic,
  hapticRecordStart,
  hapticRecordStop,
  hapticMessageSent,
} from '../utils/helpers';
import { NetworkSettings, isLowDataActive, DEFAULT_NETWORK_SETTINGS } from '../utils/network';

interface ChatViewProps {
  roomCode: string;
  pin?: string;
  sessionToken?: string;
  role: MemberRole;
  roomInfo: RoomInfo;
  messages: MessageItem[];
  otherUserOnline: boolean;
  isOtherTyping: boolean;
  networkSettings?: NetworkSettings;
  signalingStatus?: SignalingStatus;
  pingLatency?: number | null;
  unreadNotificationsCount?: number;
  onNavigateHome?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onSendMessage: (payload: {
    type: 'TEXT' | 'VOICE' | 'IMAGE';
    textContent?: string;
    mediaReference?: string;
    duration?: number;
    viewMode?: ViewMode;
    burnAfterSeconds?: number;
    burnOnRead?: boolean;
  }) => Promise<void>;
  onSendTyping: (isTyping: boolean) => void;
  onStartCall: () => void;
  onClearConversation: () => void;
  onLeaveRoom?: () => void;
  onCloseRoom: () => void;
  onBurnPhoto: (messageId: string) => void;
  onUpdateRoomTimer?: (defaultExpiration: number) => Promise<void>;
  onViewMessage?: (messageId: string) => Promise<void>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  roomCode,
  pin,
  sessionToken,
  role,
  roomInfo,
  messages,
  otherUserOnline,
  isOtherTyping,
  networkSettings = DEFAULT_NETWORK_SETTINGS,
  signalingStatus = 'connected',
  pingLatency,
  unreadNotificationsCount = 0,
  onNavigateHome,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  onSendMessage,
  onSendTyping,
  onStartCall,
  onClearConversation,
  onLeaveRoom,
  onCloseRoom,
  onBurnPhoto,
  onUpdateRoomTimer,
  onViewMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<MessageItem | null>(null);

  // Per-message custom expiration selector state
  const [messageTimerOverride] = useState<number | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>(Array(24).fill(0.15));
  const [recordingVolume, setRecordingVolume] = useState<number>(0);
  const [recordingFreqData, setRecordingFreqData] = useState<Uint8Array | null>(null);
  const [voicePreviewData, setVoicePreviewData] = useState<{
    blob: Blob;
    base64: string;
    duration: number;
  } | null>(null);

  // Voice preview playback state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const recorderRef = useRef<AudioRecorderClass | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoViewMode] = useState<ViewMode>('view_once');

  // Hold-to-record state tracking
  const holdStartTimestampRef = useRef<number | null>(null);
  const isHoldingRef = useRef<boolean>(false);

  // Revealed burn-on-read messages tracking
  const [revealedMessageIds, setRevealedMessageIds] = useState<Set<string>>(new Set());

  // Real-time tick (1 second) for countdown calculations
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  // Handle preview audio element initialization & cleanup
  useEffect(() => {
    if (!voicePreviewData) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
      return;
    }

    const audio = new Audio(voicePreviewData.base64);
    previewAudioRef.current = audio;

    audio.ontimeupdate = () => {
      setPreviewCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
      previewAudioRef.current = null;
    };
  }, [voicePreviewData]);

  const togglePreviewPlayback = () => {
    if (!previewAudioRef.current) return;
    triggerHaptic('light');
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch(() => {});
    }
  };

  const handleSeekPreview = (percent: number) => {
    if (!previewAudioRef.current || !voicePreviewData) return;
    const maxDur = Math.max(voicePreviewData.duration, 1);
    const target = percent * maxDur;
    setPreviewCurrentTime(target);
    previewAudioRef.current.currentTime = target;
  };

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    onSendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    onSendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let burnOnRead = false;
    let burnAfterSeconds: number | undefined = undefined;

    if (messageTimerOverride === -1) {
      burnOnRead = true;
      burnAfterSeconds = 10;
    } else if (typeof messageTimerOverride === 'number' && messageTimerOverride > 0) {
      burnAfterSeconds = messageTimerOverride;
    } else if (roomInfo?.defaultMessageExpiration === -1) {
      burnOnRead = true;
      burnAfterSeconds = 10;
    } else if (
      typeof roomInfo?.defaultMessageExpiration === 'number' &&
      roomInfo.defaultMessageExpiration > 0
    ) {
      burnAfterSeconds = roomInfo.defaultMessageExpiration;
    }

    try {
      await onSendMessage({
        type: 'TEXT',
        textContent: text,
        burnOnRead,
        burnAfterSeconds,
      });
      SoundEffects.playMessageSent();
      triggerHaptic('light');
    } catch {
      triggerHaptic('warning');
    }
  };

  // Start Voice Recording (with live waveform extraction)
  const startRecording = async () => {
    try {
      hapticRecordStart();
      const recorder = new AudioRecorderClass();
      await recorder.start((volume, freqData) => {
        setRecordingVolume(volume);
        if (freqData) {
          setRecordingFreqData(new Uint8Array(freqData));
          const sampleCount = 24;
          const step = Math.max(1, Math.floor(freqData.length / sampleCount));
          const bars: number[] = [];
          for (let i = 0; i < sampleCount; i++) {
            const raw = freqData[Math.min(freqData.length - 1, i * step)] || 0;
            const norm = Math.max(0.12, Math.min(1.0, (raw / 255) * 1.5 + volume * 0.4));
            bars.push(norm);
          }
          setLiveWaveform(bars);
        } else {
          setRecordingFreqData(null);
          const bars = Array.from({ length: 24 }, (_, i) => {
            const phase = (Date.now() / 150 + i * 0.4) % (Math.PI * 2);
            return Math.max(0.15, Math.min(1.0, (Math.sin(phase) + 1) * 0.4 * volume + 0.15));
          });
          setLiveWaveform(bars);
        }
      });

      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      setVoicePreviewData(null);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      SoundEffects.playRecordStart();
    } catch (err: any) {
      alert('Microphone access is required to record voice notes: ' + err.message);
    }
  };

  // Stop Recording & Preview
  const stopRecording = async () => {
    if (!recorderRef.current) return;
    hapticRecordStop();

    try {
      const data = await recorderRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      setIsRecording(false);
      setRecordingVolume(0);
      setRecordingFreqData(null);
      setVoicePreviewData(data);
      SoundEffects.playRecordStop();
    } catch {
      setIsRecording(false);
      setRecordingVolume(0);
      setRecordingFreqData(null);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingVolume(0);
    setRecordingFreqData(null);
    setVoicePreviewData(null);
    triggerHaptic('light');
  };

  // Send Recorded Voice
  const handleSendVoice = async () => {
    if (!voicePreviewData) return;
    hapticMessageSent();

    let burnOnRead = false;
    let burnAfterSeconds: number | undefined = undefined;

    if (messageTimerOverride === -1) {
      burnOnRead = true;
      burnAfterSeconds = 10;
    } else if (typeof messageTimerOverride === 'number' && messageTimerOverride > 0) {
      burnAfterSeconds = messageTimerOverride;
    } else if (roomInfo?.defaultMessageExpiration === -1) {
      burnOnRead = true;
      burnAfterSeconds = 10;
    } else if (
      typeof roomInfo?.defaultMessageExpiration === 'number' &&
      roomInfo.defaultMessageExpiration > 0
    ) {
      burnAfterSeconds = roomInfo.defaultMessageExpiration;
    }

    try {
      await onSendMessage({
        type: 'VOICE',
        mediaReference: voicePreviewData.base64,
        duration: voicePreviewData.duration,
        burnOnRead,
        burnAfterSeconds,
      });

      setVoicePreviewData(null);
      SoundEffects.playMessageSent();
    } catch {
      triggerHaptic('warning');
    }
  };

  // Handle Hold / Tap Microphone Pointer Events
  const handleMicPointerDown = () => {
    holdStartTimestampRef.current = Date.now();
    isHoldingRef.current = true;
    if (!isRecording && !voicePreviewData) {
      startRecording();
    }
  };

  const handleMicPointerUp = () => {
    if (holdStartTimestampRef.current && isHoldingRef.current) {
      const holdDuration = Date.now() - holdStartTimestampRef.current;
      isHoldingRef.current = false;
      holdStartTimestampRef.current = null;

      if (holdDuration >= 700 && isRecording) {
        stopRecording();
      }
    }
  };

  // Stop recording and send directly
  const handleDirectSendRecording = async () => {
    if (!recorderRef.current) return;
    hapticRecordStop();
    try {
      const data = await recorderRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      SoundEffects.playRecordStop();

      let burnOnRead = false;
      let burnAfterSeconds: number | undefined = undefined;
      if (messageTimerOverride === -1) {
        burnOnRead = true;
        burnAfterSeconds = 10;
      } else if (typeof messageTimerOverride === 'number' && messageTimerOverride > 0) {
        burnAfterSeconds = messageTimerOverride;
      } else if (roomInfo?.defaultMessageExpiration === -1) {
        burnOnRead = true;
        burnAfterSeconds = 10;
      } else if (
        typeof roomInfo?.defaultMessageExpiration === 'number' &&
        roomInfo.defaultMessageExpiration > 0
      ) {
        burnAfterSeconds = roomInfo.defaultMessageExpiration;
      }

      hapticMessageSent();
      await onSendMessage({
        type: 'VOICE',
        mediaReference: data.base64,
        duration: data.duration,
        burnOnRead,
        burnAfterSeconds,
      });
      SoundEffects.playMessageSent();
    } catch {
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Handle Photo Select
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;

      let burnAfterSeconds = 0;
      if (photoViewMode === 'timed_5') burnAfterSeconds = 5;
      if (photoViewMode === 'timed_10') burnAfterSeconds = 10;
      if (photoViewMode === 'timed_30') burnAfterSeconds = 30;
      if (photoViewMode === 'timed_60') burnAfterSeconds = 60;

      try {
        await onSendMessage({
          type: 'IMAGE',
          mediaReference: base64,
          viewMode: photoViewMode,
          burnAfterSeconds,
          burnOnRead: photoViewMode !== 'standard',
        });
        SoundEffects.playMessageSent();
        triggerHaptic('medium');
      } catch {
        triggerHaptic('warning');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reveal a confidential burn-on-read text message
  const handleRevealMessage = (msg: MessageItem) => {
    triggerHaptic('medium');
    setRevealedMessageIds((prev) => new Set(prev).add(msg.id));
    if (onViewMessage) {
      onViewMessage(msg.id);
    }
  };

  const getExpirationBadge = (seconds?: number) => {
    const val = seconds !== undefined ? seconds : roomInfo?.defaultMessageExpiration ?? 0;
    if (val === -1) return { label: 'Burn on Read', short: 'Burn', color: 'text-[#FF5C5C]', icon: 'local_fire_department' };
    if (val === 10) return { label: '10s', short: '10s', color: 'text-[#E8D8B8]', icon: 'bolt' };
    if (val === 30) return { label: '30s', short: '30s', color: 'text-[#E8D8B8]', icon: 'bolt' };
    if (val === 60) return { label: '1m', short: '1m', color: 'text-[#E8D8B8]', icon: 'bolt' };
    if (val === 300) return { label: '5m', short: '5m', color: 'text-[#9B9DA3]', icon: 'schedule' };
    if (val === 3600) return { label: '1h', short: '1h', color: 'text-[#9B9DA3]', icon: 'schedule' };
    if (val === 86400) return { label: '24h', short: '24h', color: 'text-[#9B9DA3]', icon: 'schedule' };
    return { label: 'Session Lifetime', short: 'Room', color: 'text-[#E8D8B8]', icon: 'hourglass_top' };
  };

  const formatCountdown = (msg: MessageItem): string | null => {
    if (msg.expiresAt) {
      const remainingMs = msg.expiresAt - now;
      if (remainingMs <= 0) return 'Burned';
      const secs = Math.ceil(remainingMs / 1000);
      if (secs < 60) return `${secs}s`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m`;
      return `${Math.floor(mins / 60)}h`;
    }

    if (msg.burnOnRead) {
      if (!msg.viewedAt) return 'Burn on Read';
      const durationSecs = msg.burnAfterSeconds ?? 10;
      const elapsed = Math.floor((now - msg.viewedAt) / 1000);
      const left = Math.max(0, durationSecs - elapsed);
      return left > 0 ? `${left}s` : 'Burned';
    }

    if (typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0) {
      const elapsed = Math.floor((now - msg.createdAt) / 1000);
      const left = Math.max(0, msg.burnAfterSeconds - elapsed);
      return left > 0 ? `${left}s` : 'Burned';
    }

    return null;
  };

  const roomExpirationBadge = getExpirationBadge();

  const timerOptions = [
    { label: 'Room Lifetime', value: 0, desc: 'Keep until session closes', icon: 'hourglass_top' },
    { label: 'Burn on Read', value: -1, desc: '10s after recipient opens/views', icon: 'local_fire_department' },
    { label: '10 Seconds', value: 10, desc: 'Sub-minute immediate burn', icon: 'bolt' },
    { label: '30 Seconds', value: 30, desc: 'Quick self-destruct', icon: 'bolt' },
    { label: '1 Minute', value: 60, desc: 'Auto-delete after 60 seconds', icon: 'bolt' },
    { label: '5 Minutes', value: 300, desc: 'Auto-delete after 5 minutes', icon: 'schedule' },
    { label: '1 Hour', value: 3600, desc: 'Auto-delete after 1 hour', icon: 'schedule' },
    { label: '24 Hours', value: 86400, desc: 'Standard 24-hour retention', icon: 'schedule' },
  ];

  return (
    <div className="flex flex-col w-full h-[100dvh] max-w-4xl mx-auto bg-[#0B0C0F] text-[#F5F3EE] font-sans relative overflow-hidden">
      {/* Unified Native Chat Top Bar */}
      <header className="px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between border-b border-[#272A31] bg-[#0B0C0F]/95 backdrop-blur-xl sticky top-0 z-30 shadow-sm select-none">
        {/* Left Side: Back button + Peer Info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onNavigateHome();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#181B21] transition-colors cursor-pointer flex-shrink-0"
              title="Return to Home"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          )}

          {/* Peer Avatar & Title (Clickable for Room Info) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowCredsModal(true);
            }}
            id="chat-header-room-info-btn"
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 text-left cursor-pointer hover:opacity-85 active:scale-98 transition-all p-1 -m-1 rounded-xl"
            title="View Room Info & Security Details"
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center text-[#E8D8B8]">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">lock</span>
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0B0C0F] ${
                  otherUserOnline ? 'bg-[#7ED6A5]' : 'bg-[#6E7179]'
                }`}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-sm sm:text-base text-[#F5F3EE] font-bold leading-tight truncate">
                  Private Space
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#181B21] text-[#E8D8B8] border border-[#272A31] hidden sm:inline">
                  {roomCode}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {isOtherTyping ? (
                  <span className="font-mono text-[11px] text-[#E8D8B8] italic animate-pulse">
                    typing...
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-[#9B9DA3] truncate">
                    {otherUserOnline ? 'Peer Connected' : 'Waiting for peer...'}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Quick Disappearing Timer Pill */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowTimerModal(true);
            }}
            id="room-timer-settings-btn"
            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 sm:px-3 sm:py-1 rounded-full border border-[#272A31] bg-[#181B21] text-[#F5F3EE] hover:border-[#E8D8B8]/40 active:scale-95 transition-all cursor-pointer"
            title="Configure Disappearing Messages Timer"
          >
            <span className={`material-symbols-outlined text-[14px] ${roomExpirationBadge.color}`}>
              {roomExpirationBadge.icon}
            </span>
            <span className="font-semibold">{roomExpirationBadge.short}</span>
          </button>

          {/* Start Audio Call Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onStartCall();
            }}
            id="start-call-btn"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#181B21] border border-[#272A31] hover:border-[#E8D8B8]/40 active:scale-95 transition-all text-[#E8D8B8] cursor-pointer"
            title="Start Encrypted Voice Call"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[19px]">call</span>
          </button>

          {/* Notification Center Button */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenNotifications();
              }}
              id="chat-header-notifications-btn"
              className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#181B21] border border-[#272A31] hover:border-[#E8D8B8]/40 text-[#9B9DA3] hover:text-[#F5F3EE] active:scale-95 transition-all cursor-pointer"
              title="Notification Center"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[19px]">notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#FF5C5C] text-[#F5F3EE] font-mono text-[9px] font-bold flex items-center justify-center border border-[#0B0C0F]">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* More Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowMenu(!showMenu);
              }}
              id="room-menu-btn"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#181B21] border border-[#272A31] hover:border-[#E8D8B8]/40 text-[#9B9DA3] hover:text-[#F5F3EE] active:scale-95 transition-all cursor-pointer"
              title="More options"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">more_vert</span>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-11 w-64 rounded-2xl bg-[#121419] border border-[#272A31] shadow-2xl py-1.5 z-50 animate-scale-up font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setShowTimerModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#FF5C5C] text-[17px]">local_fire_department</span>
                  <span>Disappearing Timer</span>
                </button>

                {onOpenNotifications && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenNotifications();
                    }}
                    className="w-full px-3.5 py-2.5 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#E8D8B8] text-[17px]">notifications</span>
                    <div className="flex items-center justify-between flex-1">
                      <span>Notifications</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="text-[9px] bg-[#FF5C5C] text-[#F5F3EE] px-1.5 py-0.2 rounded-full font-mono font-bold">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full px-3.5 py-2.5 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#E8D8B8] text-[17px]">tune</span>
                    <div className="flex items-center justify-between flex-1">
                      <span>Network & Low Data</span>
                      {isLowDataActive(networkSettings) && (
                        <span className="text-[9px] bg-[#E8D8B8]/20 text-[#E8D8B8] px-1.5 py-0.2 rounded-full font-mono">
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowCredsModal(true);
                    setShowMenu(false);
                  }}
                  id="room-info-menu-btn"
                  className="w-full px-3.5 py-2.5 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#E8D8B8] text-[17px]">info</span>
                  <span>Room Info & Security</span>
                </button>

                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenProfile();
                    }}
                    className="w-full px-3.5 py-2.5 text-xs text-left text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#9B9DA3] text-[17px]">person</span>
                    <span>Private Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowClearModal(true);
                  }}
                  id="clear-conversation-menu-btn"
                  className="w-full px-3.5 py-2.5 text-xs text-left text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#181B21] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
                  <span>Clear Conversation</span>
                </button>

                <div className="h-px bg-[#272A31] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowLeaveModal(true);
                  }}
                  id="leave-room-menu-btn"
                  className="w-full px-3.5 py-2.5 text-xs text-left text-[#FF5C5C] hover:bg-[#FF5C5C]/10 flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                  <span>Leave Private Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Close and wipe this private room permanently for both users?')) {
                      onCloseRoom();
                    }
                  }}
                  id="close-room-menu-btn"
                  className="w-full px-3.5 py-2.5 text-xs text-left text-[#FF5C5C]/80 hover:text-[#FF5C5C] hover:bg-[#FF5C5C]/10 flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">power_settings_new</span>
                  <span>Close & Burn Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Message List Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 flex flex-col gap-2 relative z-10 overscroll-contain" id="chat-messages">
        {/* Compact Room Expiration Badge (Clickable for Room Info) */}
        <div className="flex justify-center my-1 select-none">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowCredsModal(true);
            }}
            id="chat-compact-room-info-btn"
            className="px-3 py-0.5 rounded-full bg-[#181B21] border border-[#272A31] hover:border-[#E8D8B8]/40 text-[#9B9DA3] hover:text-[#F5F3EE] font-mono text-[10px] sm:text-[11px] backdrop-blur-sm flex items-center gap-1.5 transition-all cursor-pointer"
            title="View Server Expiration & Room Details"
          >
            <span className="material-symbols-outlined text-[13px] text-[#E8D8B8]">hourglass_top</span>
            <span>{formatTimeRemaining(roomInfo.expiresAt, now)} Left in Room</span>
          </button>
        </div>

        {/* Private Notification Permission Prompt Banner */}
        <NotificationPermissionBanner roomCode={roomCode} sessionToken={sessionToken} />

        <MessageList
          messages={messages}
          role={role}
          now={now}
          revealedMessageIds={revealedMessageIds}
          networkSettings={networkSettings}
          isOtherTyping={isOtherTyping}
          messagesEndRef={messagesEndRef}
          onRevealMessage={handleRevealMessage}
          onSelectPhoto={(msg) => setSelectedPhoto(msg)}
          onViewMessage={onViewMessage}
        />
      </div>

      {/* Hidden file input for photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Voice Recorder & Preview Active Component */}
      <VoiceRecorder
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        maxRecordingSeconds={60}
        liveWaveform={liveWaveform}
        freqData={recordingFreqData}
        volume={recordingVolume}
        voicePreviewData={voicePreviewData}
        isPreviewPlaying={isPreviewPlaying}
        previewCurrentTime={previewCurrentTime}
        onCancelRecording={cancelRecording}
        onStopRecording={stopRecording}
        onDirectSendRecording={handleDirectSendRecording}
        onTogglePreviewPlayback={togglePreviewPlayback}
        onSeekPreview={handleSeekPreview}
        onDiscardPreview={() => setVoicePreviewData(null)}
        onSendVoice={handleSendVoice}
      />

      {/* Chat Composer Bar (Native Mobile Optimized with Safe-Area) */}
      {!isRecording && !voicePreviewData && (
        <div className="w-full px-2.5 sm:px-4 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0B0C0F]/95 backdrop-blur-xl z-40 border-t border-[#272A31] shadow-[0_-4px_20px_rgba(0,0,0,0.6)] flex-shrink-0">
          <form onSubmit={handleSendText} className="flex items-end gap-2 max-w-4xl mx-auto">
            {/* Plus / Media Menu Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                fileInputRef.current?.click();
              }}
              id="chat-attach-btn"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center flex-shrink-0 hover:bg-[#272A31] hover:border-[#E8D8B8]/40 active:scale-95 transition-all text-[#F5F3EE] shadow-sm cursor-pointer"
              title="Attach Ephemeral Photo"
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">add</span>
            </button>

            {/* Textarea Composer Container */}
            <div className="flex-1 bg-[#181B21] border border-[#272A31] rounded-[22px] min-h-[40px] sm:min-h-[44px] flex items-center px-3 sm:px-3.5 py-0.5 shadow-inner focus-within:border-[#E8D8B8]/60 transition-all">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                id="chat-textarea-input"
                className="w-full bg-transparent text-[#F5F3EE] font-sans text-sm sm:text-base placeholder-[#6E7179] outline-none resize-none max-h-24 sm:max-h-32 py-2 leading-relaxed"
                style={{ minHeight: '38px' }}
              />

              {/* Mic button inside textarea container */}
              {!inputText.trim() && (
                <button
                  type="button"
                  onPointerDown={handleMicPointerDown}
                  onPointerUp={handleMicPointerUp}
                  onClick={() => {
                    if (!isRecording) {
                      triggerHaptic('medium');
                      startRecording();
                    }
                  }}
                  id="mic-record-btn"
                  className="w-8 h-8 sm:w-9 sm:h-9 -mr-1 rounded-full flex items-center justify-center flex-shrink-0 text-[#9B9DA3] hover:text-[#E8D8B8] active:scale-90 transition-all cursor-pointer select-none"
                  title="Hold or Tap to Record Voice Note"
                >
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              id="send-chat-btn"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#E8D8B8] hover:bg-[#F0E3C8] text-[#121419] flex items-center justify-center flex-shrink-0 active:scale-90 transition-all shadow-md cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              title="Send Message"
            >
              <span className="material-symbols-outlined text-[19px] sm:text-[20px] font-bold">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Disappearing Photo Modal */}
      {selectedPhoto && (
        <DisappearingPhotoModal
          message={selectedPhoto}
          onBurnPhoto={onBurnPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* Room Message Expiration Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/90 backdrop-blur-xl animate-fade-in font-sans">
          <div className="w-full max-w-md bg-[#121419] border border-[#272A31] shadow-2xl p-5 text-[#F5F3EE] rounded-[24px] animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center text-[#FF5C5C]">
                  <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-sm sm:text-base font-bold text-[#F5F3EE]">Disappearing Messages</h3>
                  <p className="font-body-sm text-xs text-[#9B9DA3]">Synchronized across both users</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="w-8 h-8 rounded-full bg-[#181B21] flex items-center justify-center text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#272A31] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {timerOptions.map((opt) => {
                const isSelected = (roomInfo?.defaultMessageExpiration ?? 0) === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (onUpdateRoomTimer) {
                        onUpdateRoomTimer(opt.value);
                      }
                      setShowTimerModal(false);
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-[#E8D8B8] bg-[#181B21] text-[#F5F3EE] shadow-sm'
                        : 'border-[#272A31] bg-[#121419] text-[#9B9DA3] hover:border-[#272A31] hover:bg-[#181B21]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#E8D8B8]/20 text-[#E8D8B8]' : 'bg-[#181B21] text-[#6E7179]'}`}>
                        <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                      </div>
                      <div>
                        <div className="font-label-md font-bold text-xs sm:text-sm text-[#F5F3EE]">{opt.label}</div>
                        <div className="font-body-sm text-[11px] text-[#6E7179]">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <span className="material-symbols-outlined text-[#E8D8B8] text-[18px]">check</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Room Information & Security Modal */}
      <RoomInfoModal
        isOpen={showCredsModal}
        onClose={() => setShowCredsModal(false)}
        roomInfo={roomInfo}
        role={role}
        pin={pin}
        now={now}
        otherUserOnline={otherUserOnline}
        onOpenTimerModal={() => {
          setShowCredsModal(false);
          setShowTimerModal(true);
        }}
      />

      {/* Clear Conversation Confirmation Modal */}
      <ClearConversationModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => {
          setShowClearModal(false);
          onClearConversation();
        }}
      />

      {/* Leave Room Confirmation Modal */}
      <LeaveRoomModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={() => {
          setShowLeaveModal(false);
          if (onLeaveRoom) {
            onLeaveRoom();
          } else {
            onNavigateHome?.();
          }
        }}
        isOwner={role === 'owner'}
      />
    </div>
  );
};
