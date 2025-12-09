'use client';

import { useTranslation } from 'react-i18next';
import { formatDateWithLocale } from '@/utils/locale';
import { type ConversationEntry } from '@/hooks/use-task-data';

interface ChatPanelProps {
  conversations: ConversationEntry[];
  userInput: string;
  setUserInput: (value: string) => void;
  onSendMessage: () => void;
  isProcessing: boolean;
  conversationEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  showEvaluateButton: boolean;
  onEvaluate: () => void;
  isEvaluateDisabled: boolean;
  isEvaluating: boolean;
  language: string;
}

export function ChatPanel({
  conversations,
  userInput,
  setUserInput,
  onSendMessage,
  isProcessing,
  conversationEndRef,
  inputRef,
  showEvaluateButton,
  onEvaluate,
  isEvaluateDisabled,
  isEvaluating,
  language
}: ChatPanelProps) {
  const { t, i18n } = useTranslation('pbl');

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden">
      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="space-y-4">
          {conversations.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-lg ${
                  entry.type === 'user'
                    ? 'bg-purple-600 text-white ml-12'
                    : entry.type === 'ai'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white mr-12'
                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 mr-12'
                }`}
              >
                <p className="whitespace-pre-wrap">{entry.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {formatDateWithLocale(new Date(entry.timestamp), language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* AI thinking indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="max-w-3xl px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 mr-12">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('learn.thinking')}
                  </span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={conversationEndRef} />
        </div>
      </div>

      {/* Evaluate Button */}
      {showEvaluateButton && !isEvaluating && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <button
            onClick={onEvaluate}
            disabled={isEvaluateDisabled}
            className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
              isEvaluateDisabled
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isEvaluateDisabled
              ? t('learn.evaluationUpToDate', 'Evaluation Up to Date')
              : t('learn.evaluate', 'Evaluate Performance')}
          </button>
        </div>
      )}

      {/* Evaluating indicator */}
      {isEvaluating && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-400">
              {t('learn.evaluating', 'Evaluating...')}
            </span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 sm:p-8 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
        <div className="flex gap-4">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder={t('learn.inputPlaceholder')}
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={onSendMessage}
            disabled={!userInput.trim() || isProcessing}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-fit"
          >
            {isProcessing ? t('learn.sending') : t('learn.send')}
          </button>
        </div>
        {/* Bottom safe area - accounting for header and visual balance */}
        <div className="h-8 sm:h-12 md:h-16"></div>
      </div>
    </div>
  );
}
