import React from 'react';
import { Clock, ShieldCheck, ArrowRight, PlusCircle } from 'lucide-react';

interface RoomExpiredViewProps {
  reason?: string;
  onCreateNew: () => void;
  onGoHome: () => void;
}

export const RoomExpiredView: React.FC<RoomExpiredViewProps> = ({
  reason = 'This private room has reached its lifespan and expired.',
  onCreateNew,
  onGoHome,
}) => {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-8 sm:p-10">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mx-auto flex items-center justify-center mb-6">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>

        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
          Room Expired & Closed
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
          {reason}
        </p>

        {/* Zero-trace reassurance */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 text-left mb-8 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-200">Zero-Trace Wipe Complete</div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              All text messages, voice recordings, media files, and active session tokens have been permanently cleared from server memory.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onCreateNew}
            id="expired-create-new-btn"
            className="w-full py-3.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-sm shadow-sm hover:bg-zinc-800 dark:hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Private Room</span>
          </button>

          <button
            onClick={onGoHome}
            id="expired-go-home-btn"
            className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};
