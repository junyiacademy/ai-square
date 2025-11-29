'use client';

import { MessageCircle, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, User } from '@/types/chat';
import type { RefObject } from 'react';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isTyping: boolean;
  currentUser: User | null;
  showScrollButton: boolean;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messageEndRef: RefObject<HTMLDivElement | null>;
  onScrollToBottom: () => void;
}

export function ChatMessages({
  messages,
  isTyping,
  currentUser,
  showScrollButton,
  messagesContainerRef,
  messageEndRef,
  onScrollToBottom,
}: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 relative" ref={messagesContainerRef}>
      <div className="max-w-3xl mx-auto space-y-4">
        {!currentUser ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Please log in to start chatting</p>
            <a href="/login" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Log In
            </a>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Start a conversation...</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-4 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="px-1 py-0.5 bg-gray-200 text-gray-800 rounded text-sm">{children}</code>
                          ) : (
                            <code className="block p-3 bg-gray-800 text-gray-100 rounded-lg overflow-x-auto">{children}</code>
                          );
                        },
                        pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">{children}</blockquote>
                        ),
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                        a: ({ children, href }) => (
                          <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start" data-testid="typing-indicator">
            <div className="max-w-[70%] p-4 rounded-lg bg-gray-100 text-gray-900">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      {showScrollButton && (
        <button
          onClick={onScrollToBottom}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  );
}
