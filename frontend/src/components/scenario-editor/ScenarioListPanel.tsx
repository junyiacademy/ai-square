'use client';

import { Plus, Edit3, Trash2, Clock, FileText } from 'lucide-react';

interface ScenarioListItem {
  id: string;
  scenario_id: string;
  title: Record<string, string>;
  mode: string;
  difficulty: string;
  estimated_time: number;
}

interface ScenarioListPanelProps {
  selectedMode: 'pbl' | 'discovery' | 'assessment';
  language: string;
  loadingScenarios: boolean;
  allScenarios: ScenarioListItem[];
  onCreateNew: () => void;
  onEditScenario: (scenarioId: string, dbId: string) => void;
  onDeleteScenario: (dbId: string) => void;
}

export function ScenarioListPanel({
  selectedMode,
  language,
  loadingScenarios,
  allScenarios,
  onCreateNew,
  onEditScenario,
  onDeleteScenario
}: ScenarioListPanelProps) {
  const modeTitle = selectedMode === 'pbl'
    ? '🎯 PBL 專案式學習'
    : selectedMode === 'discovery'
    ? '🔍 Discovery 探索學習'
    : '📊 Assessment 評測';

  const filteredScenarios = allScenarios.filter(s => s.mode === selectedMode);

  const getDifficultyDisplay = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { label: '簡單', className: 'bg-green-100 text-green-700' };
      case 'medium': return { label: '中等', className: 'bg-yellow-100 text-yellow-700' };
      case 'hard': return { label: '困難', className: 'bg-red-100 text-red-700' };
      default: return { label: difficulty, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const getButtonStyle = () => {
    switch (selectedMode) {
      case 'pbl': return 'bg-purple-600 hover:bg-purple-700';
      case 'discovery': return 'bg-green-600 hover:bg-green-700';
      case 'assessment': return 'bg-blue-600 hover:bg-blue-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">{modeTitle}</h2>
        <button
          onClick={onCreateNew}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-bold hover:shadow-lg transition-all"
        >
          <Plus className="h-5 w-5 inline mr-2" />
          新增場景
        </button>
      </div>

      {loadingScenarios ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      ) : (
        <>
          {filteredScenarios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredScenarios.map(scenario => {
                const difficultyInfo = getDifficultyDisplay(scenario.difficulty);
                return (
                  <div
                    key={scenario.id}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-300"
                  >
                    <h4 className="font-bold text-xl text-gray-800 mb-2">
                      {scenario.title[language] || scenario.title.en}
                    </h4>
                    <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full ${difficultyInfo.className}`}>
                        {difficultyInfo.label}
                      </span>
                      <span>•</span>
                      <Clock className="h-4 w-4 inline" />
                      <span>{scenario.estimated_time} 分鐘</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditScenario(scenario.scenario_id, scenario.id)}
                        className={`flex-1 px-4 py-2 rounded-lg hover:shadow-lg transition-colors font-medium ${getButtonStyle()} text-white`}
                      >
                        <Edit3 className="h-4 w-4 inline mr-2" />
                        編輯
                      </button>
                      <button
                        onClick={() => onDeleteScenario(scenario.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">尚無場景</h3>
              <p className="text-gray-500 mb-6">開始創建您的第一個場景</p>
              <button
                onClick={onCreateNew}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
              >
                <Plus className="h-5 w-5 inline mr-2" />
                新增場景
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
