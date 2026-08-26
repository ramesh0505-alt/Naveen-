/**
 * WebRTC Peer-to-Peer Audio Calling Manager
 */
import type { CallSignalPayload } from '../types';
import { getMicrophoneStream, getAudioContext, unlockAudioContext } from './audio';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCCallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private fallbackAudioElement: HTMLAudioElement | null = null;
  private sendSignalCallback: (payload: CallSignalPayload) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private onRemoteAudioLevels?: (level: number) => void;
  private onLocalAudioLevels?: (level: number) => void;
  private onError?: (error: Error) => void;
  private analyserAnimId: number | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isMuted: boolean = false;

  constructor(sendSignal: (payload: CallSignalPayload) => void) {
    this.sendSignalCallback = sendSignal;

    // Create a persistent hidden audio element in document if available
    if (typeof document !== 'undefined') {
      try {
        let el = document.getElementById('webrtc-remote-audio') as HTMLAudioElement;
        if (!el) {
          el = document.createElement('audio');
          el.id = 'webrtc-remote-audio';
          el.autoplay = true;
          (el as any).playsInline = true;
          (el as any).webkitPlaysInline = true;
          el.muted = false;
          el.volume = 1.0;
          el.style.position = 'fixed';
          el.style.top = '-9999px';
          el.style.left = '-9999px';
          el.style.width = '1px';
          el.style.height = '1px';
          el.style.opacity = '0.01';
          el.style.pointerEvents = 'none';
          document.body.appendChild(el);
        }
        this.fallbackAudioElement = el;
        this.remoteAudioElement = el;
      } catch (e) {
        console.warn('Could not initialize fallback audio element:', e);
      }
    }
  }

  setCallbacks(callbacks: {
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onRemoteAudioLevels?: (level: number) => void;
    onLocalAudioLevels?: (level: number) => void;
    onError?: (error: Error) => void;
  }) {
    this.onConnectionStateChange = callbacks.onConnectionStateChange;
    this.onRemoteAudioLevels = callbacks.onRemoteAudioLevels;
    this.onLocalAudioLevels = callbacks.onLocalAudioLevels;
    this.onError = callbacks.onError;
  }

  attachRemoteAudioElement(el: HTMLAudioElement | null) {
    if (el) {
      this.remoteAudioElement = el;
      el.autoplay = true;
      (el as any).playsInline = true;
      (el as any).webkitPlaysInline = true;
      el.muted = false;
      el.volume = 1.0;
      if (this.remoteStream) {
        this.playStreamOnElement(el, this.remoteStream);
      }
    } else if (this.fallbackAudioElement) {
      this.remoteAudioElement = this.fallbackAudioElement;
    }
  }

  async acquireLocalAudio(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active && this.localStream.getAudioTracks().length > 0) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !this.isMuted;
      });
      return this.localStream;
    }
    unlockAudioContext();
    try {
      this.localStream = await getMicrophoneStream();
      this.setupAudioAnalysis();
      return this.localStream;
    } catch (err: any) {
      if (this.onError) {
        this.onError(err);
      }
      throw err;
    }
  }

  private playStreamOnElement(audioEl: HTMLAudioElement, stream: MediaStream) {
    try {
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
      }
      audioEl.muted = false;
      audioEl.volume = 1.0;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn('[WebRTC] Autoplay waiting for user gesture:', e);
          const resumeAudio = () => {
            unlockAudioContext();
            audioEl.play().catch(() => {});
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
          };
          document.addEventListener('click', resumeAudio, { once: true });
          document.addEventListener('touchstart', resumeAudio, { once: true });
        });
      }
    } catch (err) {
      console.error('[WebRTC] Error playing audio stream:', err);
    }
  }

  private playRemoteAudio() {
    unlockAudioContext();
    if (this.remoteStream) {
      if (this.remoteAudioElement) {
        this.playStreamOnElement(this.remoteAudioElement, this.remoteStream);
      }
      if (this.fallbackAudioElement && this.fallbackAudioElement !== this.remoteAudioElement) {
        this.playStreamOnElement(this.fallbackAudioElement, this.remoteStream);
      }
    }
  }

  private createPeerConnection(roomCode: string, senderRole: 'owner' | 'guest'): RTCPeerConnection {
    this.cleanupPeerConnection();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnection = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalCallback({
          type: 'call:ice_candidate',
          roomCode,
          senderRole,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind, event.streams);

      let stream: MediaStream;
      if (event.streams && event.streams.length > 0 && event.streams[0]) {
        stream = event.streams[0];
      } else {
        stream = new MediaStream([event.track]);
      }

      this.remoteStream = stream;

      // Ensure track is enabled
      event.track.enabled = true;

      event.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted, playing audio...');
        this.playRemoteAudio();
      };

      this.playRemoteAudio();
      this.setupRemoteAudioAnalysis();
    };

    pc.onconnectionstatechange = () => {
      if (pc) {
        console.log('[WebRTC] Connection state changed:', pc.connectionState);
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(pc.connectionState);
        }
        if (pc.connectionState === 'connected') {
          this.playRemoteAudio();
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc) {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          this.playRemoteAudio();
        } else if (pc.iceConnectionState === 'failed') {
          try {
            pc.restartIce();
          } catch {}
        } else if (pc.iceConnectionState === 'disconnected') {
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange('disconnected');
          }
        }
      }
    };

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
        try {
          pc.addTrack(track, this.localStream!);
        } catch (e) {
          console.warn('[WebRTC] addTrack error:', e);
        }
      });
    }

    return pc;
  }

  async startCall(roomCode: string, senderRole: 'owner' | 'guest'): Promise<void> {
    await this.acquireLocalAudio();
    const pc = this.createPeerConnection(roomCode, senderRole);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);

    this.sendSignalCallback({
      type: 'call:offer',
      roomCode,
      senderRole,
      sdp: offer,
    });
  }

  async handleOffer(roomCode: string, senderRole: 'owner' | 'guest', sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.acquireLocalAudio();
    const pc = this.createPeerConnection(roomCode, senderRole);

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    await this.flushPendingCandidates();

    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(answer);

    this.sendSignalCallback({
      type: 'call:answer',
      roomCode,
      senderRole,
      sdp: answer,
    });
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.flushPendingCandidates();
      this.playRemoteAudio();
    }
  }

  async handleIceCandidate(candidateInit: RTCIceCandidateInit | null): Promise<void> {
    if (!candidateInit || !candidateInit.candidate) return;
    if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (e) {
        console.warn('[WebRTC] addIceCandidate error:', e);
      }
    } else {
      this.pendingCandidates.push(candidateInit);
    }
  }

  private async flushPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[WebRTC] flush candidate error:', e);
        }
      }
    }
  }

  setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    return muted;
  }

  setSpeakerphone(enabled: boolean): void {
    const applySink = (el: HTMLAudioElement | null) => {
      if (el && typeof (el as any).setSinkId === 'function') {
        (el as any).setSinkId(enabled ? 'default' : 'communications').catch(() => {});
      }
    };
    applySink(this.remoteAudioElement);
    applySink(this.fallbackAudioElement);
  }

  private setupAudioAnalysis() {
    if (!this.localStream) return;
    try {
      this.audioContext = getAudioContext();

      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 64;
      source.connect(this.localAnalyser);

      const localBuffer = new Uint8Array(this.localAnalyser.frequencyBinCount);
      let remoteBuffer = new Uint8Array(32);

      const checkLevels = () => {
        if (this.localAnalyser && this.onLocalAudioLevels) {
          this.localAnalyser.getByteFrequencyData(localBuffer);
          let sum = 0;
          for (let i = 0; i < localBuffer.length; i++) sum += localBuffer[i];
          this.onLocalAudioLevels(sum / localBuffer.length / 255);
        }
        if (this.remoteAnalyser && this.onRemoteAudioLevels) {
          if (remoteBuffer.length !== this.remoteAnalyser.frequencyBinCount) {
            remoteBuffer = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
          }
          this.remoteAnalyser.getByteFrequencyData(remoteBuffer);
          let sum = 0;
          for (let i = 0; i < remoteBuffer.length; i++) sum += remoteBuffer[i];
          this.onRemoteAudioLevels(sum / remoteBuffer.length / 255);
        }
        this.analyserAnimId = requestAnimationFrame(checkLevels);
      };

      if (!this.analyserAnimId) {
        this.analyserAnimId = requestAnimationFrame(checkLevels);
      }
    } catch (e) {
      console.warn('Audio analysis setup warning:', e);
    }
  }

  private setupRemoteAudioAnalysis() {
    if (!this.remoteStream) return;
    try {
      this.audioContext = getAudioContext();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const source = this.audioContext.createMediaStreamSource(this.remoteStream);
      this.remoteAnalyser = this.audioContext.createAnalyser();
      this.remoteAnalyser.fftSize = 64;
      source.connect(this.remoteAnalyser);
    } catch (e) {
      console.warn('Remote audio analysis warning:', e);
    }
  }

  cleanup(): void {
    this.cleanupPeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.remoteAudioElement) {
      try {
        this.remoteAudioElement.srcObject = null;
      } catch {}
    }

    if (this.fallbackAudioElement) {
      try {
        this.fallbackAudioElement.srcObject = null;
      } catch {}
    }

    if (this.analyserAnimId) {
      cancelAnimationFrame(this.analyserAnimId);
      this.analyserAnimId = null;
    }

    this.localAnalyser = null;
    this.remoteAnalyser = null;
    this.pendingCandidates = [];
    this.isMuted = false;
  }

  private cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
  }
}
