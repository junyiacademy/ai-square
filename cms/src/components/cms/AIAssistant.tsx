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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Assistant
        </h3>
        <p className="text-xs text-gray-500 mt-1">Powered by Vertex AI</p>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-2 border-b border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Quick Actions</p>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => handleQuickAction('complete')}
          disabled={!content || isProcessing}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Complete Content
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => handleQuickAction('translate')}
          disabled={!content || isProcessing}
        >
          <Languages className="w-4 h-4 mr-2" />
          Translate to All Languages
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => handleQuickAction('improve')}
          disabled={!content || isProcessing}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Improve & Validate
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <Card key={idx} className={`p-3 ${
            msg.role === 'user' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
          }`}>
            <div className="flex items-start gap-2">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                msg.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
              }`} />
              <p className="text-sm">{msg.content}</p>
            </div>
          </Card>
        ))}
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <Sparkles className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              Ask me to help with your content...
            </p>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask AI to help..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleCustomPrompt();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleCustomPrompt}
            disabled={!prompt.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press ⌘+Enter (Mac) or Ctrl+Enter (Windows) to send
        </p>
      </div>
    </div>
  );
}