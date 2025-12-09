'use client';

import { Send } from 'lucide-react';
import type { QuickAction, User } from '@/types/chat';
import type { RefObject } from 'react';

interface ChatInputProps {
  message: string;
  isSending: boolean;
  currentUser: User | null;
  quickActions: QuickAction[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInput({
  message,
  isSending,
  currentUser,
  quickActions,
  textareaRef,
  onMessageChange,
  onSend,
  onKeyDown,
}: ChatInputProps) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {currentUser && quickActions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => onMessageChange(action.prompt)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors flex items-center gap-1.5"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              onMessageChange(e.target.value);
              const textarea = e.target;
              textarea.style.height = 'auto';
              textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
            }}
            onKeyDown={onKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none resize-none max-h-32 text-gray-900 placeholder-gray-500"
            rows={1}
            disabled={isSending || !currentUser}
          />
          <button
            onClick={onSend}
            disabled={!message.trim() || isSending || !currentUser}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
