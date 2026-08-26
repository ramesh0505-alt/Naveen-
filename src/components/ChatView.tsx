import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Mic,
  Send,
  Trash2,
  Lock,
  Flame,
  Check,
  Clock,
  MoreVertical,
  Square,
  X,
  AlertTriangle,
  KeyRound,
  Shield,
  Hourglass,
  Zap,
  Eye,
  Sliders,
  User,
  Plus,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import type { MessageItem, MemberRole, RoomInfo, ViewMode } from '../types';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { DisappearingPhotoModal } from './DisappearingPhotoModal';
import { VoiceRecorder, SoundEffects } from '../utils/audio';
import { extractWaveformData } from '../utils/waveform';
import {
  formatTimeRemaining,
  formatDuration,
  triggerHaptic,
  hapticRecordStart,
  hapticRecordStop,
  hapticMessageSent,
} from '../utils/helpers';
import { QuickRepliesBar } from './QuickRepliesBar';
import { NetworkSettings, shouldDeferMediaDownload, isLowDataActive, DEFAULT_NETWORK_SETTINGS } from '../utils/network';

interface ChatViewProps {
  roomCode: string;
  pin?: string;
  role: MemberRole;
  roomInfo: RoomInfo;
  messages: MessageItem[];
  otherUserOnline: boolean;
  isOtherTyping: boolean;
  networkSettings?: NetworkSettings;
  onOpenSettings?: () => void;
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
  onCloseRoom: () => void;
  onBurnPhoto: (messageId: string) => void;
  onUpdateRoomTimer?: (defaultExpiration: number) => Promise<void>;
  onViewMessage?: (messageId: string) => Promise<void>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  roomCode,
  pin,
  role,
  roomInfo,
  messages,
  otherUserOnline,
  isOtherTyping,
  networkSettings = DEFAULT_NETWORK_SETTINGS,
  onOpenSettings,
  onSendMessage,
  onSendTyping,
  onStartCall,
  onClearConversation,
  onCloseRoom,
  onBurnPhoto,
  onUpdateRoomTimer,
  onViewMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<MessageItem | null>(null);

  // Per-message custom expiration selector state
  // null = use room default; -1 = burn-on-read; >0 = seconds
  const [messageTimerOverride] = useState<number | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>(Array(24).fill(0.15));
  const [voicePreviewData, setVoicePreviewData] = useState<{
    blob: Blob;
    base64: string;
    duration: number;
  } | null>(null);

