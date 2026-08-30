import React, { useState, useEffect } from 'react';
import { SoundEffects } from '../utils/audio';

const STORAGE_KEY = 'privy_quick_replies_v1';

export const DEFAULT_QUICK_REPLIES: string[] = [
  '👋 Hey there!',
  '👍 Sounds good',
  '🔒 Understood',
  '⏱️ Give me 5 mins',
  '📞 Ready for call',
  '🔥 Burn after reading',
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
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0C0F] border-t border-[#272A31] overflow-x-auto no-scrollbar select-none">
        <div className="flex items-center gap-1 text-[11px] font-mono text-[#6E7179] flex-shrink-0 pl-0.5 pr-1">
          <span className="material-symbols-outlined text-[13px] text-[#E8D8B8]">bolt</span>
          <span className="hidden sm:inline">Quick:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar py-0.5">
          {replies.map((reply, idx) => (
            <button
              key={`${reply}-${idx}`}
              type="button"
              disabled={disabled}
              onClick={() => handleTriggerReply(reply)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-label-md bg-[#181B21] hover:bg-[#272A31] text-[#F5F3EE] border border-[#272A31] hover:border-[#E8D8B8]/50 active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1"
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
          className="flex-shrink-0 w-7 h-7 rounded-full text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#181B21] flex items-center justify-center transition-colors cursor-pointer"
          title="Configure Quick Replies"
        >
          <span className="material-symbols-outlined text-[15px]">tune</span>
        </button>
      </div>

      {/* Quick Replies Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0F]/90 backdrop-blur-xl animate-fade-in select-none">
          <div className="w-full max-w-md bg-[#121419] border border-[#272A31] rounded-[24px] shadow-2xl p-5 text-[#F5F3EE] animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#272A31]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#181B21] border border-[#272A31] flex items-center justify-center text-[#E8D8B8]">
                  <span className="material-symbols-outlined text-[17px]">chat</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-sm font-bold text-[#F5F3EE]">
                    Quick Replies
                  </h3>
                  <p className="font-body-sm text-[11px] text-[#9B9DA3]">
                    Instant one-tap messages saved locally
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="w-7 h-7 rounded-full bg-[#181B21] text-[#9B9DA3] hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Add New Reply Form */}
            <form onSubmit={handleAddReply} className="my-4 flex items-center gap-2">
              <input
                type="text"
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                placeholder="Type a new reply (e.g. 🏃 On my way)..."
                maxLength={80}
                className="flex-1 px-3.5 py-2 text-xs bg-[#0B0C0F] border border-[#272A31] rounded-full focus:outline-none focus:border-[#E8D8B8] text-[#F5F3EE] placeholder-[#6E7179]"
              />
              <button
                type="submit"
                disabled={!newReplyText.trim()}
                className="px-3.5 py-2 bg-[#E8D8B8] hover:bg-[#F0E3C8] disabled:opacity-40 disabled:cursor-not-allowed text-[#121419] text-xs font-label-md font-bold rounded-full flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add</span>
              </button>
            </form>

            {/* Existing Quick Replies List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 my-2">
              {replies.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#6E7179] font-mono">
                  No quick replies configured yet.
                </div>
              ) : (
                replies.map((reply, idx) => (
                  <div
                    key={`${reply}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#181B21] border border-[#272A31] text-xs text-[#F5F3EE] group"
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
                          className="flex-1 px-2.5 py-1 text-xs bg-[#0B0C0F] border border-[#E8D8B8] rounded-full focus:outline-none text-[#F5F3EE]"
                        />
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="w-6 h-6 rounded-full bg-[#E8D8B8] text-[#121419] flex items-center justify-center cursor-pointer"
                          title="Save"
                        >
                          <span className="material-symbols-outlined text-[13px]">check</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="w-6 h-6 rounded-full bg-[#272A31] text-[#9B9DA3] flex items-center justify-center cursor-pointer"
                          title="Cancel"
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEdit(idx)}
                        className="flex-1 truncate pr-2 cursor-pointer font-label-md hover:text-[#E8D8B8]"
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
                          className="w-6 h-6 text-[#6E7179] hover:text-[#FF5C5C] rounded-full hover:bg-[#FF5C5C]/10 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete response"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#272A31] text-xs">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 rounded-full text-[#9B9DA3] hover:text-[#F5F3EE] hover:bg-[#181B21] font-label-md text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 rounded-full bg-[#E8D8B8] text-[#121419] font-label-md font-bold hover:bg-[#F0E3C8] transition-colors cursor-pointer"
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
