import React from 'react';
import { triggerHaptic } from '../utils/helpers';

interface LandingPageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenProfile?: () => void;
  hasActiveRoom?: boolean;
  activeRoomCode?: string;
  onResumeRoom?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenProfile,
  hasActiveRoom = false,
  activeRoomCode = '',
  onResumeRoom,
}) => {
  return (
    <div className="flex flex-col w-full bg-[#111318] min-h-screen text-[#e2e2e9] relative overflow-hidden pb-28 pt-16 selection:bg-[#ffb3af]/30">
      {/* Hero Section */}
      <section className="relative w-full px-6 pt-10 pb-20 flex flex-col items-start min-h-[500px] justify-center max-w-4xl mx-auto">
        {/* Abstract Background Waveform */}
        <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
          <svg className="w-full h-full text-[#c7c6ca]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path
              className="velora-waveform animate-[wave_8s_ease-in-out_infinite]"
              d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z"
              fill="currentColor"
              fillOpacity="0.08"
            ></path>
            <path
              className="velora-waveform animate-[wave_12s_ease-in-out_infinite_reverse]"
              d="M0,60 Q25,40 50,60 T100,60 L100,100 L0,100 Z"
              fill="currentColor"
              fillOpacity="0.04"
            ></path>
          </svg>
        </div>

        <div className="relative z-10 w-full flex flex-col gap-6">
          <h1 className="font-display-sm text-headline-lg-mobile md:text-display-lg text-[#e2e2e9] leading-tight tracking-tight uppercase max-w-[320px]">
            Velora.<br />
            <span className="text-[#c7c6cb]">Private by</span><br />
            Design.
          </h1>

          <p className="font-body-md text-[#c7c6cb] max-w-[280px] leading-relaxed">
            A temporary private space for two. Connection without a trace.
          </p>

          <div className="flex flex-col gap-4 mt-6 w-full max-w-sm">
            {hasActiveRoom && onResumeRoom && (
              <button
                onClick={() => {
                  triggerHaptic('success');
                  onResumeRoom();
                }}
                id="hero-resume-room-btn"
                className="w-full bg-[#ffb3af] text-[#230002] font-label-md py-4 px-6 rounded-full flex items-center justify-between group transition-transform active:scale-[0.98] shadow-[0_4px_20px_rgba(255,179,175,0.2)] cursor-pointer font-bold"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  <span>Resume Space {activeRoomCode ? `(${activeRoomCode})` : ''}</span>
                </div>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('medium');
                onCreateRoom();
              }}
              id="hero-create-room-btn"
              className="w-full bg-[#e4e2dd] text-[#1b1c19] font-label-md py-4 px-6 rounded-full flex items-center justify-between group transition-colors hover:bg-[#c8c6c2] cursor-pointer shadow-md active:scale-[0.98]"
            >
              <span className="font-semibold">Create Private Room</span>
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                onJoinRoom();
              }}
              id="hero-join-room-btn"
              className="w-full bg-transparent border border-[#46464b] text-[#e2e2e9] font-label-md py-4 px-6 rounded-full flex items-center justify-center transition-colors hover:bg-[#33353a] cursor-pointer active:scale-[0.98]"
            >
              <span>Join a Room</span>
            </button>
          </div>
        </div>
      </section>

      {/* How it Works Section — "The Ritual" */}
      <section className="w-full px-6 py-20 bg-[#1a1b21] flex flex-col gap-10 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-2">
          <h2 className="font-display-sm text-headline-lg-mobile text-[#e2e2e9]">The Ritual</h2>
          <p className="font-body-md text-[#c7c6cb]">Four steps to absolute privacy.</p>
        </div>

        <div className="max-w-4xl mx-auto w-full flex flex-col gap-8 relative">
          {/* Connecting Vertical Line */}
          <div className="absolute left-6 top-6 bottom-6 w-[1px] bg-[#46464b] opacity-30"></div>

          {/* Step 1 */}
          <div className="flex gap-6 relative">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#111318] flex items-center justify-center z-10 border border-[#46464b] shadow-sm">
              <span className="font-label-md text-[#e2e2e9]">01</span>
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              <h3 className="font-label-md text-[#e2e2e9] uppercase tracking-widest text-xs">Create</h3>
              <p className="font-body-md text-[#c7c6cb] text-sm">
                Generate a secure, single-use key. No accounts required.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6 relative">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#111318] flex items-center justify-center z-10 border border-[#46464b] shadow-sm">
              <span className="font-label-md text-[#e2e2e9]">02</span>
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              <h3 className="font-label-md text-[#e2e2e9] uppercase tracking-widest text-xs">Share</h3>
              <p className="font-body-md text-[#c7c6cb] text-sm">
                Send the invitation link or PIN via any channel.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6 relative">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#111318] flex items-center justify-center z-10 border border-[#46464b] shadow-sm">
              <span className="font-label-md text-[#e2e2e9]">03</span>
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              <h3 className="font-label-md text-[#e2e2e9] uppercase tracking-widest text-xs">Connect</h3>
              <p className="font-body-md text-[#c7c6cb] text-sm">
                End-to-end encrypted channel opens only when both are present.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6 relative">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#111318] flex items-center justify-center z-10 border border-[#46464b] shadow-sm">
              <span className="font-label-md text-[#e2e2e9]">04</span>
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              <h3 className="font-label-md text-[#e2e2e9] uppercase tracking-widest text-xs">Disappear</h3>
              <p className="font-body-md text-[#c7c6cb] text-sm">
                When one leaves, everything vanishes. Forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features / Visual Vignettes */}
      <section className="w-full px-6 py-20 flex flex-col gap-12 bg-[#111318] max-w-4xl mx-auto">
        {/* Silent Words Card */}
        <div className="flex flex-col gap-4">
          <div className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-2xl bg-[#1e2025] overflow-hidden relative p-8 flex flex-col justify-end shadow-xl border border-white/[0.05]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-50 mix-blend-screen"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCwIS4qkXV6q-0G7bkBbmjULAd3WxbeGx_JuByfc8EcGCe_eH56ry8ARJtaJCoe8iXpOt9HrTnMHVkuVhzi8xRGtvnjKgJIitfE2LRlH55Pc_R0989HvHCgoCHM5sjR9IQOU5AgmpGnLWJvCPLkmB2qYdL9HeGRS4viiJkfVm3Y1SvXAvyKrDMPpzRwdEPRmkgoTdIhD9yQCWkaOxJEeD_dWWlGCWC34D07JsXcjCmyohPV5bvMbYLJ')`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/95 via-[#111318]/30 to-transparent"></div>

            {/* Abstract Message Elements */}
            <div className="absolute inset-0 p-8 flex flex-col gap-4 justify-start opacity-60 pointer-events-none">
              <div className="w-3/4 h-3 bg-[#37393f] rounded-full self-start"></div>
              <div className="w-1/2 h-3 bg-[#37393f] rounded-full self-start"></div>
              <div className="w-2/3 h-3 bg-[#230002] rounded-full self-end mt-4"></div>
            </div>

            <div className="relative z-10">
              <span className="material-symbols-outlined text-[#e2e2e9] mb-2 text-2xl">chat_bubble</span>
              <h3 className="font-display-sm text-headline-lg-mobile text-[#e2e2e9] mb-1">Silent Words</h3>
              <p className="font-body-md text-[#c7c6cb] text-sm">
                Perfectly encrypted text and ephemeral media that leaves no trace.
              </p>
            </div>
          </div>
        </div>

        {/* Clear Voice Card */}
        <div className="flex flex-col gap-4">
          <div className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-2xl bg-[#1e2025] overflow-hidden relative p-8 flex flex-col justify-end shadow-xl border border-white/[0.05]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-50 mix-blend-screen"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuADFZkeoN_4D4f2-epgjJUoOa5XIsCxXiL_CXrTmeuRWh3Gt0_5R_cPp8FrRRo6Sgjb-scLLOefJ0b6uX7yZ2GTEe568RHSquPXUHiwImQ-_ldfGkJdGYG50F2TeGjIisuZ88kSh4ttlFx6DGbUzCXwEYIljIlv_s9Me6qzD2vUmE7hXWkagAeMlrfrQt_eZOZM5B4pw5uH1pBdNadqgMikP8OtAvXKTyAn7RWscjUWjj5j2nn2v8av')`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/95 via-[#111318]/30 to-transparent"></div>

            {/* Animated Voice Indicator */}
            <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-8 bg-[#e2e2e9] rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                <div className="w-1 h-16 bg-[#e2e2e9] rounded-full animate-[pulse_1.2s_ease-in-out_infinite_0.2s]"></div>
                <div className="w-1 h-24 bg-[#ffb3af] rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.4s]"></div>
                <div className="w-1 h-12 bg-[#e2e2e9] rounded-full animate-[pulse_1.1s_ease-in-out_infinite_0.1s]"></div>
                <div className="w-1 h-6 bg-[#e2e2e9] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.3s]"></div>
              </div>
            </div>

            <div className="relative z-10">
              <span className="material-symbols-outlined text-[#e2e2e9] mb-2 text-2xl">mic</span>
              <h3 className="font-display-sm text-headline-lg-mobile text-[#e2e2e9] mb-1">Clear Voice</h3>
              <p className="font-body-md text-[#c7c6cb] text-sm">
                High-fidelity audio streaming, strictly peer-to-peer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full px-6 py-20 bg-[#111318] flex flex-col items-center justify-center text-center gap-6 border-t border-[#33353a] max-w-4xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#1e2025] flex items-center justify-center mb-2 relative overflow-hidden border border-white/5">
          <div className="w-3 h-3 bg-[#ffb3af] rounded-full absolute z-10"></div>
          <div className="w-3 h-3 bg-[#ffb3af] rounded-full absolute z-0 animate-ping opacity-50"></div>
        </div>

        <h2 className="font-display-sm text-headline-lg-mobile text-[#e2e2e9] max-w-[280px]">
          Ready to vanish?
        </h2>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onCreateRoom();
          }}
          className="bg-[#e4e2dd] text-[#1b1c19] font-label-md py-4 px-12 rounded-full transition-transform active:scale-95 hover:bg-[#c8c6c2] cursor-pointer font-semibold shadow-lg"
        >
          Start a Room
        </button>
      </section>
    </div>
  );
};
