import React from 'react';
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
  return (
    <div className="flex flex-col w-full bg-[#131411] min-h-screen text-[#e4e2dd] relative overflow-hidden pb-28">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 inset-x-0 h-[60vh] opacity-30 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#d4c5a6]/10 rounded-full blur-[80px] mix-blend-screen animate-pulse"
          style={{ animationDuration: '8s' }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-[#920418]/10 rounded-full blur-[60px] mix-blend-screen animate-pulse"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        ></div>
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path
            className="text-[#d4c5a6]/20"
            d="M 20 60 Q 50 20 80 50"
            fill="none"
            stroke="currentColor"
            strokeDasharray="1 3"
            strokeWidth="0.2"
          >
            <animate attributeName="stroke-dashoffset" dur="20s" from="100" repeatCount="indefinite" to="0"></animate>
          </path>
          <circle className="fill-[#d4c5a6]/40" cx="20" cy="60" r="1.5"></circle>
          <circle className="fill-[#d4c5a6]/40" cx="80" cy="50" r="1.5"></circle>
        </svg>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 pt-10 pb-8 flex flex-col items-center text-center z-10">
        <span className="font-label-sm text-label-sm text-[#d4c5a6] tracking-widest uppercase mb-4 opacity-80">
          Private Communication
        </span>
        <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-[#e4e2dd] max-w-2xl mb-4 leading-tight">
          Private.<br />
          Two People.<br />
          <span className="text-[#d4c5a6]">One Space.</span>
        </h1>
        <p className="font-body-lg text-body-lg text-[#c7c6cb] max-w-md mb-8 leading-relaxed">
          A private place to chat, send voice messages, and talk without phone numbers or usernames.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button
            onClick={() => {
              triggerHaptic('medium');
              onCreateRoom();
            }}
            id="hero-create-room-btn"
            className="w-full py-4 px-6 bg-[#d4c5a6] text-[#382f19] font-label-md rounded-full shadow-[0_4px_20px_rgba(212,197,166,0.15)] transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Create Private Room</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              onJoinRoom();
            }}
            id="hero-join-room-btn"
            className="w-full py-4 px-6 bg-transparent border border-[#46464b] text-[#e4e2dd] font-label-md rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#1f201d]"
          >
            <span>Join a Room</span>
          </button>
        </div>
      </section>

      {/* Editorial Privacy Section */}
      <section className="px-6 py-12 flex flex-col items-center text-center border-t border-[#46464b]/30 mt-6 z-10 relative bg-[#0e0e0c]">
        <div className="max-w-3xl mx-auto py-6">
          <h2 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-[#d4c5a6] leading-tight mb-6 tracking-wide">
            NO PHONE NUMBER.<br />
            NO USERNAME.<br />
            NO PUBLIC PROFILE.
          </h2>
          <div className="w-16 h-[1px] bg-[#46464b] mx-auto mb-6"></div>
          <p className="font-body-lg text-body-lg text-[#c7c6cb] max-w-lg mx-auto">
            Your identity is yours. Velora creates a temporary, secure space that exists only as long as you need it to.
          </p>
        </div>
      </section>
    </div>
  );
};
