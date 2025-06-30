'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Wand2, 
  Languages, 
  CheckCircle, 
  Sparkles,
  Send,
  Loader2
} from 'lucide-react';

interface AIAssistantProps {
  content: string;
  onContentUpdate: (content: string) => void;
  selectedFile: string | null;
}

export function AIAssistant({ content, onContentUpdate, selectedFile }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);

  const handleQuickAction = async (action: string) => {
    if (!content || !selectedFile) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content,
          file: selectedFile,
        }),
      });
      
      const data = await response.json();
      if (data.result) {
        onContentUpdate(data.result);
        setMessages([...messages, {
          role: 'assistant',
          content: `✓ ${action} completed successfully`
        }]);
      }
    } catch (error) {
      console.error('AI assist error:', error);
      setMessages([...messages, {
        role: 'assistant',
        content: `✗ Error: ${error}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomPrompt = async () => {
    if (!prompt.trim() || !content) return;
    
    setIsProcessing(true);
    setMessages([...messages, { role: 'user', content: prompt }]);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          content,
          file: selectedFile,
        }),
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }]);
      
      if (data.updatedContent) {
        onContentUpdate(data.updatedContent);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error}`
      }]);
    } finally {
      setIsProcessing(false);
      setPrompt('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
        <h3 className="font-semibold flex items-center gap-3 text-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI Assistant
          </span>
        </h3>
        <p className="text-xs text-gray-600 mt-2 pl-11">Powered by Google Vertex AI</p>
      </div>

      {/* Quick Actions */}
      <div className="p-5 space-y-3 border-b border-gray-100 bg-white/50">
        <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full" />
          Quick Actions
        </div>
        
        <button
          onClick={() => handleQuickAction('complete')}
          disabled={!content || isProcessing}
          className="w-full px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 text-purple-700 rounded-xl transition-all duration-200 flex items-center gap-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-purple-100"
        >
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Wand2 className="w-4 h-4 text-purple-600" />
          </div>
          Complete Content
        </button>
        
        <button
          onClick={() => handleQuickAction('translate')}
          disabled={!content || isProcessing}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-700 rounded-xl transition-all duration-200 flex items-center gap-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-blue-100"
        >
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <Languages className="w-4 h-4 text-blue-600" />
          </div>
          Translate to All Languages
        </button>
        
        <button
          onClick={() => handleQuickAction('improve')}
          disabled={!content || isProcessing}
          className="w-full px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-700 rounded-xl transition-all duration-200 flex items-center gap-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-emerald-100"
        >
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          Improve & Validate
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-4 rounded-xl transition-all duration-200 ${
            msg.role === 'user' 
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 ml-8' 
              : 'bg-white border border-gray-100 mr-8 shadow-sm'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-600'
              }`}>
                {msg.role === 'user' ? (
                  <span className="text-white text-xs font-bold">U</span>
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>
              <p className="text-sm text-gray-700 pt-1.5 leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center mt-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-2">
              How can I help you today?
            </p>
            <p className="text-sm text-gray-500">
              I can complete content, translate, or improve your work
            </p>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-5 border-t border-gray-100 bg-white">
        <div className="flex gap-3">
          <textarea
            placeholder="Ask AI to help with your content..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] flex-1 resize-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm placeholder-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleCustomPrompt();
              }
            }}
          />
          <button
            onClick={handleCustomPrompt}
            disabled={!prompt.trim() || isProcessing}
            className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Press <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">⌘</kbd>+<kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send
        </p>
      </div>
    </div>
  );
}