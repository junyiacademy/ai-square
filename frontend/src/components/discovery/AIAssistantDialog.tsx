'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

interface AIAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIAssistantDialog({ isOpen, onClose }: AIAssistantDialogProps) {
  const [message, setMessage] = React.useState('');
  const [messages, setMessages] = React.useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 嗨！我是你的 AI 探索助手。有什麼關於探索未來的問題嗎？'
    }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message
    };

    setMessages(prev => [...prev, newUserMessage]);
    setMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '這是一個很好的問題！讓我來幫你分析...'
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed right-4 bottom-4 lg:right-8 lg:bottom-20 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">AI 探索顧問</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-4 py-2 rounded-2xl
                      ${msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                      }
                    `}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="輸入你的問題..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleSend}
                  className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}