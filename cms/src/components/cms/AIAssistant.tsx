'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Wand2, 
  Languages, 
  CheckCircle, 
  Sparkles,
  Send,
  Loader2,
  Network
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
    suggestedContent?: string;
    isProcessing?: boolean;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickAction = async (action: string) => {
    if (!content || !selectedFile) return;
    
    setIsProcessing(true);
    
    // Add processing message
    const actionMessages = {
      complete: '🔄 Completing content structure...',
      translate: '🌐 Translating to all languages...',
      improve: '✨ Improving and validating content...',
      ksa: '🔗 Mapping KSA competencies...'
    };
    
    const processingMessage = {
      role: 'assistant' as const,
      content: actionMessages[action as keyof typeof actionMessages] || `🔄 Processing ${action}...`,
      isProcessing: true
    };
    
    setMessages(prev => [...prev, processingMessage]);
    
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
      
      if (data.error) {
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `❌ Error: ${data.error}`
        }]);
        return;
      }
      
      if (data.result) {
        // Validate the result
        const validation = data.validation || { valid: true };
        
        if (validation.valid) {
          onContentUpdate(data.result);
          setMessages(prev => [...prev.slice(0, -1), {
            role: 'assistant',
            content: `✅ ${action.charAt(0).toUpperCase() + action.slice(1)} completed successfully!\n\n${validation.summary || ''}`
          }]);
        } else {
          setMessages(prev => [...prev.slice(0, -1), {
            role: 'assistant',
            content: `⚠️ ${action.charAt(0).toUpperCase() + action.slice(1)} completed with warnings:\n\n${validation.errors?.join('\n') || 'Unknown validation error'}\n\nWould you like to apply the changes anyway?`,
            suggestedContent: data.result
          }]);
        }
      }
    } catch (error) {
      console.error('AI assist error:', error);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `❌ Failed to ${action}: ${error}`
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
      
      // If AI suggests content update, ask for confirmation
      if (data.updatedContent) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response + '\n\n💡 **Would you like to apply these changes?**',
          suggestedContent: data.updatedContent
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
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
      <div className="p-4 pr-12 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI Assistant
          </span>
        </h3>
        <p className="text-xs text-gray-600 mt-1 pl-9">Vertex AI</p>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-gray-100 bg-white/50">
        <div className="text-xs font-medium text-gray-600 mb-2">Quick Actions</div>
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickAction('complete')}
            disabled={!content || isProcessing}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 text-purple-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-purple-100"
            title="Complete Content"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Complete
          </button>
          
          <button
            onClick={() => handleQuickAction('translate')}
            disabled={!content || isProcessing}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-blue-100"
            title="Translate to All Languages"
          >
            <Languages className="w-3.5 h-3.5" />
            Translate
          </button>
          
          <button
            onClick={() => handleQuickAction('improve')}
            disabled={!content || isProcessing}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-emerald-100"
            title="Improve & Validate"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Improve
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickAction('ksa')}
            disabled={!content || isProcessing}
            className="w-full px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 text-orange-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm border border-orange-100"
            title="Map KSA Competencies"
          >
            <Network className="w-3.5 h-3.5" />
            Map KSA
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap flex-1">{msg.content}</p>
                  {msg.isProcessing && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-600 rounded-full processing-dot" />
                      <div className="w-2 h-2 bg-purple-600 rounded-full processing-dot" />
                      <div className="w-2 h-2 bg-purple-600 rounded-full processing-dot" />
                    </div>
                  )}
                </div>
                {msg.suggestedContent && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        onContentUpdate(msg.suggestedContent!);
                        setMessages(prev => [...prev.slice(0, idx + 1), {
                          role: 'assistant',
                          content: '✅ Changes applied successfully!'
                        }]);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium rounded-lg hover:shadow-md transition-all duration-200"
                    >
                      Apply Changes
                    </button>
                    <button
                      onClick={() => {
                        setMessages(prev => prev.map((m, i) => 
                          i === idx ? { ...m, suggestedContent: undefined } : m
                        ));
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-all duration-200"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
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
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
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