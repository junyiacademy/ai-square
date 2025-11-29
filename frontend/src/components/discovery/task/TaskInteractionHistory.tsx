'use client';

import { Sparkles, CheckCircle, Trophy, AlertCircle, Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface Interaction {
  timestamp: string;
  type: string;
  content: Record<string, unknown>;
}

interface TaskInteractionHistoryProps {
  interactions: Interaction[];
  showHistory: boolean;
  onToggleHistory: () => void;
  passCount: number;
}

export function TaskInteractionHistory({
  interactions,
  showHistory,
  onToggleHistory,
  passCount
}: TaskInteractionHistoryProps) {
  const userInputs = interactions.filter(i => i.type === 'user_input');

  return (
    <div className="bg-gray-50 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <span>學習歷程</span>
          <span className="text-sm font-normal text-gray-500 ml-2">
            (共 {userInputs.length} 次嘗試
            {passCount > 0 && (
              <>
                ,
                <span className="inline-flex items-center space-x-1">
                  {Array.from({ length: passCount }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const passedElement = document.getElementById(`passed-interaction-${i}`);
                        passedElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-100 px-1.5 py-0.5 rounded text-xs font-medium transition-colors"
                      title={`跳轉到第 ${i + 1} 次通過`}
                    >
                      ✓{i + 1}
                    </button>
                  ))}
                  <span className="text-gray-500 text-xs ml-1">次通過</span>
                </span>
              </>
            )})
          </span>
        </h3>
        <button
          onClick={onToggleHistory}
          className="text-gray-600 hover:text-gray-800 transition-transform duration-200"
        >
          {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {showHistory && (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {interactions.map((interaction, index) => {
            const passedInteractionIndex = interaction.type === 'ai_response' && interaction.content.completed
              ? interactions.slice(0, index + 1).filter(i => i.type === 'ai_response' && i.content.completed).length - 1
              : -1;

            return (
              <div
                key={index}
                id={passedInteractionIndex >= 0 ? `passed-interaction-${passedInteractionIndex}` : undefined}
                className={`
                  rounded-lg p-4
                  ${interaction.type === 'user_input'
                    ? 'bg-white border border-gray-200 ml-0 mr-8'
                    : interaction.content.completed
                      ? 'bg-green-50/50 border border-green-200 ml-8 mr-0'
                      : 'bg-orange-50/50 border border-orange-200 ml-8 mr-0'}
                  ${passedInteractionIndex >= 0 ? 'scroll-mt-20' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {interaction.type === 'user_input' ? (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">你</span>
                      </div>
                    ) : (
                      <>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          interaction.content.completed ? 'bg-green-600' : 'bg-orange-600'
                        }`}>
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-sm font-medium ${
                          interaction.content.completed ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          AI 回饋
                          {interaction.content.completed ? (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              {String(interaction.content.xpEarned || 0)} XP
                            </span>
                          ) : null}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(interaction.timestamp).toLocaleString('zh-TW')}
                  </span>
                </div>

                <div className="text-sm text-gray-700">
                  {interaction.type === 'user_input' ? (
                    <p className="whitespace-pre-wrap">
                      {typeof interaction.content === 'string'
                        ? interaction.content
                        : (interaction.content.response as string) || JSON.stringify(interaction.content)}
                    </p>
                  ) : (
                    <InteractionFeedback content={interaction.content} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InteractionFeedback({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        {content.completed ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">任務通過</span>
            {(content.xpEarned as number) > 0 && (
              <div className="flex items-center space-x-1 text-purple-600 font-medium ml-2">
                <Trophy className="w-4 h-4" />
                <span>+{String(content.xpEarned || 0)} XP</span>
              </div>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">需要改進</span>
          </>
        )}
      </div>

      <p className="text-gray-700">{String(content.feedback || '')}</p>

      {Array.isArray(content.strengths) && content.strengths.length > 0 && (
        <div className="bg-green-50 rounded-md p-3">
          <p className="text-sm font-medium text-green-800 mb-1">優點：</p>
          <ul className="text-sm text-green-700 space-y-1">
            {content.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{String(strength)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(content.improvements) && content.improvements.length > 0 && (
        <div className="bg-orange-50 rounded-md p-3">
          <p className="text-sm font-medium text-orange-800 mb-1">改進建議：</p>
          <ul className="text-sm text-orange-700 space-y-1">
            {content.improvements.map((improvement, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{String(improvement)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(content.skillsImproved) && content.skillsImproved.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {content.skillsImproved.map((skill, idx) => (
            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md">
              {String(skill)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
