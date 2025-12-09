'use client';

import { CheckCircle2, Edit3, ChevronUp, ChevronDown } from 'lucide-react';

interface ScenarioObjectivesProps {
  objectives: string[] | Record<string, string[]> | undefined;
  language: string;
  editingField: string | null;
  editingValue: string;
  isExpanded: boolean;
  onToggle: () => void;
  onStartEditing: (field: string, value: string) => void;
  onEditingValueChange: (value: string) => void;
  onCancel: () => void;
  onUpdateObjective: (index: number, value: string, isMultilingual: boolean) => void;
}

export function ScenarioObjectives({
  objectives,
  language,
  editingField,
  editingValue,
  isExpanded,
  onToggle,
  onStartEditing,
  onEditingValueChange,
  onCancel,
  onUpdateObjective
}: ScenarioObjectivesProps) {
  // Handle both array and multilingual object formats
  let objectivesList: string[] = [];
  let isMultilingual = false;

  if (Array.isArray(objectives)) {
    objectivesList = objectives;
  } else if (objectives && typeof objectives === 'object') {
    isMultilingual = true;
    objectivesList = objectives[language] ||
                    objectives.zhTW ||
                    objectives.zh ||
                    objectives.en ||
                    [];
  }

  const handleSaveObjective = (index: number) => {
    onUpdateObjective(index, editingValue, isMultilingual);
  };

  return (
    <div className="bg-white rounded-lg mb-3 shadow">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-bold text-gray-800">🎯 學習目標</span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="space-y-2 mt-3">
            {objectivesList.map((obj: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                {editingField === `objective.${i}` ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => onEditingValueChange(e.target.value)}
                    onBlur={() => handleSaveObjective(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveObjective(i);
                      if (e.key === 'Escape') onCancel();
                    }}
                    className="flex-1 px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none focus:border-purple-600"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => onStartEditing(`objective.${i}`, obj)}
                    className="text-sm cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors flex-1 flex items-start gap-2 group"
                  >
                    <span className="flex-1">{obj}</span>
                    <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600 flex-shrink-0 mt-0.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
