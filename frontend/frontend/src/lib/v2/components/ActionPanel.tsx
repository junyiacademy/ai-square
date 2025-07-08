'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScenarioType } from '@/lib/types/pbl';
import { Send, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
import { PBLServiceV2 } from '@/lib/services/v2/pbl-service-v2';
import { DiscoveryServiceV2 } from '@/lib/services/v2/discovery-service-v2';
import { AssessmentServiceV2 } from '@/lib/services/v2/assessment-service-v2';

interface ActionPanelProps {
  task: any;
  scenarioType: ScenarioType;
  onAction: (action: any) => void;
  onComplete: (evaluation: any) => void;
}

export function ActionPanel({ task, scenarioType, onAction, onComplete }: ActionPanelProps) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Log the action
    onAction({
      type: 'message',
      content: input,
      timestamp: userMessage.timestamp,
    });

    try {
      let response;
      if (scenarioType === 'pbl') {
        const pblService = new PBLServiceV2();
        response = await pblService.chat({
          taskId: task.id,
          message: input,
          history: messages,
          language: i18n.language,
        });
      } else if (scenarioType === 'discovery') {
        const discoveryService = new DiscoveryServiceV2();
        response = await discoveryService.explore({
          taskId: task.id,
          query: input,
          history: messages,
          language: i18n.language,
        });
      }

      if (response) {
        const aiMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentSubmit = async () => {
    if (!selectedOption || loading) return;

    setLoading(true);
    onAction({
      type: 'answer',
      option: selectedOption,
      timestamp: new Date().toISOString(),
    });

    try {
      const assessmentService = new AssessmentServiceV2();
      const result = await assessmentService.evaluate({
        taskId: task.id,
        answer: selectedOption,
        language: i18n.language,
      });

      setEvaluation(result);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (loading) return;

    setLoading(true);
    try {
      let finalEvaluation = evaluation;

      if (!finalEvaluation) {
        // Get evaluation based on scenario type
        if (scenarioType === 'pbl') {
          const pblService = new PBLServiceV2();
          finalEvaluation = await pblService.evaluate({
            taskId: task.id,
            messages,
            language: i18n.language,
          });
        } else if (scenarioType === 'discovery') {
          const discoveryService = new DiscoveryServiceV2();
          finalEvaluation = await discoveryService.summarize({
            taskId: task.id,
            explorations: messages,
            language: i18n.language,
          });
        }
      }

      onComplete(finalEvaluation);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPBLActions = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <Loader2 className="animate-spin" size={16} />
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t('v2.action.typeMessage', 'Type your message...')}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>

        <button
          onClick={handleComplete}
          disabled={messages.length === 0 || loading}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} />
          {t('v2.action.completeTask', 'Complete Task')}
        </button>
      </div>
    </div>
  );

  const renderDiscoveryActions = () => renderPBLActions(); // Similar to PBL

  const renderAssessmentActions = () => (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold mb-3">{t('v2.action.selectAnswer', 'Select Your Answer')}</h3>
      
      <div className="space-y-2">
        {task.options?.map((option: any, index: number) => (
          <label
            key={index}
            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
              selectedOption === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="radio"
              name="answer"
              value={option.id}
              checked={selectedOption === option.id}
              onChange={() => setSelectedOption(option.id)}
              className="text-blue-500"
            />
            <span className="flex-1">{option.text || option.label}</span>
          </label>
        ))}
      </div>

      {!evaluation && (
        <button
          onClick={handleAssessmentSubmit}
          disabled={!selectedOption || loading}
          className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ) : (
            t('v2.action.submit', 'Submit Answer')
          )}
        </button>
      )}

      {evaluation && (
        <div className={`p-4 rounded-lg ${evaluation.correct ? 'bg-green-50' : 'bg-red-50'}`}>
          <h4 className={`font-semibold mb-2 ${evaluation.correct ? 'text-green-800' : 'text-red-800'}`}>
            {evaluation.correct ? t('v2.correct', 'Correct!') : t('v2.incorrect', 'Incorrect')}
          </h4>
          <p className="text-gray-700">{evaluation.feedback}</p>
          
          <button
            onClick={handleComplete}
            className="w-full mt-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <CheckCircle size={18} className="inline mr-2" />
            {t('v2.action.continue', 'Continue')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare size={20} />
          {t('v2.action.title', 'Actions')}
        </h3>
      </div>

      <div className="flex-1 overflow-hidden">
        {scenarioType === 'pbl' && renderPBLActions()}
        {scenarioType === 'discovery' && renderDiscoveryActions()}
        {scenarioType === 'assessment' && renderAssessmentActions()}
      </div>
    </div>
  );
}