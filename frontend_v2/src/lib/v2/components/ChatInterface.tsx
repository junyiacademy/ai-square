/**
 * V2 Chat Interface Component
 * For chat and discussion type tasks
 */

import React, { useState, useRef, useEffect } from 'react';
import { Task, Evaluation } from '@/lib/v2/interfaces/base';
import { Send, Bot, User } from 'lucide-react';
import { EvaluationDisplay } from './EvaluationDisplay';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  task: Task;
  onSubmit: (response: any) => Promise<void>;
  loading: boolean;
  evaluation: Evaluation | null;
}

export function ChatInterface({
  task,
  onSubmit,
  loading,
  evaluation
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: task.instructions || 'Start your discussion about this topic.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
  };

  const handleSubmitConversation = async () => {
    if (loading || submitted) return;

    const conversation = messages.filter(m => m.role !== 'system');
    setSubmitted(true);
    await onSubmit({ conversation });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`p-2 rounded-full ${
                message.role === 'user' 
                  ? 'bg-blue-100 text-blue-600' 
                  : message.role === 'assistant'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className={`px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'assistant'
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-yellow-50 text-yellow-900 border border-yellow-200'
              }`}>
                {message.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Evaluation display */}
      {evaluation && (
        <div className="mb-4">
          <EvaluationDisplay evaluation={evaluation} />
        </div>
      )}

      {/* Input area */}
      {!submitted && !evaluation && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || submitted}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || submitted}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {messages.filter(m => m.role === 'user').length > 0 && (
            <button
              onClick={handleSubmitConversation}
              disabled={loading || submitted}
              className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Conversation for Evaluation
            </button>
          )}
        </div>
      )}
    </div>
  );
}