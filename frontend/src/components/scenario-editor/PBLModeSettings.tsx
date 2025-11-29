'use client';

import { Edit3, ChevronUp, ChevronDown } from 'lucide-react';

interface KSAMapping {
  knowledge?: string[];
  skills?: string[];
  attitudes?: string[];
}

interface PBLData {
  ksaMapping?: KSAMapping;
  aiMentorGuidelines?: string;
  reflectionPrompts?: string[];
  [key: string]: unknown;
}

interface PBLModeSettingsProps {
  pblData?: PBLData;
  editingField: string | null;
  editingValue: string;
  isExpanded: boolean;
  onToggle: () => void;
  onStartEditing: (field: string, value: string) => void;
  onEditingValueChange: (value: string) => void;
  onCancel: () => void;
  onUpdatePBLData: (updates: Partial<PBLData>) => void;
}

export function PBLModeSettings({
  pblData,
  editingField,
  editingValue,
  isExpanded,
  onToggle,
  onStartEditing,
  onEditingValueChange,
  onCancel,
  onUpdatePBLData
}: PBLModeSettingsProps) {
  const handleKSAUpdate = (
    field: 'knowledge' | 'skills' | 'attitudes',
    value: string
  ) => {
    const arrayValue = value.split(',').map(s => s.trim()).filter(Boolean);
    onUpdatePBLData({
      ksaMapping: {
        ...pblData?.ksaMapping,
        [field]: arrayValue
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-bold text-gray-800">🧩 PBL 專屬設定</span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4 mt-3">
          {/* KSA Mapping */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">KSA Mapping</label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {/* Knowledge */}
              <div>
                <span className="text-xs font-medium text-gray-600">Knowledge: </span>
                {editingField === 'ksa.knowledge' ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => onEditingValueChange(e.target.value)}
                    onBlur={() => handleKSAUpdate('knowledge', editingValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleKSAUpdate('knowledge', editingValue);
                      if (e.key === 'Escape') onCancel();
                    }}
                    className="px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600 w-full mt-1"
                    placeholder="例如: K1.1, K1.4, K4.2"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1 group inline-flex">
                    <span
                      onClick={() => onStartEditing('ksa.knowledge', pblData?.ksaMapping?.knowledge?.join(', ') || '')}
                      className="text-sm text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                    >
                      {pblData?.ksaMapping?.knowledge?.join(', ') || '未設定'}
                    </span>
                    <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                  </div>
                )}
              </div>

              {/* Skills */}
              <div>
                <span className="text-xs font-medium text-gray-600">Skills: </span>
                {editingField === 'ksa.skills' ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => onEditingValueChange(e.target.value)}
                    onBlur={() => handleKSAUpdate('skills', editingValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleKSAUpdate('skills', editingValue);
                      if (e.key === 'Escape') onCancel();
                    }}
                    className="px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600 w-full mt-1"
                    placeholder="例如: S1.1, S3.1, S6.1"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1 group inline-flex">
                    <span
                      onClick={() => onStartEditing('ksa.skills', pblData?.ksaMapping?.skills?.join(', ') || '')}
                      className="text-sm text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                    >
                      {pblData?.ksaMapping?.skills?.join(', ') || '未設定'}
                    </span>
                    <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                  </div>
                )}
              </div>

              {/* Attitudes */}
              <div>
                <span className="text-xs font-medium text-gray-600">Attitudes: </span>
                {editingField === 'ksa.attitudes' ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => onEditingValueChange(e.target.value)}
                    onBlur={() => handleKSAUpdate('attitudes', editingValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleKSAUpdate('attitudes', editingValue);
                      if (e.key === 'Escape') onCancel();
                    }}
                    className="px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600 w-full mt-1"
                    placeholder="例如: A2.1, A3.1, A5.1"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-1 group inline-flex">
                    <span
                      onClick={() => onStartEditing('ksa.attitudes', pblData?.ksaMapping?.attitudes?.join(', ') || '')}
                      className="text-sm text-gray-800 cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                    >
                      {pblData?.ksaMapping?.attitudes?.join(', ') || '未設定'}
                    </span>
                    <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Mentor Guidelines */}
          {pblData?.aiMentorGuidelines && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">AI Mentor Guidelines</label>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {pblData.aiMentorGuidelines}
              </p>
            </div>
          )}

          {/* Reflection Prompts */}
          {pblData?.reflectionPrompts && Array.isArray(pblData.reflectionPrompts) && pblData.reflectionPrompts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Reflection Prompts</label>
              <div className="space-y-1">
                {pblData.reflectionPrompts.map((prompt: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 rounded p-2">
                    <span className="text-xs text-gray-500 mt-0.5">{i + 1}.</span>
                    <span className="text-sm text-gray-700">{prompt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
