import React from 'react';
import { ArrowRight, KeyRound, Shield, Mic, PhoneCall, MessageSquare } from 'lucide-react';

interface LandingPageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom }) => {
  return (
    <div className="w-full bg-[#0C0C0C] text-[#F0F0F0] font-sans">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24 border-b border-[#2A2A2A]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Hero Column */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#888] font-mono">
                  Architecture 01 • Ephemeral Protocol
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              </div>

              <h2 className="text-5xl sm:text-7xl lg:text-[88px] leading-[0.92] font-serif italic tracking-tight text-white mb-8">
                Private.<br />
                <span className="not-italic font-sans font-light tracking-tighter text-[#888]">Two People. </span>
                <br />
                <span className="not-italic font-sans font-bold tracking-tighter text-white">One Space.</span>
              </h2>

              <p className="text-lg sm:text-xl text-[#888] max-w-xl leading-relaxed font-light mb-10">
                Direct browser-to-browser encrypted communication. Real-time text, temporary voice notes, and live WebRTC audio calling with zero persistent data.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-lg mb-12">
              <button
                onClick={onCreateRoom}
                id="hero-create-room-btn"
                className="bg-white text-black py-4 px-8 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-[#D1D1D1] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
              >
                <span>Initialize Room</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onJoinRoom}
                id="hero-join-room-btn"
                className="border border-[#444] text-[#F0F0F0] py-4 px-8 text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2.5 cursor-pointer bg-[#0C0C0C]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Enter Room PIN</span>
              </button>
            </div>

            {/* Editorial Index Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#2A2A2A]">
              <div className="flex flex-col">
                <span className="text-3xl sm:text-[38px] font-light leading-none tracking-tight text-white font-mono">002</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#666] mt-2">Max Capacity</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-[38px] font-light leading-none tracking-tight text-white font-mono">0.00s</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#666] mt-2">Data Retention</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-[38px] font-light leading-none tracking-tight text-white font-mono">100%</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#666] mt-2">P2P Ephemeral</span>
              </div>
            </div>
          </div>

          {/* Side Editorial Panel */}
          <div className="lg:col-span-4 lg:border-l lg:border-[#2A2A2A] lg:pl-10 flex flex-col justify-between space-y-8">
            {/* Input Stream Box */}
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.3em] text-[#888] mb-4 font-mono">
                System Guarantee
              </h3>
              <div className="bg-[#161616] p-6 border border-[#2A2A2A]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-[#777] font-mono italic">Zero_Trace_Manifest.v1</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <div className="space-y-2.5 mb-5">
                  <div className="h-1 w-full bg-[#2A2A2A]"></div>
                  <div className="h-1 w-4/5 bg-[#2A2A2A]"></div>
                  <div className="h-1 w-3/5 bg-[#2A2A2A]"></div>
                </div>
                <p className="text-xs text-[#999] leading-relaxed font-mono">
                  No accounts. No phone numbers. Memory-only routing with self-destruct upon room closure.
                </p>
              </div>
            </div>

            {/* Key Deliverables / Workflow */}
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.3em] text-[#888] mb-4 font-mono">
                Core Protocol
              </h3>
              <ul className="space-y-3.5 text-xs text-[#CCC] font-mono">
                <li className="flex justify-between items-center py-1.5 border-b border-[#1E1E1E]">
                  <span>8-Char Cryptographic Code</span>
                  <span className="text-[#666]">01</span>
                </li>
                <li className="flex justify-between items-center py-1.5 border-b border-[#1E1E1E]">
                  <span>6-Digit Salted Access PIN</span>
                  <span className="text-[#666]">02</span>
                </li>
                <li className="flex justify-between items-center py-1.5 border-b border-[#1E1E1E]">
                  <span>Browser Opus Voice Notes</span>
                  <span className="text-[#666]">03</span>
                </li>
                <li className="flex justify-between items-center py-1.5 border-b border-[#1E1E1E]">
                  <span>WebRTC Direct Mesh Audio</span>
                  <span className="text-[#666]">04</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#121212] p-4 border border-[#222]">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#777] mb-1 font-mono">
                Access Constraint
              </div>
              <div className="text-xs text-[#AAA]">
                Rooms are locked permanently once two participants connect.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-20 border-b border-[#2A2A2A]">
        <div className="flex flex-col sm:flex-row justify-between items-baseline mb-12 pb-4 border-b border-[#1E1E1E]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#888] font-mono">Methodology</span>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mt-1">
              Operational <span className="font-serif italic text-[#CCC]">Sequence</span>
            </h2>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-[#666] font-mono mt-2 sm:mt-0">
            Three Steps • Instant Termination
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#121212] p-8 border border-[#2A2A2A] relative group hover:border-[#444] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#888] border border-[#2A2A2A] px-2 py-0.5">
                Phase 01
              </span>
              <span className="text-xs font-mono text-[#555]">CREATE</span>
            </div>
            <h3 className="text-base font-medium text-white mb-3">
              Generate Private Room
            </h3>
            <p className="text-xs text-[#888] leading-relaxed font-light">
              Provision a clean, encrypted space with an 8-character unique room code and a 6-digit access PIN.
            </p>
          </div>

          <div className="bg-[#121212] p-8 border border-[#2A2A2A] relative group hover:border-[#444] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#888] border border-[#2A2A2A] px-2 py-0.5">
                Phase 02
              </span>
              <span className="text-xs font-mono text-[#555]">SHARE</span>
            </div>
            <h3 className="text-base font-medium text-white mb-3">
              Transmit Code & PIN
            </h3>
            <p className="text-xs text-[#888] leading-relaxed font-light">
              Share the one-time link and PIN with exactly one person. Third-party join attempts are strictly rejected.
            </p>
          </div>

          <div className="bg-[#121212] p-8 border border-[#2A2A2A] relative group hover:border-[#444] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#888] border border-[#2A2A2A] px-2 py-0.5">
                Phase 03
              </span>
              <span className="text-xs font-mono text-[#555]">COMMUNICATE</span>
            </div>
            <h3 className="text-base font-medium text-white mb-3">
              Connect & Self-Destruct
            </h3>
            <p className="text-xs text-[#888] leading-relaxed font-light">
              Chat in real time, send voice notes, or speak live. Trigger instant conversation burn or close room at will.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-20 border-b border-[#2A2A2A]">
        <div className="flex flex-col sm:flex-row justify-between items-baseline mb-12 pb-4 border-b border-[#1E1E1E]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#888] font-mono">Capabilities</span>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white mt-1">
              Communication <span className="font-serif italic text-[#CCC]">Mechanisms</span>
            </h2>
          </div>
          <span className="text-[11px] uppercase tracking-widest text-[#666] font-mono mt-2 sm:mt-0">
            Encrypted Media Suite
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#141414] p-8 border border-[#2A2A2A] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <MessageSquare className="w-5 h-5 text-white" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">01 / CHAT</span>
              </div>
              <h3 className="text-lg font-light text-white mb-2">
                Real-Time Messaging
              </h3>
              <p className="text-xs text-[#888] leading-relaxed mb-6 font-light">
                WebSocket synchronized text with typing indicators, delivery timestamps, and dual-sided conversation wipe.
              </p>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-mono pt-4 border-t border-[#222]">
              Instant Burn • Memory Only
            </div>
          </div>

          <div className="bg-[#141414] p-8 border border-[#2A2A2A] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <Mic className="w-5 h-5 text-white" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">02 / AUDIO</span>
              </div>
              <h3 className="text-lg font-light text-white mb-2">
                Voice Notes
              </h3>
              <p className="text-xs text-[#888] leading-relaxed mb-6 font-light">
                Browser MediaRecorder Opus voice notes with real-time decibel analysis and interactive waveform playback.
              </p>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-mono pt-4 border-t border-[#222]">
              Decibel Waves • Ephemeral Play
            </div>
          </div>

          <div className="bg-[#141414] p-8 border border-[#2A2A2A] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <PhoneCall className="w-5 h-5 text-white" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">03 / CALL</span>
              </div>
              <h3 className="text-lg font-light text-white mb-2">
                Live WebRTC Voice
              </h3>
              <p className="text-xs text-[#888] leading-relaxed mb-6 font-light">
                Direct peer-to-peer live calling with zero server relay. Outgoing ringback tones and live speech indicators.
              </p>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#666] font-mono pt-4 border-t border-[#222]">
              P2P WebRTC • Zero Recording
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Footer / Guarantee */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-[10px] text-[#666] uppercase tracking-[0.2em] font-mono">
        <div>&copy; 2026 Ephemeral Architecture Labs</div>
        <div>Encrypted Channel // Max 2 Participants</div>
        <div>Zero Trace Guarantee // Auto-Purge</div>
      </footer>
    </div>
  );
};
