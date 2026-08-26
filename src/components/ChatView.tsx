import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Mic,
  Send,
  Trash2,
  Lock,
  Flame,
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Radio,
  Square,
  X,
  Play,
  Pause,
  AlertTriangle,
  Image as ImageIcon,
  KeyRound,
  Shield,
  Loader2,
  Hourglass,
  Zap,
  Eye,
  Sliders,
  Download,
  Signal,
} from 'lucide-react';
import type { MessageItem, MemberRole, RoomInfo, ViewMode } from '../types';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { DisappearingPhotoModal } from './DisappearingPhotoModal';
import { VoiceWaveformCanvas } from './VoiceWaveformCanvas';
import { LiveAudioVisualizer } from './LiveAudioVisualizer';
import { VoiceRecorder, SoundEffects } from '../utils/audio';
import { extractWaveformData } from '../utils/waveform';
import { formatTimeRemaining, formatMessageTime, formatDuration, copyToClipboard, triggerHaptic } from '../utils/helpers';
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
  const [messageTimerOverride, setMessageTimerOverride] = useState<number | null>(null);
  const [showMsgTimerMenu, setShowMsgTimerMenu] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [liveFreqData, setLiveFreqData] = useState<Uint8Array | null>(null);
  const [voicePreviewData, setVoicePreviewData] = useState<{
    blob: Blob;
    base64: string;
    duration: number;
  } | null>(null);
  const [previewWaveform, setPreviewWaveform] = useState<number[]>([]);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoViewMode, setPhotoViewMode] = useState<ViewMode>('view_once');
  const [showPhotoModeMenu, setShowPhotoModeMenu] = useState(false);

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

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (messageTimerOverride !== null) {
      if (messageTimerOverride === -1) {
        burnOnRead = true;
        burnAfterSeconds = 10;
      } else if (messageTimerOverride > 0) {
        burnAfterSeconds = messageTimerOverride;
      }
    }

    triggerHaptic('medium');
    SoundEffects.playMessageSent();
    await onSendMessage({
      type: 'TEXT',
      textContent: text,
      burnOnRead: messageTimerOverride === -1 ? true : burnOnRead,
      burnAfterSeconds,
    });
  };

  const handleSendQuickReply = async (replyText: string) => {
    const text = replyText.trim();
    if (!text) return;

    triggerHaptic('medium');
    onSendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let burnOnRead = false;
    let burnAfterSeconds: number | undefined = undefined;

    if (messageTimerOverride !== null) {
      if (messageTimerOverride === -1) {
        burnOnRead = true;
        burnAfterSeconds = 10;
      } else if (messageTimerOverride > 0) {
        burnAfterSeconds = messageTimerOverride;
      }
    }

    SoundEffects.playMessageSent();
    await onSendMessage({
      type: 'TEXT',
      textContent: text,
      burnOnRead: messageTimerOverride === -1 ? true : burnOnRead,
      burnAfterSeconds,
    });
  };

  // Voice recorder handlers
  const startRecording = async () => {
    try {
      const recorder = new VoiceRecorder();
      recorderRef.current = recorder;
      setVoicePreviewData(null);
      setRecordingSeconds(0);
      setLiveFreqData(null);

      await recorder.start((vol, freq) => {
        setVoiceVolume(vol);
        if (freq) setLiveFreqData(freq);
      });
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone permission required to record voice notes.');
    }
  };

  const stopAndPreviewRecording = async () => {
    if (!recorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      setVoicePreviewData(result);
      setPreviewProgress(0);

      // Extract waveform for preview
      extractWaveformData(result.base64, 30).then((peaks) => {
        setPreviewWaveform(peaks);
      });
    } catch (err) {
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setVoicePreviewData(null);
    setLiveFreqData(null);
    setPreviewProgress(0);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
  };

  const sendVoiceMessage = async () => {
    if (!voicePreviewData) return;
    SoundEffects.playMessageSent();

    let burnOnRead = false;
    let burnAfterSeconds: number | undefined = undefined;

    if (messageTimerOverride !== null) {
      if (messageTimerOverride === -1) {
        burnOnRead = true;
        burnAfterSeconds = 15; // 15s after listening
      } else if (messageTimerOverride > 0) {
        burnAfterSeconds = messageTimerOverride;
      }
    }

    await onSendMessage({
      type: 'VOICE',
      mediaReference: voicePreviewData.base64,
      duration: voicePreviewData.duration,
      burnOnRead: messageTimerOverride === -1 ? true : burnOnRead,
      burnAfterSeconds,
    });
    setVoicePreviewData(null);
    setPreviewProgress(0);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
  };

  const togglePreviewPlay = () => {
    if (!voicePreviewData) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(voicePreviewData.base64);
      previewAudioRef.current = audio;
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewProgress(audio.currentTime / audio.duration);
        }
      };
      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewProgress(0);
      };
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
    }
  };

  const handlePreviewSeek = (percent: number) => {
    if (previewAudioRef.current && previewAudioRef.current.duration) {
      previewAudioRef.current.currentTime = percent * previewAudioRef.current.duration;
      setPreviewProgress(percent);
    }
  };

  // Image Upload handler with client-side image downscaling
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      
      const img = new Image();
      img.onload = async () => {
        try {
          const maxDim = 1400;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            SoundEffects.playMessageSent();
            await onSendMessage({
              type: 'IMAGE',
              mediaReference: optimizedBase64,
              viewMode: photoViewMode,
              burnOnRead: true,
            });
            setShowPhotoModeMenu(false);
            return;
          }
        } catch {}

        SoundEffects.playMessageSent();
        await onSendMessage({
          type: 'IMAGE',
          mediaReference: rawBase64,
          viewMode: photoViewMode,
          burnOnRead: true,
        });
        setShowPhotoModeMenu(false);
      };
      img.onerror = async () => {
        SoundEffects.playMessageSent();
        await onSendMessage({
          type: 'IMAGE',
          mediaReference: rawBase64,
          viewMode: photoViewMode,
          burnOnRead: true,
        });
        setShowPhotoModeMenu(false);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle reveal of burn-on-read text message
  const handleRevealMessage = (msg: MessageItem) => {
    setRevealedMessageIds((prev) => new Set([...prev, msg.id]));
    if (onViewMessage) {
      onViewMessage(msg.id);
    }
  };

  const getExpirationBadge = (seconds?: number) => {
    const val = seconds !== undefined ? seconds : (roomInfo.defaultMessageExpiration ?? 0);
    if (val === 0) return { label: 'Room Expiry', short: 'Session', icon: Hourglass, color: 'text-zinc-400' };
    if (val === -1) return { label: 'Burn on Read', short: 'Burn on Read', icon: Flame, color: 'text-amber-400' };
    if (val === 10) return { label: '10s Expiry', short: '10s', icon: Zap, color: 'text-amber-400' };
    if (val === 30) return { label: '30s Expiry', short: '30s', icon: Zap, color: 'text-amber-400' };
    if (val === 60) return { label: '1m Expiry', short: '1m', icon: Zap, color: 'text-emerald-400' };
    if (val === 300) return { label: '5m Expiry', short: '5m', icon: Clock, color: 'text-emerald-400' };
    if (val === 3600) return { label: '1h Expiry', short: '1h', icon: Clock, color: 'text-sky-400' };
    if (val === 86400) return { label: '24h Expiry', short: '24h', icon: Clock, color: 'text-purple-400' };
    return { label: `${val}s Expiry`, short: `${val}s`, icon: Clock, color: 'text-zinc-400' };
  };

  const formatCountdown = (msg: MessageItem) => {
    if (msg.isBurned) return 'Burned';

    // If countdown started from viewedAt + burnAfterSeconds
    if (msg.burnOnRead && msg.viewedAt && typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0) {
      const remainingMs = (msg.viewedAt + msg.burnAfterSeconds * 1000) - now;
      if (remainingMs <= 0) return 'Burned';
      const sec = Math.ceil(remainingMs / 1000);
      return `${sec}s`;
    }

    // If fixed absolute expiresAt
    if (msg.expiresAt) {
      const diffMs = msg.expiresAt - now;
      if (diffMs <= 0) return 'Burned';
      const sec = Math.ceil(diffMs / 1000);
      if (sec < 60) return `${sec}s`;
      if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
      const hours = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      return `${hours}h ${mins}m`;
    }

    // Fallback: regular timer message without burnOnRead
    if (!msg.burnOnRead && typeof msg.burnAfterSeconds === 'number' && msg.burnAfterSeconds > 0) {
      const remainingMs = (msg.createdAt + msg.burnAfterSeconds * 1000) - now;
      if (remainingMs <= 0) return 'Burned';
      const sec = Math.ceil(remainingMs / 1000);
      if (sec < 60) return `${sec}s`;
      if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
      const hours = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      return `${hours}h ${mins}m`;
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full bg-white dark:bg-zinc-950 border-x border-zinc-200 dark:border-zinc-800 shadow-sm relative">
      {/* Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/95 dark:bg-zinc-900/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold text-sm">
              {role === 'owner' ? 'OP' : 'GP'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                otherUserOnline ? 'bg-emerald-500' : 'bg-zinc-400'
              }`}
            />
          </div>

          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{role === 'owner' ? 'Room Owner' : 'Room Guest'}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                #{roomCode}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  otherUserOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
              {otherUserOnline
                ? `${role === 'owner' ? 'Guest' : 'Owner'} is online`
                : 'Waiting for peer...'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Configurable Message Expiration Pill / Trigger */}
          <button
            type="button"
            onClick={() => setShowTimerModal(true)}
            id="room-timer-settings-btn"
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 transition-all cursor-pointer shadow-xs"
            title="Configure Disappearing Messages Timer"
          >
            <RoomExpIcon className={`w-3.5 h-3.5 ${roomExpirationBadge.color}`} />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 hidden sm:inline">
              {roomExpirationBadge.label}
            </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 sm:hidden">
              {roomExpirationBadge.short}
            </span>
          </button>

          {/* Room Lifetime countdown */}
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 px-2 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>{formatTimeRemaining(roomInfo.expiresAt)} left</span>
          </div>

          {/* Start Audio Call button */}
          <button
            onClick={onStartCall}
            id="start-call-btn"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Start Live Audio Call"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audio Call</span>
          </button>

          {/* More Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              id="room-menu-btn"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-12 w-60 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1.5 z-30 animate-scale-up">
                <button
                  onClick={() => {
                    setShowTimerModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-xs text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Disappearing Messages Timer</span>
                </button>

                {onOpenSettings && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full px-4 py-2.5 text-xs text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <div className="flex items-center justify-between flex-1">
                      <span>Connection & Low Data Mode</span>
                      {isLowDataActive(networkSettings) && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
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
                  className="w-full px-4 py-2.5 text-xs text-left font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-zinc-400" />
                  <span>Room Credentials & PIN</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Clear all conversation messages for both users?')) {
                      onClearConversation();
                    }
                  }}
                  className="w-full px-4 py-2.5 text-xs text-left font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Conversation (Both)</span>
                </button>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('Close and wipe this private room permanently?')) {
                      onCloseRoom();
                    }
                  }}
                  className="w-full px-4 py-2.5 text-xs text-left font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Close & Burn Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 px-4 py-16">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 shadow-inner">
              <Lock className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              End-to-End Ephemeral Space
            </p>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Messages and voice notes sent here are temporary and will never be permanently stored.
            </p>
            <div className="mt-4 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <RoomExpIcon className={`w-3.5 h-3.5 ${roomExpirationBadge.color}`} />
              <span>Disappearing mode: <strong>{roomExpirationBadge.label}</strong></span>
            </div>
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
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1 px-1 font-mono">
                  <span>{isMe ? 'You' : msg.senderRole === 'owner' ? 'Owner' : 'Guest'}</span>
                  {msg.burnOnRead && (
                    <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" />
                      <span>Burn-on-Read</span>
                    </span>
                  )}
                  {msg.burnAfterSeconds && !msg.burnOnRead && (
                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{msg.burnAfterSeconds >= 3600 ? `${msg.burnAfterSeconds / 3600}h` : `${msg.burnAfterSeconds}s`}</span>
                    </span>
                  )}
                </div>

                {/* Burned Message Pill */}
                {isEffectivelyBurned ? (
                  <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-xs text-zinc-500 font-mono shadow-xs">
                    <Flame className="w-4 h-4 text-amber-500/80 animate-pulse" />
                    <span>Message burned and erased</span>
                  </div>
                ) : (
                  <>
                    {/* TEXT MESSAGE */}
                    {msg.type === 'TEXT' && (
                      <div>
                        {isBurnOnReadLocked ? (
                          <button
                            type="button"
                            onClick={() => handleRevealMessage(msg)}
                            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-zinc-900 border border-amber-800/60 hover:border-amber-500 text-left transition-all cursor-pointer group shadow-md"
                          >
                            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                              <Lock className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              <span>Confidential Message</span>
                            </div>
                            <div className="text-[11px] text-zinc-300 font-light flex items-center gap-1.5">
                              <Eye className="w-3 h-3 text-amber-400" />
                              <span>Tap to reveal & start self-destruct timer</span>
                            </div>
                          </button>
                        ) : (
                          <div className="relative group">
                            <div
                              className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-md text-sm leading-relaxed break-words shadow-sm ${
                                isMe
                                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-tr-xs'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-xs'
                              } ${msg.burnOnRead ? 'border border-amber-500/40' : ''}`}
                            >
                              {msg.textContent}

                              {/* Active Countdown Bar / Badge for burning message */}
                              {countdownStr && (
                                <div className={`flex items-center justify-end gap-1 mt-1.5 pt-1 border-t text-[10px] font-mono font-bold ${
                                  isMe
                                    ? 'border-zinc-800 dark:border-zinc-200 text-amber-400 dark:text-amber-600'
                                    : 'border-zinc-200 dark:border-zinc-700 text-amber-500'
                                }`}>
                                  <Flame className="w-3 h-3 animate-pulse" />
                                  <span>{countdownStr}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* VOICE MESSAGE */}
                    {msg.type === 'VOICE' && (
                      <div className="relative">
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
                          <div className="absolute -bottom-5 right-1 flex items-center gap-1 text-[10px] font-mono text-amber-500 font-bold">
                            <Flame className="w-3 h-3 animate-pulse" />
                            <span>{countdownStr}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* IMAGE MESSAGE */}
                    {msg.type === 'IMAGE' && (
                      <div>
                        <button
                          onClick={() => setSelectedPhoto(msg)}
                          className={`p-3 rounded-2xl text-white border transition-all flex items-center gap-3 cursor-pointer shadow-md group text-left ${
                            shouldDeferMediaDownload('image', networkSettings) && !isMe
                              ? 'bg-zinc-950 border-amber-800/60 hover:border-amber-500'
                              : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/60'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                            shouldDeferMediaDownload('image', networkSettings) && !isMe
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                              : 'bg-zinc-800 text-amber-400'
                          }`}>
                            {shouldDeferMediaDownload('image', networkSettings) && !isMe ? (
                              <Download className="w-5 h-5 animate-pulse" />
                            ) : (
                              <Flame className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                              <span>Disappearing Photo</span>
                              {countdownStr && (
                                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                                  {countdownStr}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                              {shouldDeferMediaDownload('image', networkSettings) && !isMe ? (
                                <span className="text-amber-400 font-semibold">
                                  Low Data • Tap to Download (~15 kB)
                                </span>
                              ) : (
                                <span>
                                  {msg.viewMode === 'timed_5'
                                    ? '5s timer'
                                    : msg.viewMode === 'timed_10'
                                    ? '10s timer'
                                    : msg.viewMode === 'timed_30'
                                    ? '30s timer'
                                    : 'Tap to view once'}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Timestamp & Delivery status */}
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 px-1 font-mono select-none">
                  <span title={new Date(msg.createdAt).toLocaleString()}>{formatMessageTime(msg.createdAt)}</span>
                  {isMe && (
                    <span>
                      {msg.delivered ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500 inline ml-0.5" title="Delivered" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-zinc-400 inline ml-0.5" title="Sent" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Real-time typing indicator */}
        {isOtherTyping && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 pl-2 animate-pulse">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <span className="text-[11px]">Peer is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recorder Overlay / Controls */}
      {isRecording && (
        <div className="p-3 bg-[#1A1111] border-t border-red-900/60 flex items-center justify-between gap-3 animate-fade-in text-[#F0F0F0]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping flex-shrink-0" />
            <span className="text-xs font-mono font-medium text-red-400 flex-shrink-0">
              REC: {formatDuration(recordingSeconds)}
            </span>
            <div className="flex-1 max-w-xs h-6 px-2">
              <LiveAudioVisualizer
                freqData={liveFreqData}
                volume={voiceVolume}
                barCount={28}
                height={22}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 font-mono">
            <button
              onClick={cancelRecording}
              className="px-3 py-1.5 border border-[#333] hover:border-[#555] bg-[#141414] text-[11px] uppercase tracking-wider text-[#999] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={stopAndPreviewRecording}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Preview Overlay (Before Send) */}
      {voicePreviewData && (
        <div className="p-3 bg-[#141414] border-t border-[#2A2A2A] flex items-center justify-between gap-4 animate-fade-in text-[#F0F0F0]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={togglePreviewPlay}
              className="w-8 h-8 bg-white text-black hover:bg-[#D1D1D1] flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
              title={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPreviewPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1 max-w-md min-w-0">
              <VoiceWaveformCanvas
                waveform={previewWaveform}
                progress={previewProgress}
                isPlaying={isPreviewPlaying}
                isMe={false}
                onSeek={handlePreviewSeek}
                height={26}
              />
            </div>

            <span className="text-[11px] font-mono text-[#888] flex-shrink-0 hidden sm:inline">
              {formatDuration(voicePreviewData.duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 font-mono">
            <button
              onClick={cancelRecording}
              className="p-2 border border-[#2A2A2A] hover:border-[#444] text-[#888] hover:text-white transition-colors cursor-pointer"
              title="Discard"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={sendVoiceMessage}
              className="px-4 py-2 bg-white text-black hover:bg-[#D1D1D1] text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* Composer Input Bar */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative">
        {/* Configurable Quick Replies Row */}
        <QuickRepliesBar
          onSendQuickReply={handleSendQuickReply}
          disabled={isRecording}
        />

        <div className="p-3 sm:p-4">
          <form onSubmit={handleSendText} className="flex items-center gap-2">
          {/* Photo attachment with view mode selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPhotoModeMenu(!showPhotoModeMenu)}
              id="attach-photo-btn"
              className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Attach Disappearing Photo"
            >
              <Flame className="w-5 h-5 text-amber-500" />
            </button>

            {/* Photo mode popup */}
            {showPhotoModeMenu && (
              <div className="absolute bottom-12 left-0 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2 z-30 space-y-1 animate-scale-up">
                <div className="text-[10px] uppercase font-bold text-zinc-400 px-2.5 py-1 font-mono">
                  Disappearing Photo Mode
                </div>
                {(
                  [
                    { mode: 'view_once', label: '👁️ View Once (Immediate Burn)' },
                    { mode: 'timed_5', label: '⏱️ 5s Auto-Destruct' },
                    { mode: 'timed_10', label: '⏳ 10s Auto-Destruct' },
                    { mode: 'timed_30', label: '⏳ 30s Auto-Destruct' },
                  ] as { mode: ViewMode; label: string }[]
                ).map(({ mode, label }) => (
                  <label
                    key={mode}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <span>{label}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        setPhotoViewMode(mode);
                        handlePhotoUpload(e);
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Per-message custom expiration quick toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMsgTimerMenu(!showMsgTimerMenu)}
              id="message-timer-selector-btn"
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                messageTimerOverride !== null
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={
                messageTimerOverride === null
                  ? 'Custom Expiration for this message'
                  : `Custom Timer: ${getExpirationBadge(messageTimerOverride).label}`
              }
            >
              <Clock className="w-5 h-5" />
            </button>

            {/* Message timer popup menu */}
            {showMsgTimerMenu && (
              <div className="absolute bottom-12 left-0 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2 z-30 space-y-1 animate-scale-up">
                <div className="text-[10px] uppercase font-bold text-zinc-400 px-2.5 py-1 font-mono">
                  Message Expiration Override
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMessageTimerOverride(null);
                    setShowMsgTimerMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    messageTimerOverride === null
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Hourglass className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Use Room Default ({roomExpirationBadge.label})</span>
                  </span>
                  {messageTimerOverride === null && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </button>

                {timerOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = messageTimerOverride === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setMessageTimerOverride(opt.value);
                        setShowMsgTimerMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-amber-500" />
                        <span>{opt.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              messageTimerOverride === -1
                ? 'Type burn-on-read message...'
                : messageTimerOverride
                ? `Type message (${getExpirationBadge(messageTimerOverride).label})...`
                : 'Type a private message...'
            }
            id="chat-text-input"
            className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* Voice Record trigger */}
          {!inputText.trim() && !isRecording && (
            <button
              type="button"
              onClick={startRecording}
              id="start-voice-record-btn"
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Record Voice Message"
            >
              <Mic className="w-5 h-5 text-emerald-500" />
            </button>
          )}

          {/* Send Button */}
          {inputText.trim() && (
            <button
              type="submit"
              id="send-message-btn"
              className="p-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white/90 active:scale-95 shadow-sm transition-all cursor-pointer"
              title="Send Message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </form>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-md bg-[#141414] border border-[#2A2A2A] shadow-2xl p-6 text-[#F0F0F0] rounded-3xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Disappearing Messages Timer</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Synchronized across both users in real-time</p>
                </div>
              </div>
              <button
                onClick={() => setShowTimerModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 my-5">
              {timerOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = (roomInfo.defaultMessageExpiration ?? 0) === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={async () => {
                      if (onUpdateRoomTimer) {
                        await onUpdateRoomTimer(opt.value);
                      }
                      setShowTimerModal(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-sm'
                        : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{opt.label}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{opt.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 mr-2" />}
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                New messages will automatically inherit this expiration timer unless explicitly overridden in the message composer.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Room Credentials Modal */}
      {showCredsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Room Credentials
              </h3>
              <button
                onClick={() => setShowCredsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-400 text-[10px] mb-1 uppercase font-bold">Room Code</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{roomCode}</div>
              </div>

              {pin && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-400 text-[10px] mb-1 uppercase font-bold">Access PIN</div>
                  <div className="text-xl font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                    {pin}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCredsModal(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
