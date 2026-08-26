import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  PlusCircle,
  LogIn,
  KeyRound,
  MessageSquare,
  Mic,
  Phone,
  Play,
  Pause,
  ArrowRight,
  Shield,
  EyeOff,
  Users,
  Link as LinkIcon,
  MicOff,
  PhoneOff,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { triggerHaptic } from '../utils/helpers';

interface LandingPageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenProfile?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenProfile,
}) => {
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);

  return (
    <div className="flex flex-col w-full px-4 sm:px-8 lg:px-12 pt-4 pb-24 sm:pb-16 gap-10 sm:gap-16 overflow-x-hidden relative bg-[#0b1326] text-[#dae2fd] font-sans selection:bg-[#4d8eff]/30 selection:text-white">
      {/* Ambient Background Orbs */}
      <div
        className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-[#4d8eff]/15 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-50 animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute top-[40%] left-[-150px] w-80 h-80 bg-[#bcc7de]/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen opacity-40 animate-pulse"
        style={{ animationDuration: '12s', animationDelay: '2s' }}
      />

      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 relative z-10 pt-1">
        {/* Hero Text */}
        <div className="flex-1 flex flex-col items-start gap-3 max-w-xl animate-fade-in-up">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-1 bg-[#171f33]/80 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#adc6ff] pulsate"></span>
            <span className="text-[11px] font-mono tracking-widest text-[#adc6ff] uppercase font-semibold">
              Private Communication
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#dae2fd] leading-[1.15]">
            Private. Two people.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#adc6ff] via-[#4d8eff] to-[#ffb786]">
              One Space.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-[#c2c6d6] max-w-md mt-1 leading-relaxed">
            Chat, send voice notes, and talk privately in a temporary encrypted space built exclusively for two.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-5 w-full sm:w-auto">
            <button
              onClick={() => {
                triggerHaptic('medium');
                onCreateRoom();
              }}
              id="hero-create-room-btn"
              className="w-full sm:w-auto min-h-[50px] flex items-center justify-center gap-2.5 bg-[#adc6ff] hover:bg-[#d8e2ff] text-[#002e6a] font-semibold text-base px-7 py-3.5 rounded-2xl transition-all duration-300 shadow-[0_4px_24px_rgba(173,198,255,0.25)] hover:shadow-[0_8px_32px_rgba(173,198,255,0.4)] active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 text-[#002e6a]" />
              <span>Create Private Room</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                onJoinRoom();
              }}
              id="hero-join-room-btn"
              className="w-full sm:w-auto min-h-[50px] flex items-center justify-center gap-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-semibold text-base px-7 py-3.5 rounded-2xl transition-all duration-300 border border-white/5 shadow-sm active:scale-95 group cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-[#bcc7de] group-hover:text-[#adc6ff] transition-colors" />
              <span>Join a Room</span>
            </button>
          </div>

          {/* Sub-label */}
          <p className="text-xs sm:text-sm text-[#8c909f] mt-2 flex items-center gap-2 font-mono">
            <Lock className="w-3.5 h-3.5 text-[#adc6ff]" />
            <span>No phone number. No username. Just a private room.</span>
          </p>
        </div>

        {/* Hero Visual / Abstract Node Visualization */}
        <div className="flex-1 w-full max-w-lg relative h-[360px] sm:h-[400px] flex items-center justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Glowing Connection Path SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 400 400"
          >
            <path
              className="text-[#2d3449]"
              d="M 100,300 Q 200,350 300,100"
              fill="none"
              stroke="currentColor"
              strokeDasharray="8 8"
              strokeWidth="2"
            />
            <path
              className="text-[#adc6ff]"
              d="M 100,300 Q 200,350 300,100"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            >
              <animate attributeName="strokeDasharray" dur="3s" repeatCount="indefinite" values="0, 1000; 1000, 0" />
              <animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0;1;0" />
            </path>
          </svg>

          {/* Node 1 (Bottom Left) */}
          <div className="absolute bottom-8 left-8 w-16 h-16 bg-[#222a3d] rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20 backdrop-blur-xl group hover:scale-105 transition-transform border border-[#adc6ff]/30">
            <span className="text-xl">👤</span>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ffb786] rounded-full shadow-[0_0_10px_rgba(255,183,134,0.6)] border-2 border-[#0b1326]"></div>
          </div>

          {/* Node 2 (Top Right) */}
          <div className="absolute top-8 right-8 w-16 h-16 bg-[#222a3d] rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20 backdrop-blur-xl group hover:scale-105 transition-transform border border-[#bcc7de]/30">
            <span className="text-xl">👤</span>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ffb786] rounded-full shadow-[0_0_10px_rgba(255,183,134,0.6)] border-2 border-[#0b1326]"></div>
          </div>

          {/* Floating Message 1 */}
          <div
            className="absolute top-[18%] left-[8%] bg-[#171f33]/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl rounded-bl-xs shadow-lg text-[#dae2fd] text-sm z-30 border border-white/5 hover:-translate-y-1 transition-transform animate-float"
            style={{ animationDelay: '0s' }}
          >
            Hey 👋
          </div>

          {/* Floating Message 2 */}
          <div
            className="absolute top-[38%] right-[4%] bg-[#adc6ff]/20 backdrop-blur-xl px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-lg border border-[#adc6ff]/20 text-[#adc6ff] text-sm z-30 hover:-translate-y-1 transition-transform animate-float"
            style={{ animationDelay: '1.5s' }}
          >
            Are you free?
          </div>

          {/* Floating Voice Message Player Mockup */}
          <div
            className="absolute bottom-[22%] left-[20%] bg-[#2d3449]/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl z-30 flex items-center gap-3 w-52 border border-white/10 hover:scale-105 transition-transform animate-float"
            style={{ animationDelay: '0.7s' }}
          >
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsPlayingDemo(!isPlayingDemo);
              }}
              className="w-8 h-8 rounded-full bg-[#adc6ff] text-[#002e6a] flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:bg-[#d8e2ff] transition-colors"
            >
              {isPlayingDemo ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-4 flex items-center gap-1 overflow-hidden">
                <div className={`w-1 bg-[#bcc7de] rounded-full h-2 ${isPlayingDemo ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 bg-[#bcc7de] rounded-full h-3 ${isPlayingDemo ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 bg-[#adc6ff] rounded-full h-4 ${isPlayingDemo ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 bg-[#adc6ff] rounded-full h-5 ${isPlayingDemo ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 bg-[#adc6ff] rounded-full h-3 ${isPlayingDemo ? 'animate-pulse' : ''}`}></div>
                <div className={`w-1 bg-[#bcc7de] rounded-full h-2 ${isPlayingDemo ? 'animate-pulse' : ''}`}></div>
                <div className="w-1 bg-[#bcc7de]/40 rounded-full h-1.5"></div>
                <div className="w-1 bg-[#bcc7de]/40 rounded-full h-2.5"></div>
                <div className="w-1 bg-[#bcc7de]/40 rounded-full h-1.5"></div>
              </div>
            </div>
            <span className="text-[10px] text-[#c2c6d6] font-mono">0:08</span>
          </div>

          {/* Connection Status Tag in center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0b1326]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-2 z-40">
            <div className="w-2 h-2 rounded-full bg-[#ffb786] pulsate"></div>
            <span className="text-[11px] font-mono text-[#dae2fd] tracking-wide">Connected · 02:31</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="pt-10 border-t border-white/5 relative">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#dae2fd]">How It Works</h2>
          <p className="text-sm text-[#c2c6d6] mt-2 max-w-md mx-auto">
            Three simple steps to secure, private communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-[#131b2e] p-7 rounded-3xl relative overflow-hidden group hover:bg-[#171f33] transition-colors border border-white/5 shadow-sm">
            <div className="absolute -right-2 -top-4 text-8xl font-black text-[#171f33] opacity-60 select-none group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              1
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-[#adc6ff]/10 rounded-2xl flex items-center justify-center mb-4 text-[#adc6ff]">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-[#dae2fd] mb-2">Create</h3>
              <p className="text-sm text-[#c2c6d6] leading-relaxed">
                Generate a secure, temporary private room with a single tap.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#131b2e] p-7 rounded-3xl relative overflow-hidden group hover:bg-[#171f33] transition-colors border border-white/5 shadow-sm">
            <div className="absolute -right-2 -top-4 text-8xl font-black text-[#171f33] opacity-60 select-none group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              2
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-[#bcc7de]/10 rounded-2xl flex items-center justify-center mb-4 text-[#bcc7de]">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-[#dae2fd] mb-2">Share</h3>
              <p className="text-sm text-[#c2c6d6] leading-relaxed">
                Share the unique room link and secure PIN with your contact.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#131b2e] p-7 rounded-3xl relative overflow-hidden group hover:bg-[#171f33] transition-colors border border-white/5 shadow-sm">
            <div className="absolute -right-2 -top-4 text-8xl font-black text-[#171f33] opacity-60 select-none group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              3
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-[#ffb786]/10 rounded-2xl flex items-center justify-center mb-4 text-[#ffb786]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-[#dae2fd] mb-2">Connect</h3>
              <p className="text-sm text-[#c2c6d6] leading-relaxed">
                Chat, send voice notes, and make encrypted audio calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features / Bento Grid */}
      <section className="pt-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#dae2fd] tracking-tight">
            Everything you need.
            <br />
            <span className="text-[#8c909f] font-medium">Nothing you don't.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[280px]">
          {/* Card 1: Private Chat */}
          <div className="bg-[#171f33] rounded-3xl p-6 flex flex-col justify-between group overflow-hidden relative shadow-md hover:shadow-xl transition-all duration-300 border border-white/5">
            <div className="relative z-10">
              <ShieldCheck className="w-8 h-8 text-[#adc6ff] mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold text-[#dae2fd]">Private Chat</h3>
              <p className="text-sm text-[#c2c6d6] mt-2 leading-relaxed">
                Ephemeral, end-to-end encrypted text messaging.
              </p>
            </div>
            {/* Minimal UI Mockup */}
            <div className="relative z-10 mt-4 flex flex-col gap-2 translate-y-3 group-hover:translate-y-0 transition-transform duration-500 font-mono text-xs">
              <div className="bg-[#2d3449] self-start px-3.5 py-2 rounded-2xl rounded-bl-xs text-[#c2c6d6] opacity-80">
                Secured with AES-256
              </div>
              <div className="bg-[#4d8eff]/20 self-end px-3.5 py-2 rounded-2xl rounded-tr-xs text-[#adc6ff] border border-[#4d8eff]/30">
                Read receipts off.
              </div>
            </div>
          </div>

          {/* Card 2: Voice Messages (Span 2 on lg) */}
          <div className="bg-[#171f33] rounded-3xl p-6 flex flex-col justify-between group overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.2)] md:col-span-1 lg:col-span-2 border border-[#bcc7de]/15 hover:border-[#adc6ff]/30 transition-colors">
            <div className="relative z-10 flex flex-col lg:flex-row gap-6 h-full justify-between items-center">
              <div className="flex-1 flex flex-col justify-center text-left">
                <Mic className="w-8 h-8 text-[#bcc7de] mb-3" />
                <h3 className="text-xl font-semibold text-[#dae2fd]">Voice Messages</h3>
                <p className="text-sm text-[#c2c6d6] mt-2 max-w-sm leading-relaxed">
                  When text isn't enough. Send crystal-clear voice notes that disappear when the room closes.
                </p>
              </div>

              {/* Large Waveform Visual */}
              <div className="flex items-center justify-center w-full lg:w-auto">
                <div className="w-full max-w-[260px] h-16 bg-[#222a3d] rounded-full flex items-center px-4 gap-3 backdrop-blur-sm border border-white/10 shadow-lg">
                  <div className="w-10 h-10 rounded-full bg-[#bcc7de] text-[#263143] flex items-center justify-center shrink-0">
                    <Pause className="w-5 h-5 fill-current" />
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
                    <div className="w-1.5 bg-[#bcc7de] rounded-full h-3 animate-pulse"></div>
                    <div className="w-1.5 bg-[#bcc7de] rounded-full h-7 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 bg-[#adc6ff] rounded-full h-9 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <div className="w-1.5 bg-[#adc6ff] rounded-full h-5 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 bg-[#2d3449] rounded-full h-3"></div>
                    <div className="w-1.5 bg-[#2d3449] rounded-full h-4"></div>
                    <div className="w-1.5 bg-[#2d3449] rounded-full h-2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Audio Calls (Span Full) */}
          <div className="bg-[#171f33] rounded-3xl p-6 sm:p-8 flex flex-col justify-between group overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.2)] md:col-span-2 lg:col-span-3 border border-[#ffb786]/20 hover:border-[#ffb786]/40 transition-colors">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 h-full justify-between">
              <div className="flex-1 md:pr-8 text-left">
                <Phone className="w-8 h-8 text-[#ffb786] mb-3" />
                <h3 className="text-xl font-semibold text-[#dae2fd]">Secure Audio Calls</h3>
                <p className="text-sm text-[#c2c6d6] mt-2 max-w-md leading-relaxed">
                  Peer-to-peer audio calling. High fidelity, low latency, zero tracking.
                </p>
              </div>

              {/* Call UI Mockup */}
              <div className="w-full max-w-xs bg-[#222a3d] rounded-2xl p-5 flex flex-col items-center justify-center gap-3 relative overflow-hidden border border-white/10 shadow-xl">
                <div className="w-14 h-14 bg-[#131b2e] rounded-full flex items-center justify-center z-10 shadow-lg border border-white/5">
                  <span className="text-2xl">🎙️</span>
                </div>
                <div className="text-center z-10">
                  <div className="font-semibold text-sm text-[#dae2fd]">Encrypted Call</div>
                  <div className="text-xs font-mono text-[#ffb786] mt-0.5">04:12</div>
                </div>
                <div className="flex gap-4 mt-1 z-10">
                  <div className="w-10 h-10 rounded-full bg-[#171f33] flex items-center justify-center text-[#c2c6d6]">
                    <MicOff className="w-4 h-4" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#ffb4ab] text-[#690005] flex items-center justify-center shadow-md">
                    <PhoneOff className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy / Identity Section */}
      <section className="bg-[#060e20] rounded-3xl p-6 sm:p-10 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#dae2fd] tracking-tight uppercase">
            NO PHONE NUMBER.
            <br />
            NO USERNAME.
            <br />
            <span className="text-[#8c909f]">NO PUBLIC PROFILE.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="bg-[#171f33] p-6 rounded-2xl flex flex-col items-center text-center border border-white/5">
            <LinkIcon className="w-7 h-7 text-[#adc6ff] mb-3" />
            <h4 className="font-semibold text-base text-[#dae2fd]">Private Link</h4>
            <p className="text-xs sm:text-sm text-[#c2c6d6] mt-2">
              Rooms are accessed via a unique, disposable URL.
            </p>
          </div>

          <div className="bg-[#171f33] p-6 rounded-2xl flex flex-col items-center text-center border border-white/5">
            <KeyRound className="w-7 h-7 text-[#bcc7de] mb-3" />
            <h4 className="font-semibold text-base text-[#dae2fd]">PIN Access</h4>
            <p className="text-xs sm:text-sm text-[#c2c6d6] mt-2">
              Share the 6-digit PIN out-of-band for dual-layer security.
            </p>
          </div>

          <div className="bg-[#171f33] p-6 rounded-2xl flex flex-col items-center text-center border border-white/5">
            <Users className="w-7 h-7 text-[#ffb786] mb-3" />
            <h4 className="font-semibold text-base text-[#dae2fd]">Strictly Two</h4>
            <p className="text-xs sm:text-sm text-[#c2c6d6] mt-2">
              Rooms hard-cap at two participants. No lurkers allowed.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="my-8 flex flex-col items-center text-center relative z-10 pb-6">
        <div className="w-64 h-64 bg-[#adc6ff]/10 rounded-full blur-[80px] pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#dae2fd] mb-4 relative z-10">
          Ready to disconnect from the noise?
        </h2>
        <button
          onClick={() => {
            triggerHaptic('heavy');
            onCreateRoom();
          }}
          className="flex items-center justify-center gap-2.5 bg-[#dae2fd] text-[#0b1326] hover:bg-[#d8e3fb] font-semibold text-base px-8 py-4 rounded-full transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:scale-95 relative z-10 cursor-pointer"
        >
          <span>Create your private room</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
