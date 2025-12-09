'use client';

import { MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDateWithLocale } from '@/utils/locale';
import type { ChatSession, User } from '@/types/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  selectedChat: string | null;
  isLoading: boolean;
  currentUser: User | null;
  dropdownOpen: string | null;
  onNewChat: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onToggleDropdown: (sessionId: string | null) => void;
}

export function ChatSidebar({
  sessions,
  selectedChat,
  isLoading,
  currentUser,
  dropdownOpen,
  onNewChat,
  onLoadSession,
  onDeleteSession,
  onToggleDropdown,
}: ChatSidebarProps) {
  return (
    <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-100 overflow-y-auto shadow-sm relative">
      <div className="p-4">
        <div className="mb-4">
          {currentUser && (
            <button
              onClick={onNewChat}
              className="w-full mb-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              title="New Chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">New Chat</span>
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat History
          </h2>
        </div>
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No previous chats</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`relative group p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedChat === session.id ? 'bg-blue-50 border-blue-200 border' : ''
                }`}
              >
                <div
                  onClick={() => onLoadSession(session.id)}
                  className="cursor-pointer pr-8"
                >
                  <div className="font-medium text-gray-900">{session.title}</div>
                  <div className="text-sm text-gray-500 truncate">{session.last_message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDateWithLocale(new Date(session.updated_at), 'en')}
                  </div>
                </div>

                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDropdown(dropdownOpen === session.id ? null : session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all duration-200"
                    data-testid={`more-button-${session.id}`}
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>

                  {dropdownOpen === session.id && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-32">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this chat session?')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
