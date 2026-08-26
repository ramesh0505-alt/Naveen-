import React, { useState, useEffect } from 'react';
import { Plus, Settings2, Trash2, RotateCcw, X, Check, MessageSquarePlus, Sparkles } from 'lucide-react';
import { SoundEffects } from '../utils/audio';

const STORAGE_KEY = 'privy_quick_replies_v1';

export const DEFAULT_QUICK_REPLIES: string[] = [
  '👋 Hey there!',
  '👍 Sounds good',
  '🔒 Understood',
  '⏱️ Give me 5 mins',
  '📞 Ready for call',
  '🔥 Delete after reading',
  '✅ Got it, thanks!',
  '🤐 Keep confidential',
];

interface QuickRepliesBarProps {
  onSendQuickReply: (text: string) => void;
  disabled?: boolean;
}

export const QuickRepliesBar: React.FC<QuickRepliesBarProps> = ({
  onSendQuickReply,
  disabled = false,
}) => {
  const [replies, setReplies] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse quick replies from localStorage:', e);
    }
    return DEFAULT_QUICK_REPLIES;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newReplyText, setNewReplyText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Persist quick replies to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
    } catch (e) {
      console.warn('Failed to save quick replies to localStorage:', e);
    }
  }, [replies]);

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newReplyText.trim();
    if (!trimmed) return;
    if (replies.includes(trimmed)) {
      setNewReplyText('');
      return;
    }
    setReplies((prev) => [...prev, trimmed]);
    setNewReplyText('');
    SoundEffects.playMessageSent();
  };

  const handleRemoveReply = (index: number) => {
    setReplies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(replies[index] || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const trimmed = editingText.trim();
    if (trimmed) {
      setReplies((prev) =>
        prev.map((r, i) => (i === editingIndex ? trimmed : r))
      );
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const handleResetDefaults = () => {
    setReplies(DEFAULT_QUICK_REPLIES);
    setEditingIndex(null);
  };

  const handleTriggerReply = (text: string) => {
    if (disabled) return;
    onSendQuickReply(text);
  };

  return (
    <>
      {/* Quick Replies Horizontal Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50/90 dark:bg-zinc-900/60 border-t border-zinc-200/70 dark:border-zinc-800/80 overflow-x-auto no-scrollbar select-none">
        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex-shrink-0 pl-0.5 pr-1">
          <Sparkles className="w-3 h-3 text-amber-500/80" />
          <span className="hidden sm:inline">Quick:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar py-0.5">
          {replies.map((reply, idx) => (
            <button
              key={`${reply}-${idx}`}
              type="button"
              disabled={disabled}
              onClick={() => handleTriggerReply(reply)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 shadow-xs hover:border-emerald-500/50 dark:hover:border-emerald-500/50 active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1"
              title="Click to send immediately"
            >
              <span>{reply}</span>
            </button>
          ))}
        </div>

        {/* Configure / Add Quick Replies Button */}
        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          id="configure-quick-replies-btn"
          className="flex-shrink-0 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Configure Quick Replies"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Replies Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-5 text-zinc-900 dark:text-zinc-100 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <MessageSquarePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Customize Quick Replies
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Instant one-tap responses saved locally
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Reply Form */}
            <form onSubmit={handleAddReply} className="my-4 flex items-center gap-2">
              <input
                type="text"
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                placeholder="Type a new quick reply (e.g. 🏃 On my way)..."
                maxLength={80}
                className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
              <button
                type="submit"
                disabled={!newReplyText.trim()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {/* Existing Quick Replies List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 my-2">
              {replies.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400 font-mono">
                  No quick replies configured yet.
                </div>
              ) : (
                replies.map((reply, idx) => (
                  <div
                    key={`${reply}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 group"
                  >
                    {editingIndex === idx ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingIndex(null);
                          }}
                          autoFocus
                          className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-500 rounded-lg focus:outline-none text-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEdit(idx)}
                        className="flex-1 truncate pr-2 cursor-pointer font-medium hover:text-emerald-600 dark:hover:text-emerald-400"
                        title="Click to edit text"
                      >
                        {reply}
                      </div>
                    )}

                    {editingIndex !== idx && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveReply(idx)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete response"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2.5 py-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold hover:bg-zinc-800 dark:hover:bg-white/90 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