  // Voice preview playback state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
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
      const recorder = new VoiceRecorder();
      await recorder.start((volume, freqData) => {
        if (freqData && freqData.length > 0) {
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
          // Simulate volume bounce if frequency data is restricted
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
      setVoicePreviewData(data);
      SoundEffects.playRecordStop();
    } catch {
      setIsRecording(false);
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

      // If user held for more than 700ms, stop and go to preview
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
    if (val === -1) return { label: 'Burn on Read', short: 'Burn', color: 'text-amber-400', icon: Flame };
    if (val === 10) return { label: '10s', short: '10s', color: 'text-amber-400', icon: Zap };
    if (val === 30) return { label: '30s', short: '30s', color: 'text-amber-400', icon: Zap };
    if (val === 60) return { label: '1m', short: '1m', color: 'text-sky-400', icon: Zap };
    if (val === 300) return { label: '5m', short: '5m', color: 'text-sky-400', icon: Clock };
    if (val === 3600) return { label: '1h', short: '1h', color: 'text-indigo-400', icon: Clock };
    if (val === 86400) return { label: '24h', short: '24h', color: 'text-zinc-400', icon: Clock };
    return { label: 'Session Lifetime', short: 'Room', color: 'text-emerald-400', icon: Hourglass };
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
  const RoomExpIcon = roomExpirationBadge.icon;

  const timerOptions = [
    { label: 'Room Lifetime', value: 0, desc: 'Keep until session closes', icon: Hourglass },
    { label: 'Burn on Read', value: -1, desc: '10s after recipient opens/views', icon: Flame },
    { label: '10 Seconds', value: 10, desc: 'Sub-minute immediate burn', icon: Zap },
    { label: '30 Seconds', value: 30, desc: 'Quick self-destruct', icon: Zap },
    { label: '1 Minute', value: 60, desc: 'Auto-delete after 60 seconds', icon: Zap },
    { label: '5 Minutes', value: 300, desc: 'Auto-delete after 5 minutes', icon: Clock },
    { label: '1 Hour', value: 3600, desc: 'Auto-delete after 1 hour', icon: Clock },
    { label: '24 Hours', value: 86400, desc: 'Standard 24-hour retention', icon: Clock },
  ];

  return (
    <div className="flex flex-col w-full h-full min-h-[calc(100dvh-4rem)] max-w-4xl mx-auto bg-[#0b1326] text-[#dae2fd] font-sans relative overflow-hidden">
      {/* Chat Header */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-[#222a3d] bg-[#0b1326]/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-full bg-[#171f33] border border-white/5 flex items-center justify-center text-[#adc6ff] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-semibold text-[#dae2fd] leading-tight">
              Private Room
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  otherUserOnline
                    ? 'bg-[#adc6ff] shadow-[0_0_8px_rgba(173,198,255,0.8)] animate-pulse'
                    : 'bg-[#8c909f]'
                }`}
              ></span>
              <span className="text-[11px] sm:text-xs font-mono text-[#c2c6d6]">
                {otherUserOnline ? 'Connected' : 'Waiting for peer...'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Timer Pill */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowTimerModal(true);
            }}
            id="room-timer-settings-btn"
            className="area-tap min-h-[48px] flex items-center gap-1.5 text-xs font-mono px-3.5 py-2.5 rounded-full border border-white/10 bg-[#171f33] text-[#dae2fd] hover:bg-[#222a3d] active:scale-95 transition-all cursor-pointer"
            title="Configure Disappearing Messages Timer"
          >
            <RoomExpIcon className={`w-4 h-4 ${roomExpirationBadge.color}`} />
            <span className="font-semibold">{roomExpirationBadge.short}</span>
          </button>

          {/* Start Audio Call Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onStartCall();
            }}
            id="start-call-btn"
            className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-[#171f33] hover:bg-[#222a3d] active:scale-95 transition-all text-[#adc6ff] cursor-pointer shadow-sm"
            title="Start Audio Call"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* More Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowMenu(!showMenu);
              }}
              id="room-menu-btn"
              className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-[#171f33]/60 hover:bg-[#171f33] text-[#c2c6d6] hover:text-[#dae2fd] active:scale-95 transition-all cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-14 w-68 rounded-2xl bg-[#171f33] border border-white/10 shadow-2xl py-2 z-50 animate-scale-up font-sans">
                <button
                  onClick={() => {
                    setShowTimerModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full min-h-[48px] px-4 py-3 text-xs text-left font-medium text-[#dae2fd] hover:bg-[#222a3d] flex items-center gap-3 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-[#ffb786] shrink-0" />
                  <span>Disappearing Messages Timer</span>
                </button>

                {onOpenSettings && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full min-h-[48px] px-4 py-3 text-xs text-left font-medium text-[#dae2fd] hover:bg-[#222a3d] flex items-center gap-3 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-[#adc6ff] shrink-0" />
                    <div className="flex items-center justify-between flex-1">
                      <span>Connection & Low Data Mode</span>
                      {isLowDataActive(networkSettings) && (
                        <span className="text-[10px] bg-[#df7412]/30 text-[#ffb786] px-1.5 py-0.5 rounded font-mono">
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowCredsModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full min-h-[48px] px-4 py-3 text-xs text-left font-medium text-[#dae2fd] hover:bg-[#222a3d] flex items-center gap-3 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#c2c6d6] shrink-0" />
                  <span>Room Credentials & PIN</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Clear all conversation messages for both users?')) {
                      onClearConversation();
                    }
                  }}
                  className="w-full min-h-[48px] px-4 py-3 text-xs text-left font-medium text-[#ffb786] hover:bg-[#222a3d] flex items-center gap-3 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Clear Conversation (Both)</span>
                </button>

                <div className="h-px bg-white/5 my-1" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Close and wipe this private room permanently?')) {
                      onCloseRoom();
                    }
                  }}
                  className="w-full min-h-[48px] px-4 py-3 text-xs text-left font-medium text-[#ffb4ab] hover:bg-[#93000a]/20 flex items-center gap-3 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Close & Burn Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 relative z-10" id="chat-messages">
        {/* Time Scrim Badge */}
        <div className="flex justify-center my-1">
          <span className="px-3 py-1 rounded-full bg-[#222a3d]/60 text-[#c2c6d6] font-mono text-[11px] backdrop-blur-sm">
            {formatTimeRemaining(roomInfo.expiresAt)} Left in Room
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#8c909f] px-4 py-16">
            <div className="w-14 h-14 rounded-full bg-[#171f33] border border-white/5 flex items-center justify-center mb-3 shadow-inner">
              <Lock className="w-7 h-7 text-[#adc6ff]" />
            </div>
            <p className="text-base font-semibold text-[#dae2fd] mb-1">
              End-to-End Ephemeral Sanctuary
            </p>
            <p className="text-xs text-[#c2c6d6] max-w-xs leading-relaxed">
              Messages and voice notes exchanged here are temporary and will never be permanently retained.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === role;
            const isEffectivelyBurned =
              msg.isBurned ||
              Boolean(msg.expiresAt && msg.expiresAt <= now) ||
              Boolean(
                msg.burnOnRead &&
                msg.viewedAt &&
                typeof msg.burnAfterSeconds === 'number' &&
                msg.burnAfterSeconds > 0 &&
                msg.viewedAt + msg.burnAfterSeconds * 1000 <= now
              ) ||
              Boolean(
                !msg.burnOnRead &&
                typeof msg.burnAfterSeconds === 'number' &&
                msg.burnAfterSeconds > 0 &&
                msg.createdAt + msg.burnAfterSeconds * 1000 <= now
              );

            const countdownStr = isEffectivelyBurned ? null : formatCountdown(msg);
            const isBurnOnReadLocked =
              msg.burnOnRead &&
              !isMe &&
              !isEffectivelyBurned &&
              !msg.viewedAt &&
              !revealedMessageIds.has(msg.id);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in group`}
              >
                {/* Burned Message Bubble */}
                {isEffectivelyBurned ? (
                  <div className="p-3 rounded-2xl bg-[#171f33] border border-white/5 flex items-center gap-2 text-xs text-[#8c909f] font-mono shadow-md">
                    <Flame className="w-4 h-4 text-[#ffb786] animate-pulse" />
                    <span>Message burned and wiped</span>
                  </div>
                ) : (
                  <>
                    {/* TEXT MESSAGE */}
                    {msg.type === 'TEXT' && (
                      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-[#222a3d] flex-shrink-0 flex items-center justify-center shadow-md text-[#c2c6d6]">
                            <User className="w-4 h-4" />
                          </div>
                        )}

                        {isBurnOnReadLocked ? (
                          <button
                            type="button"
                            onClick={() => handleRevealMessage(msg)}
                            className="p-3.5 rounded-2xl bg-gradient-to-r from-[#461f00]/60 to-[#171f33] border border-[#df7412]/50 hover:border-[#ffb786] text-left transition-all cursor-pointer group shadow-md"
                          >
                            <div className="flex items-center gap-2 text-[#ffb786] text-xs font-semibold mb-1">
                              <Lock className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              <span>Confidential Message</span>
                            </div>
                            <div className="text-[11px] text-[#c2c6d6] flex items-center gap-1.5">
                              <Eye className="w-3 h-3 text-[#ffb786]" />
                              <span>Tap to reveal & start self-destruct</span>
                            </div>
                          </button>
                        ) : (
                          <div
                            className={`p-4 shadow-md transition-transform active:scale-[0.98] ${
                              isMe
                                ? 'rounded-2xl rounded-tr-sm bg-[#adc6ff] text-[#002e6a] shadow-[0_8px_24px_rgba(173,198,255,0.15)]'
                                : 'rounded-2xl rounded-tl-sm bg-[#31394d] text-[#dae2fd]'
                            }`}
                          >
                            <p className="text-base leading-relaxed break-words font-normal">
                              {msg.textContent}
                            </p>

                            {/* Active Countdown for burning message */}
                            {countdownStr && (
                              <div
                                className={`flex items-center justify-end gap-1 mt-1.5 pt-1 border-t text-[10px] font-mono font-bold ${
                                  isMe
                                    ? 'border-[#002e6a]/20 text-[#002e6a]'
                                    : 'border-white/10 text-[#ffb786]'
                                }`}
                              >
                                <Flame className="w-3 h-3 animate-pulse" />
                                <span>{countdownStr}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* VOICE MESSAGE */}
                    {msg.type === 'VOICE' && (
                      <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-[#222a3d] flex-shrink-0 flex items-center justify-center shadow-md text-[#c2c6d6]">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <VoiceMessagePlayer
                            audioSrc={msg.mediaReference}
                            duration={msg.duration}
                            isMe={isMe}
                            burnOnRead={msg.burnOnRead}
                            deferAutoDownload={shouldDeferMediaDownload('voice', networkSettings) && !isMe}
                            onPlay={() => {
                              if (!isMe && msg.burnOnRead && onViewMessage) {
                                onViewMessage(msg.id);
                              }
                            }}
                          />
                          {countdownStr && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-[#ffb786] font-bold mt-1 px-1">
                              <Flame className="w-3 h-3 animate-pulse" />
                              <span>{countdownStr}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* IMAGE MESSAGE */}
                    {msg.type === 'IMAGE' && (
                      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-[#222a3d] flex-shrink-0 flex items-center justify-center shadow-md text-[#c2c6d6]">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(msg)}
                          className="p-2 rounded-2xl bg-[#171f33] border border-white/10 hover:border-[#adc6ff] transition-all cursor-pointer text-left shadow-md group"
                        >
                          <div className="relative rounded-xl overflow-hidden max-h-48 bg-black/40">
                            <img
                              src={msg.mediaReference}
                              alt="Ephemeral Media"
                              className="w-full h-auto object-cover blur-sm group-hover:blur-0 transition-all"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                              <span className="px-3 py-1.5 rounded-full bg-[#0b1326]/80 border border-white/10 text-xs font-mono text-[#dae2fd] flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-[#adc6ff]" />
                                <span>Tap to view photo</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {isOtherTyping && (
          <div className="flex justify-start mt-2">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-[#222a3d] flex-shrink-0 flex items-center justify-center shadow-md">
                <User className="w-4 h-4 text-[#c2c6d6]" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-[#31394d] px-4 py-3 shadow-md flex items-center gap-1.5 h-11">
                <div
                  className="w-2 h-2 rounded-full bg-[#c2c6d6] animate-[bounce_1.4s_infinite_ease-in-out_both]"
                  style={{ animationDelay: '-0.32s' }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-[#c2c6d6] animate-[bounce_1.4s_infinite_ease-in-out_both]"
                  style={{ animationDelay: '-0.16s' }}
                ></div>
                <div className="w-2 h-2 rounded-full bg-[#c2c6d6] animate-[bounce_1.4s_infinite_ease-in-out_both]"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden file input for photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* Quick Replies Bar */}
      <div className="px-4 pt-1">
        <QuickRepliesBar onSelectQuickReply={(reply) => setInputText(reply)} />
      </div>

      {/* Voice Recording Active HUD (Phase 4 Specification) */}
      {isRecording && (
        <div className="w-full px-3 sm:px-4 py-3 bg-[#131b2e] border-t border-[#adc6ff]/20 z-40 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
            {/* Top Control & Status Row */}
            <div className="flex items-center justify-between">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelRecording}
                className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#2d3449] hover:bg-[#93000a]/40 text-[#ffb4ab] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                title="Cancel Recording"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Status & Elapsed Timer */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#222a3d]/80 border border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ffb4ab]">Recording</span>
                <span className="font-mono text-sm font-bold text-white ml-1">
                  {formatDuration(recordingSeconds)}
                </span>
              </div>

              {/* Action Buttons: Finish / Preview and Direct Send */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="area-tap min-h-[48px] px-4 py-2.5 rounded-full bg-[#2d3449] hover:bg-[#3d465f] text-[#dae2fd] text-xs font-medium flex items-center gap-2 transition-all cursor-pointer active:scale-95 border border-white/10"
                  title="Finish & Preview"
                >
                  <Square className="w-4 h-4 fill-current text-[#adc6ff]" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={handleDirectSendRecording}
                  className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#adc6ff] hover:brightness-110 text-[#002e6a] flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md shadow-[#adc6ff]/20"
                  title="Send Immediately"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Center Live Waveform Visualizer */}
            <div className="w-full h-10 bg-[#0b1326]/60 rounded-xl px-4 flex items-center justify-center gap-1.5 border border-white/5 overflow-hidden">
              {liveWaveform.map((vol, idx) => (
                <div
                  key={idx}
                  className="w-1.5 rounded-full bg-[#adc6ff] transition-all duration-75"
                  style={{
                    height: `${Math.max(15, Math.min(100, vol * 100))}%`,
                    opacity: 0.4 + vol * 0.6,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voice Preview HUD (Phase 4 Specification) */}
      {voicePreviewData && !isRecording && (
        <div className="w-full px-3 sm:px-4 py-3 bg-[#131b2e] border-t border-[#adc6ff]/30 z-40 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Discard / Delete Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setVoicePreviewData(null);
              }}
              className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#2d3449] hover:bg-[#93000a]/40 text-[#ffb4ab] flex items-center justify-center flex-shrink-0 transition-all cursor-pointer active:scale-95"
              title="Delete Voice Note"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePreviewPlayback}
              className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#adc6ff] text-[#002e6a] flex items-center justify-center flex-shrink-0 hover:brightness-110 transition-all cursor-pointer active:scale-90 shadow-md"
              title={isPreviewPlaying ? 'Pause Preview' : 'Play Preview'}
            >
              {isPreviewPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Interactive Progress Scrubber & Duration */}
            <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
              <div
                className="w-full min-h-[32px] flex items-center cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  handleSeekPreview(percent);
                }}
              >
                <div className="w-full h-2.5 bg-[#2d3449] rounded-full relative flex items-center">
                  {/* Progress fill */}
                  <div
                    className="h-full bg-[#adc6ff] rounded-full"
                    style={{
                      width: `${
                        voicePreviewData.duration > 0
                          ? (previewCurrentTime / voicePreviewData.duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                  {/* Playhead Dot */}
                  <div
                    className="w-4 h-4 rounded-full bg-white shadow-md absolute -ml-2 transition-transform group-hover:scale-125"
                    style={{
                      left: `${
                        voicePreviewData.duration > 0
                          ? (previewCurrentTime / voicePreviewData.duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Timestamp Indicator */}
              <div className="flex items-center justify-between text-[11px] font-mono text-[#c2c6d6] px-0.5">
                <span>{formatDuration(Math.floor(previewCurrentTime))}</span>
                <span>{formatDuration(voicePreviewData.duration)}</span>
              </div>
            </div>

            {/* Send Voice Button */}
            <button
              type="button"
              onClick={handleSendVoice}
              className="area-tap min-h-[48px] px-5 py-2.5 rounded-full bg-[#adc6ff] text-[#002e6a] text-xs font-bold flex items-center gap-2 flex-shrink-0 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#adc6ff]/20 cursor-pointer"
              title="Send Voice Note"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      )}

      {/* Chat Composer Bar (Optimized for Mobile with Safe-Area & Virtual Keyboard) */}
      {!isRecording && !voicePreviewData && (
        <div className="w-full px-3 sm:px-4 pt-2 pb-safe bg-[#0b1326]/95 backdrop-blur-xl z-40 border-t border-white/5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSendText} className="flex items-end gap-2 max-w-4xl mx-auto mb-1">
            {/* Plus / Media Menu Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                fileInputRef.current?.click();
              }}
              id="chat-attach-btn"
              className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#222a3d] flex items-center justify-center flex-shrink-0 hover:bg-[#31394d] active:scale-95 transition-all text-[#dae2fd] shadow-sm cursor-pointer"
              title="Attach Ephemeral Photo"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Textarea Composer Container */}
            <div className="flex-1 bg-[#2d3449] rounded-3xl min-h-[48px] flex items-center px-3.5 sm:px-4 py-0.5 shadow-inner focus-within:ring-2 focus-within:ring-[#adc6ff]/50 transition-all">
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
                className="w-full bg-transparent text-[#dae2fd] text-base placeholder-[#c2c6d6] outline-none resize-none max-h-28 sm:max-h-32 py-2.5 leading-relaxed"
                style={{ minHeight: '44px' }}
              />

              {/* Mic button embedded in composer container as distinct inline flex item to prevent overlap */}
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
                  className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] -mr-2 my-auto rounded-full flex items-center justify-center flex-shrink-0 text-[#c2c6d6] hover:text-[#adc6ff] active:scale-90 transition-all cursor-pointer select-none"
                  title="Hold or Tap to Record Voice Note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              id="send-chat-btn"
              className="area-tap w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#adc6ff] flex items-center justify-center flex-shrink-0 hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-[#adc6ff]/20 text-[#002e6a] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              title="Send Message"
            >
              <Send className="w-5 h-5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/85 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-md bg-[#131b2e] border border-white/10 shadow-2xl p-6 text-[#dae2fd] rounded-3xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-[#df7412]/20 text-[#ffb786]">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#dae2fd]">Disappearing Messages Timer</h3>
                  <p className="text-xs text-[#c2c6d6] font-mono">Synchronized across both users</p>
                </div>
              </div>
              <button
                onClick={() => setShowTimerModal(false)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-[#c2c6d6] hover:text-[#dae2fd] hover:bg-[#222a3d] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {timerOptions.map((opt) => {
                const Icon = opt.icon;
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
                    className={`w-full min-h-[48px] flex items-center justify-between p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-[#adc6ff] bg-[#171f33] text-white shadow-md'
                        : 'border-white/5 bg-[#0b1326] text-[#c2c6d6] hover:border-white/20 hover:bg-[#171f33]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isSelected ? 'bg-[#adc6ff]/20 text-[#adc6ff]' : 'bg-[#222a3d] text-[#8c909f]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#dae2fd]">{opt.label}</div>
                        <div className="text-xs text-[#8c909f]">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#adc6ff]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Room Credentials Modal */}
      {showCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1326]/85 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-[#131b2e] border border-white/10 shadow-2xl p-6 text-[#dae2fd] rounded-3xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#adc6ff]" />
                <h3 className="text-base font-bold text-[#dae2fd]">Room Credentials</h3>
              </div>
              <button
                onClick={() => setShowCredsModal(false)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-[#c2c6d6] hover:text-[#dae2fd] hover:bg-[#222a3d] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[#0b1326] rounded-2xl border border-white/5">
                <div className="text-xs text-[#8c909f] mb-1 font-mono uppercase">Room Code</div>
                <div className="text-lg font-mono font-bold text-[#dae2fd]">{roomCode}</div>
              </div>

              {pin && (
                <div className="p-3 bg-[#0b1326] rounded-2xl border border-white/5">
                  <div className="text-xs text-[#8c909f] mb-1 font-mono uppercase">Access PIN</div>
                  <div className="text-xl font-mono font-bold text-[#adc6ff] tracking-widest">{pin}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
