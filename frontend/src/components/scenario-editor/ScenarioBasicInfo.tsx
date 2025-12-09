'use client';

import { Edit3, ChevronUp, ChevronDown } from 'lucide-react';

interface ScenarioBasicInfoProps {
  draft: {
    title?: Record<string, string>;
    description?: Record<string, string>;
    difficulty?: string;
    estimatedMinutes?: number;
    mode?: string;
  };
  language: string;
  editingField: string | null;
  editingValue: string;
  isExpanded: boolean;
  onToggle: () => void;
  onStartEditing: (field: string, value: string) => void;
  onEditingValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onUpdateDraft: (updates: { difficulty?: string; estimatedMinutes?: number }) => void;
}

export function ScenarioBasicInfo({
  draft,
  language,
  editingField,
  editingValue,
  isExpanded,
  onToggle,
  onStartEditing,
  onEditingValueChange,
  onSave,
  onCancel,
  onUpdateDraft
}: ScenarioBasicInfoProps) {
  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '簡單';
      case 'medium': return '中等';
      case 'hard': return '困難';
      default: return '中等';
    }
  };

  const getDifficultyClass = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-white rounded-lg mb-3 shadow">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-bold text-gray-800">📝 基本資訊</span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">標題</label>
            {editingField === 'title' ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => onEditingValueChange(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSave();
                  if (e.key === 'Escape') onCancel();
                }}
                className="w-full px-3 py-2 text-lg font-bold border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
                autoFocus
              />
            ) : (
              <div
                onClick={() => onStartEditing('title', draft.title?.[language] || draft.title?.en || '')}
                className="text-lg font-bold text-gray-800 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 group"
              >
                <span className="flex-1">{draft.title?.[language] || draft.title?.en || 'Untitled'}</span>
                <Edit3 className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">描述</label>
            {editingField === 'description' ? (
              <textarea
                value={editingValue}
                onChange={(e) => onEditingValueChange(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancel();
                }}
                rows={4}
                className="w-full px-3 py-2 border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
                autoFocus
              />
            ) : (
              <div
                onClick={() => onStartEditing('description', draft.description?.[language] || draft.description?.en || '')}
                className="text-gray-600 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors min-h-[60px] flex items-start gap-2 group"
              >
                <span className="flex-1">{draft.description?.[language] || draft.description?.en || 'No description'}</span>
                <Edit3 className="h-4 w-4 text-gray-400 group-hover:text-purple-600 mt-0.5" />
              </div>
            )}
          </div>

          {/* Grid: Difficulty, Time, Mode */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-gray-600 block mb-1">難度</label>
              {editingField === 'difficulty' ? (
                <select
                  value={editingValue}
                  onChange={(e) => {
                    onEditingValueChange(e.target.value);
                    onUpdateDraft({ difficulty: e.target.value });
                  }}
                  className="w-full px-2 py-1 text-xs border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600"
                  autoFocus
                >
                  <option value="easy">簡單</option>
                  <option value="medium">中等</option>
                  <option value="hard">困難</option>
                </select>
              ) : (
                <div className="flex items-center gap-1 group">
                  <span
                    onClick={() => onStartEditing('difficulty', draft.difficulty || 'medium')}
                    className={`inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getDifficultyClass(draft.difficulty)}`}
                  >
                    {getDifficultyLabel(draft.difficulty)}
                  </span>
                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-gray-600 block mb-1">時長</label>
              {editingField === 'estimatedMinutes' ? (
                <input
                  type="number"
                  value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  onBlur={onSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave();
                    if (e.key === 'Escape') onCancel();
                  }}
                  className="w-full px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-1 group">
                  <span
                    onClick={() => onStartEditing('estimatedMinutes', String(draft.estimatedMinutes || 30))}
                    className="text-sm font-medium text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                  >
                    {draft.estimatedMinutes} 分鐘
                  </span>
                  <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-gray-600 block mb-1">模式</label>
              <span className="text-sm font-medium text-purple-700">
                {draft.mode === 'pbl' ? 'PBL' : draft.mode === 'discovery' ? 'Discovery' : 'Assessment'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
