'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  Sparkles
} from 'lucide-react';

interface LeftPanelProps {
  leftPanelCollapsed: boolean;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  selectedMode: 'pbl' | 'discovery' | 'assessment' | null;
  setSelectedMode: (mode: 'pbl' | 'discovery' | 'assessment' | null) => void;
  selectedScenario: string | null;
  setSelectedScenario: (id: string | null) => void;
  loadScenarios: () => void;
  setExpandedSections: (sections: Record<string, boolean>) => void;
  setExpandedTasks: (tasks: Record<string, boolean>) => void;
  hasChanges: boolean;
  getChangeSummary: () => string[];
}

export function LeftPanel({
  leftPanelCollapsed,
  setLeftPanelCollapsed,
  selectedMode,
  setSelectedMode,
  selectedScenario,
  setSelectedScenario,
  loadScenarios,
  setExpandedSections,
  setExpandedTasks,
  hasChanges,
  getChangeSummary
}: LeftPanelProps) {
  return (
    <div className={`${leftPanelCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col overflow-hidden`}>
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <button
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {leftPanelCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {!leftPanelCollapsed && (
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Mode Selection - Always visible, highlight selected */}
          <div className="text-xs font-semibold text-gray-500 mb-3 px-3">學習模式</div>
          <button
            onClick={() => { setSelectedMode('pbl'); loadScenarios(); setSelectedScenario(null); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
              selectedMode === 'pbl'
                ? 'bg-gradient-to-r from-purple-100 to-purple-200 border-2 border-purple-400 shadow-md'
                : 'bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200'
            }`}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-purple-900">PBL</div>
                <div className="text-xs text-purple-600">專案式學習</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => { setSelectedMode('discovery'); loadScenarios(); setSelectedScenario(null); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
              selectedMode === 'discovery'
                ? 'bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-400 shadow-md'
                : 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-200'
            }`}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-green-900">DISCOVERY</div>
                <div className="text-xs text-green-600">探索學習</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => { setSelectedMode('assessment'); loadScenarios(); setSelectedScenario(null); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
              selectedMode === 'assessment'
                ? 'bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-400 shadow-md'
                : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200'
            }`}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-blue-900">ASSESSMENT</div>
                <div className="text-xs text-blue-600">評測</div>
              </div>
            </div>
          </button>

          {/* Level 3: Scenario selected - Show back button only */}
          {selectedScenario && (
            <>
              <div className="my-3 border-t border-gray-200"></div>
              <button
                onClick={() => {
                  setSelectedScenario(null);
                  setExpandedSections({
                    'scenario-basic': true,
                    'scenario-objectives': true,
                    'scenario-mode-specific': true,
                    'scenario-advanced': false
                  });
                  setExpandedTasks({});
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                返回場景列表
              </button>
            </>
          )}
        </nav>
      )}

      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {hasChanges ? (
          <div className="text-sm text-yellow-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {!leftPanelCollapsed && <span>{getChangeSummary().length} 個變更</span>}
          </div>
        ) : (
          <div className="text-sm text-green-600 flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {!leftPanelCollapsed && <span>已保存</span>}
          </div>
        )}
      </div>
    </div>
  );
}
